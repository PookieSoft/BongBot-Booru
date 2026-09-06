import { beforeEach, expect, it, vi } from 'vitest';
import { Collection } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { buildError } from '@pookiesoft/bongbot-core';
import { Booru, Gelbooru, ImageCommand, buildCommands } from '../../src/index.js';

vi.mock('@pookiesoft/bongbot-core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@pookiesoft/bongbot-core')>();
    return { ...actual, buildError: vi.fn().mockResolvedValue({ content: 'Error', isError: true }) };
});

const bot = { commands: new Collection(), user: null, version: 'test' } as unknown as ExtendedClient;
const interaction = { options: { getSubcommand: vi.fn(() => 'search'), getString: vi.fn(() => 'solo') } } as unknown as ChatInputCommandInteraction;
const post = { id: 1, imageUrl: 'https://img3.gelbooru.com/a.png', postUrl: 'https://gelbooru.com/index.php?id=1' };

beforeEach(() => {
    vi.clearAllMocks();
    bot.commands.clear();
});

it('exports the provider for composite bots', () => expect(Gelbooru).toBeDefined());

it('registers all commands and metadata through Core', () => {
    const provider = { search: vi.fn() };
    const payload = buildCommands(bot, provider);
    expect(payload.map((command) => command.name)).toEqual(['clown', 'fox', 'booru']);
    for (const command of bot.commands.values()) expect(command.fullDesc.description).toBeTruthy();
    expect(payload[2].options[0].options[0]).toMatchObject({ name: 'tags', required: true, max_length: 500 });
});

it('builds a default provider when none is injected', () => {
    expect(buildCommands(bot)).toHaveLength(3);
});

it.each([['clown', 'omaru_polka'], ['fox', 'shirakami_fubuki']])('routes /%s to its character tag', async (name, tags) => {
    const provider = { search: vi.fn().mockResolvedValue(post) };
    buildCommands(bot, provider);
    const result = await bot.commands.get(name).execute(interaction, bot);
    expect(provider.search).toHaveBeenCalledWith(tags);
    expect(result.embeds[0].toJSON()).toMatchObject({ title: 'View on Gelbooru', url: post.postUrl, image: { url: post.imageUrl } });
});

it('routes custom search through the master and subcommand', async () => {
    const provider = { search: vi.fn().mockResolvedValue(post) };
    await new Booru(provider).execute(interaction, bot);
    expect(interaction.options.getString).toHaveBeenCalledWith('tags', true);
    expect(provider.search).toHaveBeenCalledWith('solo');
});

it('rejects unknown subcommands', async () => {
    vi.mocked(interaction.options.getSubcommand).mockReturnValueOnce('unknown');
    await expect(new Booru({ search: vi.fn() }).execute(interaction, bot)).rejects.toThrow('Unknown');
});

it('returns a useful empty-result message', async () => {
    const command = new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', { search: vi.fn().mockResolvedValue(null) });
    expect(await command.execute(interaction, bot)).toEqual({ content: 'No images found for those tags.', allowedMentions: { parse: [] } });
});

it('uses the shared error builder', async () => {
    const error = new Error('Gelbooru unavailable');
    const command = new Booru({ search: vi.fn().mockRejectedValue(error) });
    expect(await command.execute(interaction, bot)).toEqual({ content: 'Error', isError: true });
    expect(buildError).toHaveBeenCalledWith(interaction, error);
});

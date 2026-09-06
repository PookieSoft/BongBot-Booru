import { beforeEach, expect, it, vi } from 'vitest';
import { Collection } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { buildError } from '@pookiesoft/bongbot-core';
import { Booru, ImageCommand, buildCommands } from '../../src/index.js';

vi.mock('@pookiesoft/bongbot-core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@pookiesoft/bongbot-core')>();
    return { ...actual, buildError: vi.fn().mockResolvedValue({ content: 'Error', isError: true }) };
});

const bot = { commands: new Collection(), user: null, version: 'test' } as unknown as ExtendedClient;
const interaction = { options: { getSubcommand: vi.fn(() => 'search'), getString: vi.fn(() => 'solo') } } as unknown as ChatInputCommandInteraction;
const post = { id: 1, imageUrl: 'https://img3.gelbooru.com/a.png', postUrl: 'https://gelbooru.com/index.php?id=1' };
const site = { name: 'Gelbooru', referer: 'https://gelbooru.com/' };

type EmbedResult = { embeds: [{ toJSON: () => Record<string, unknown> }]; files: unknown[] };

function download(image: unknown = { data: Buffer.from([1, 2, 3]), filename: 'gelbooru-image.png' }) {
    return { download: vi.fn().mockResolvedValue(image) };
}

function provider(result: unknown = post, providerSite = site) {
    return { site: providerSite, search: vi.fn().mockResolvedValue(result) };
}

beforeEach(() => {
    vi.clearAllMocks();
    bot.commands.clear();
});

it('exports the provider factory for composite bots', async () => {
    const { createProvider } = await import('../../src/index.js');
    expect(createProvider({ get: vi.fn() }, {})).toBeDefined();
});

it('registers all commands and metadata through Core', () => {
    const payload = buildCommands(bot, provider(), download());
    expect(payload.map((command) => command.name)).toEqual(['clown', 'fox', 'booru']);
    for (const command of bot.commands.values()) expect(command.fullDesc.description).toBeTruthy();
    expect(payload[2].options[0].options[0]).toMatchObject({ name: 'tags', required: true, max_length: 500 });
});

it.each([['clown', 'omaru_polka'], ['fox', 'shirakami_fubuki']])('routes /%s to its character tag', async (name, tags) => {
    const source = provider();
    buildCommands(bot, source, download());
    const result = await bot.commands.get(name).execute(interaction, bot);
    expect(source.search).toHaveBeenCalledWith(tags);
    expect(result.embeds[0].toJSON()).toMatchObject({ title: 'View on Gelbooru', url: post.postUrl, image: { url: 'attachment://gelbooru-image.png' } });
    expect(result.files).toHaveLength(1);
});

it('routes custom search through the master and subcommand', async () => {
    const source = provider();
    const downloader = download();
    await new Booru(source, downloader).execute(interaction, bot);
    expect(interaction.options.getString).toHaveBeenCalledWith('tags', true);
    expect(source.search).toHaveBeenCalledWith('solo');
    expect(downloader.download).toHaveBeenCalledWith(post.imageUrl, site);
});

it('rejects unknown subcommands', async () => {
    vi.mocked(interaction.options.getSubcommand).mockReturnValueOnce('unknown');
    await expect(new Booru(provider(), download()).execute(interaction, bot)).rejects.toThrow('Unknown');
});

it('downloads from the provider site and titles the embed with its name', async () => {
    const mirror = { name: 'Safebooru Mirror', referer: 'https://safebooru.org/' };
    const downloader = download({ data: Buffer.from([1]), filename: 'safebooru-mirror-image.png' });
    const result = await new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(post, mirror), downloader).execute(interaction, bot) as unknown as EmbedResult;
    expect(downloader.download).toHaveBeenCalledWith(post.imageUrl, mirror);
    expect(result.embeds[0].toJSON()).toMatchObject({ title: 'View on Safebooru Mirror', image: { url: 'attachment://safebooru-mirror-image.png' } });
});

it('returns a useful empty-result message', async () => {
    const command = new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(null), download());
    expect(await command.execute(interaction, bot)).toEqual({ content: 'No images found for those tags.', allowedMentions: { parse: [] } });
});

it('reports a failed download through the shared error builder', async () => {
    const error = new Error('Gelbooru could not deliver the image. Please try again later.');
    const downloader = { download: vi.fn().mockRejectedValue(error) };
    const command = new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(), downloader);
    expect(await command.execute(interaction, bot)).toEqual({ content: 'Error', isError: true });
    expect(buildError).toHaveBeenCalledWith(interaction, error);
});

it('uses the shared error builder', async () => {
    const error = new Error('Gelbooru unavailable');
    const command = new Booru({ site, search: vi.fn().mockRejectedValue(error) }, download());
    expect(await command.execute(interaction, bot)).toEqual({ content: 'Error', isError: true });
    expect(buildError).toHaveBeenCalledWith(interaction, error);
});

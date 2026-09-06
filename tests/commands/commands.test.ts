import { beforeEach, expect, it, vi } from 'vitest';
import { Collection } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { Caller, buildError } from '@pookiesoft/bongbot-core';
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

function download(result: unknown = { data: Buffer.from([1, 2, 3]), contentType: 'image/png' }) {
    return { get: vi.fn().mockResolvedValue(result) };
}

function provider(result: unknown = post, providerSite = site) {
    return { site: providerSite, search: vi.fn().mockResolvedValue(result) };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Caller.prototype, 'get').mockResolvedValue({ data: Buffer.from([1, 2, 3]), contentType: 'image/png' });
    bot.commands.clear();
});

it('exports the provider factory for composite bots', async () => {
    const { createProvider } = await import('../../src/index.js');
    expect(createProvider({})).toBeDefined();
});

it('registers all commands and metadata through Core', () => {
    const payload = buildCommands(bot, provider());
    expect(payload.map((command) => command.name)).toEqual(['clown', 'fox', 'booru']);
    for (const command of bot.commands.values()) expect(command.fullDesc.description).toBeTruthy();
    expect(payload[2].options[0].options[0]).toMatchObject({ name: 'tags', required: true, max_length: 500 });
});

it('builds a default provider when none is injected', () => {
    expect(buildCommands(bot)).toHaveLength(3);
});

it.each([['clown', 'omaru_polka'], ['fox', 'shirakami_fubuki']])('routes /%s to its character tag', async (name, tags) => {
    const source = provider();
    buildCommands(bot, source);
    const result = await bot.commands.get(name).execute(interaction, bot);
    expect(source.search).toHaveBeenCalledWith(tags);
    expect(result.embeds[0].toJSON()).toMatchObject({ title: 'View on Gelbooru', url: post.postUrl, image: { url: 'attachment://gelbooru-image.png' } });
    expect(result.files).toHaveLength(1);
});

it('routes custom search through the master and subcommand', async () => {
    const source = provider();
    await new Booru(source, download()).execute(interaction, bot);
    expect(interaction.options.getString).toHaveBeenCalledWith('tags', true);
    expect(source.search).toHaveBeenCalledWith('solo');
});

it('rejects unknown subcommands', async () => {
    vi.mocked(interaction.options.getSubcommand).mockReturnValueOnce('unknown');
    await expect(new Booru(provider()).execute(interaction, bot)).rejects.toThrow('Unknown');
});

it('requests the image through Core with the headers the host requires', async () => {
    const caller = download();
    await new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(), caller).execute(interaction, bot);
    expect(caller.get).toHaveBeenCalledWith(
        post.imageUrl,
        null,
        null,
        {
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            Referer: 'https://gelbooru.com/',
            'User-Agent': 'BongBot-Booru/0.1',
        },
        'binary'
    );
});

it('takes the referer, embed title and filename from the provider', async () => {
    const mirror = { name: 'Safebooru Mirror', referer: 'https://safebooru.org/' };
    const caller = download();
    const result = await new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(post, mirror), caller).execute(interaction, bot) as unknown as EmbedResult;
    expect(caller.get.mock.calls[0][3]).toMatchObject({ Referer: 'https://safebooru.org/' });
    expect(result.embeds[0].toJSON()).toMatchObject({ title: 'View on Safebooru Mirror', image: { url: 'attachment://safebooru-mirror-image.png' } });
});

it('accepts a content type that includes a charset', async () => {
    const caller = download({ data: Buffer.from([1]), contentType: 'image/jpeg; charset=binary' });
    const result = await new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(), caller).execute(interaction, bot) as unknown as EmbedResult;
    expect(result.embeds[0].toJSON()).toMatchObject({ title: 'View on Gelbooru' });
});

it('returns a useful empty-result message', async () => {
    const command = new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(null));
    expect(await command.execute(interaction, bot)).toEqual({ content: 'No images found for those tags.', allowedMentions: { parse: [] } });
});

it('does not leak the image URL when Core reports a failure', async () => {
    const caller = { get: vi.fn().mockRejectedValue(new Error('Network response was not ok: 502 Bad Gateway https://img3.gelbooru.com/a.png')) };
    const command = new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(), caller);
    expect(await command.execute(interaction, bot)).toEqual({ content: 'Error', isError: true });
    expect(buildError).toHaveBeenCalledWith(interaction, new Error('Gelbooru could not deliver the image. Please try again later.'));
});

it('reports an empty download through the shared error builder', async () => {
    const command = new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(), download(null));
    expect(await command.execute(interaction, bot)).toEqual({ content: 'Error', isError: true });
    expect(buildError).toHaveBeenCalledWith(interaction, new Error('Image server returned an empty response.'));
});

it.each([
    { data: Buffer.from([1]), contentType: 'text/html' },
    { data: Buffer.from([1]), contentType: null },
])('reports a non-image download through the shared error builder', async (result) => {
    const command = new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', provider(), download(result));
    expect(await command.execute(interaction, bot)).toEqual({ content: 'Error', isError: true });
    expect(buildError).toHaveBeenCalledWith(interaction, new Error('Image server returned a non-image response.'));
});

it('uses a safe default attachment extension when the provider omits one', async () => {
    const source = provider({ ...post, imageUrl: 'https://img3.gelbooru.com/image' });
    const result = await new ImageCommand('fox', 'Fox image', 'shirakami_fubuki', source, download()).execute(interaction, bot) as unknown as EmbedResult;
    expect(result.embeds[0].toJSON().image).toEqual({ url: 'attachment://gelbooru-image.jpg' });
});

it('uses the shared error builder', async () => {
    const error = new Error('Gelbooru unavailable');
    const command = new Booru({ site, search: vi.fn().mockRejectedValue(error) });
    expect(await command.execute(interaction, bot)).toEqual({ content: 'Error', isError: true });
    expect(buildError).toHaveBeenCalledWith(interaction, error);
});

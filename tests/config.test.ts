import { afterEach, expect, it, vi } from 'vitest';
import { createProvider } from '../src/config.js';
import { Gelbooru } from '../src/providers/gelbooru.js';
import { Safebooru } from '../src/providers/safebooru.js';

function caller() {
    return { get: vi.fn().mockResolvedValue([]) };
}

afterEach(() => {
    vi.unstubAllEnvs();
});

it('defaults to Safebooru', () => {
    expect(createProvider(caller(), {})).toBeInstanceOf(Safebooru);
});

it.each(['true', 'false'])('selects Safebooru explicitly over GELBOORU_SFW=%s', (sfw) => {
    expect(createProvider(caller(), { IMAGE_PROVIDER: 'safebooru', GELBOORU_SFW: sfw })).toBeInstanceOf(Safebooru);
});

it.each(['true', 'false'])('selects Gelbooru explicitly over GELBOORU_SFW=%s', (sfw) => {
    expect(createProvider(caller(), { IMAGE_PROVIDER: 'gelbooru', GELBOORU_SFW: sfw })).toBeInstanceOf(Gelbooru);
});

it.each(['', 'unknown', 'SAFEBOORU', ' gelbooru '])('rejects an unknown provider: %s', (provider) => {
    expect(() => createProvider(caller(), { IMAGE_PROVIDER: provider, GELBOORU_SFW: 'false' })).toThrow(
        'IMAGE_PROVIDER must be safebooru or gelbooru.'
    );
});

it.each(['false', ' FALSE '])('selects Gelbooru for legacy GELBOORU_SFW=%s', (setting) => {
    expect(createProvider(caller(), { GELBOORU_SFW: setting })).toBeInstanceOf(Gelbooru);
});

it.each([undefined, '', 'true', ' TRUE ', 'no', 'flase'])('selects Safebooru for legacy GELBOORU_SFW=%s', (setting) => {
    expect(createProvider(caller(), { GELBOORU_SFW: setting })).toBeInstanceOf(Safebooru);
});

it('reads the environment by default', () => {
    vi.stubEnv('IMAGE_PROVIDER', 'safebooru');
    expect(createProvider(caller())).toBeInstanceOf(Safebooru);
});

it('passes credential failures up from Gelbooru', () => {
    expect(() => createProvider(caller(), { IMAGE_PROVIDER: 'gelbooru', GELBOORU_API_KEY: 'key' })).toThrow('together');
});

it('ignores incomplete Gelbooru credentials for Safebooru', () => {
    expect(createProvider(caller(), { GELBOORU_API_KEY: 'key' })).toBeInstanceOf(Safebooru);
});

it.each(['safebooru', 'gelbooru'])('passes the AI policy to %s', async (provider) => {
    const client = { get: vi.fn().mockResolvedValue(provider === 'safebooru' ? [] : { post: [] }) };
    await createProvider(client, { IMAGE_PROVIDER: provider, ALLOW_AI_IMAGES: ' TRUE ', GELBOORU_SFW: 'false' }).search(
        'solo'
    );
    expect(new URLSearchParams(client.get.mock.calls[0][2]).get('tags')).toBe('solo');
});

it.each([undefined, '', 'yes', 'ture', 'false'])('keeps the AI filter on for ALLOW_AI_IMAGES=%s', async (setting) => {
    const client = caller();
    await createProvider(client, { ALLOW_AI_IMAGES: setting }).search('solo');
    expect(new URLSearchParams(client.get.mock.calls[0][2]).get('tags')).toBe('solo -ai-generated');
});

it.each(['true', 'false'])('keeps GELBOORU_SFW=%s effective with an explicit Gelbooru provider', async (setting) => {
    const get = vi.fn().mockResolvedValue({
        post: [{ id: 42, rating: 'explicit', file_url: 'https://gelbooru.com/a.png' }],
    });
    const api = createProvider({ get }, { IMAGE_PROVIDER: 'gelbooru', GELBOORU_SFW: setting });
    const result = await api.search('solo');
    expect(new URLSearchParams(get.mock.calls[0][2]).get('tags')).toBe(
        setting === 'true' ? 'solo -ai-generated rating:general' : 'solo -ai-generated'
    );
    expect(result?.id ?? null).toBe(setting === 'true' ? null : 42);
});

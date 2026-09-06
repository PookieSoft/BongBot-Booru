import { afterEach, expect, it, vi } from 'vitest';
import { createProvider } from '../src/config.js';
import { Caller } from '@pookiesoft/bongbot-core';
import { Gelbooru } from '../src/providers/gelbooru.js';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

it('creates a provider without credentials', () => {
    expect(createProvider({})).toBeInstanceOf(Gelbooru);
});

it('reads the environment by default', () => {
    vi.stubEnv('GELBOORU_API_KEY', 'key');
    vi.stubEnv('GELBOORU_USER_ID', '42');
    expect(createProvider()).toBeInstanceOf(Gelbooru);
});

it('trims paired credentials', () => {
    expect(createProvider({ GELBOORU_API_KEY: ' key ', GELBOORU_USER_ID: ' 42 ' })).toBeInstanceOf(Gelbooru);
});

it.each([{ GELBOORU_API_KEY: 'key' }, { GELBOORU_USER_ID: '42' }])('requires paired credentials', (env) => {
    expect(() => createProvider(env)).toThrow('together');
});

it.each(['abc', '0', '-1', '1.5'])('rejects invalid user IDs', (id) => {
    expect(() => createProvider({ GELBOORU_API_KEY: 'key', GELBOORU_USER_ID: id })).toThrow('positive integer');
});


it.each([undefined, '', 'true', ' TRUE ', 'false', ' FALSE '])('applies GELBOORU_SFW=%s to requests and returned ratings', async (setting) => {
    const get = vi.spyOn(Caller.prototype, 'get').mockResolvedValue({ post: [
        { id: 1, rating: 'explicit', file_url: 'https://img3.gelbooru.com/image.png' },
    ] });
    const provider = createProvider({ GELBOORU_SFW: setting });
    const result = await provider.search('solo');
    const disabled = setting?.trim().toLowerCase() === 'false';
    expect(new URLSearchParams(get.mock.calls[0][2]!).get('tags')).toBe(disabled ? 'solo' : 'solo rating:general');
    expect(result?.id ?? null).toBe(disabled ? 1 : null);
});

it.each(['0', '1', 'yes', 'no', 'flase'])('rejects invalid SFW setting %s', (setting) => {
    expect(() => createProvider({ GELBOORU_SFW: setting })).toThrow('GELBOORU_SFW must be true or false');
});

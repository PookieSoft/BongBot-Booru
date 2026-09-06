import { afterEach, expect, it, vi } from 'vitest';
import { createProvider } from '../src/config.js';
import { Gelbooru } from '../src/providers/gelbooru.js';

function caller(response: unknown = { post: [] }) {
    return { get: vi.fn().mockResolvedValue(response) };
}

afterEach(() => {
    vi.unstubAllEnvs();
});

it('builds a Gelbooru provider', () => {
    expect(createProvider(caller(), {})).toBeInstanceOf(Gelbooru);
});

it('reads the environment by default', () => {
    vi.stubEnv('GELBOORU_API_KEY', 'key');
    vi.stubEnv('GELBOORU_USER_ID', '42');
    expect(createProvider(caller())).toBeInstanceOf(Gelbooru);
});

it('passes credential failures up from the board', () => {
    expect(() => createProvider(caller(), { GELBOORU_API_KEY: 'key' })).toThrow('together');
});

it('allows AI images when enabled', async () => {
    const client = caller();
    await createProvider(client, { ALLOW_AI_IMAGES: 'true' }).search('solo');
    expect(new URLSearchParams(client.get.mock.calls[0][2]!).get('tags')).toBe('solo rating:general');
});

it.each([undefined, '', 'yes', 'ture', 'false'])('keeps the AI filter on for ALLOW_AI_IMAGES=%s', async (setting) => {
    const client = caller();
    await createProvider(client, { ALLOW_AI_IMAGES: setting }).search('solo');
    expect(new URLSearchParams(client.get.mock.calls[0][2]!).get('tags')).toContain('-ai-generated');
});

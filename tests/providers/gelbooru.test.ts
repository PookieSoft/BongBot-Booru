import { describe, expect, it, vi } from 'vitest';
import { Gelbooru, createGelbooru } from '../../src/providers/gelbooru.js';
import type { GelbooruOptions } from '../../src/providers/gelbooru.js';

const post = { id: 42, rating: 'general', file_url: 'https://img3.gelbooru.com/images/example.png' };
const sampleUrl = 'https://img3.gelbooru.com/samples/example.jpg';

function provider(response: unknown, credentials: GelbooruOptions = { allowAiImages: true }, random = () => 0) {
    const get = vi.fn().mockResolvedValue(response);
    return { api: new Gelbooru({ get }, credentials, random), get };
}

describe('Gelbooru', () => {
    it('exposes the site name and referer', () => {
        expect(provider({ post: [] }).api.site).toEqual({ name: 'Gelbooru', referer: 'https://gelbooru.com/' });
    });

    it('excludes AI-tagged posts by default', async () => {
        const { api, get } = provider({ post: [] }, { allowAiImages: false });
        await api.search('solo');
        expect(new URLSearchParams(get.mock.calls[0][2]).get('tags')).toBe('solo -ai-generated rating:general');
    });
    it('encodes the query and paired credentials', async () => {
        const get = vi.fn().mockResolvedValue({ post: [post] });
        const caller = { get };
        const api = new Gelbooru(caller, { apiKey: 'a&b', userId: '12', allowAiImages: true });
        await expect(api.search('  shirakami_fubuki   solo  ')).resolves.toEqual({
            id: 42,
            imageUrl: post.file_url,
            postUrl: 'https://gelbooru.com/index.php?page=post&s=view&id=42',
        });
        expect(get).toHaveBeenCalledOnce();
        expect(get.mock.calls[0].slice(0, 2)).toEqual(['https://gelbooru.com', '/index.php']);
        const params = new URLSearchParams(get.mock.calls[0][2]!);
        expect(Object.fromEntries(params)).toEqual({
            page: 'dapi',
            s: 'post',
            q: 'index',
            json: '1',
            limit: '100',
            tags: 'shirakami_fubuki solo rating:general',
            api_key: 'a&b',
            user_id: '12',
        });
    });

    it('prefers a valid sample image URL', async () => {
        const image = { ...post, sample_url: sampleUrl };
        expect((await provider({ post: [image] }).api.search('solo'))?.imageUrl).toBe(sampleUrl);
    });

    it('falls back to the full image URL when the sample URL is invalid', async () => {
        const image = { ...post, sample_url: 'https://gelbooru.com/sample' };
        expect((await provider({ post: [image] }).api.search('solo'))?.imageUrl).toBe(post.file_url);
    });

    it('selects randomly from eligible results', async () => {
        const { api, get } = provider({ post: [post, { ...post, id: 43 }] }, {}, () => 0.999);
        expect((await api.search('omaru_polka -comic'))?.id).toBe(43);
        expect(new URLSearchParams(get.mock.calls[0][2]).has('api_key')).toBe(false);
    });

    it('does not send incomplete credentials', async () => {
        const { api, get } = provider({ post: [] }, { apiKey: 'secret' });
        await api.search('solo');
        expect(new URLSearchParams(get.mock.calls[0][2]).has('api_key')).toBe(false);
    });

    it.each(['', '   ', 'a'.repeat(501)])('rejects invalid tag length', async (tags) => {
        const { api, get } = provider({ post: [] });
        await expect(api.search(tags)).rejects.toThrow('between 1 and 500');
        expect(get).not.toHaveBeenCalled();
    });

    it.each(['rating:explicit', '-rating:general', 'solo ~nude', 'solo&limit=1', '{solo}', 'solo\nRaTiNg:sensitive'])(
        'rejects operators: %s',
        async (tags) => {
            const { api, get } = provider({ post: [] });
            await expect(api.search(tags)).rejects.toThrow('search operators');
            expect(get).not.toHaveBeenCalled();
        }
    );

    it.each([{ post: [] }, { '@attributes': { count: 0 } }, { '@attributes': { count: '0' } }])(
        'handles no matches',
        async (response) => {
            await expect(provider(response).api.search('solo')).resolves.toBeNull();
        }
    );

    it.each([null, [], 'error', {}, { post: null }, { post: {} }, { '@attributes': { count: 1 } }])(
        'rejects malformed responses',
        async (response) => {
            await expect(provider(response).api.search('solo')).rejects.toThrow('invalid response');
        }
    );

    it.each([
        null,
        [],
        {},
        { ...post, rating: undefined },
        { ...post, id: 0 },
        { ...post, id: 1.5 },
        { ...post, id: '42' },
        { ...post, rating: 'safe' },
        { ...post, rating: 'sensitive' },
        { ...post, rating: 'questionable' },
        { ...post, rating: 'explicit' },
        { ...post, file_url: 12 },
        { ...post, file_url: 'broken' },
        { ...post, file_url: 'http://img3.gelbooru.com/image.png' },
        { ...post, file_url: 'https://gelbooru.com.attacker.test/image.png' },
        { ...post, file_url: 'https://user:pass@gelbooru.com/image.png' },
        { ...post, file_url: 'https://gelbooru.com:8443/image.png' },
        { ...post, file_url: 'https://gelbooru.com/image.webm' },
    ])('drops ineligible posts', async (invalid) => {
        await expect(provider({ post: [invalid] }).api.search('solo')).resolves.toBeNull();
    });

    it('accepts image URLs on the root host', async () => {
        const image = { ...post, file_url: 'https://gelbooru.com/image.JPG' };
        expect((await provider({ post: [image] }).api.search('solo'))?.imageUrl).toBe(image.file_url);
    });

    it('keeps the upstream failure out of the message and on the stack', async () => {
        const get = vi.fn().mockRejectedValue(new Error('Network response was not ok: 403 secret-api-key'));
        const failure = (await new Gelbooru({ get }).search('solo').catch((error: Error) => error)) as Error;
        expect(failure.message).toBe('Gelbooru is unavailable. Please try again later.');
        expect(failure.stack).toContain('Caused by: Error: Network response was not ok: 403 secret-api-key');
    });
});

describe('suggest', () => {
    const entry = { label: 'furina (13542)', value: 'furina_(genshin_impact)', post_count: '13542' };

    it('asks Gelbooru for tags and derives the display label from the value', async () => {
        const get = vi.fn().mockResolvedValue([entry]);
        await expect(new Gelbooru({ get }).suggest('furina')).resolves.toEqual([
            { tag: entry.value, label: 'furina (genshin impact)', postCount: 13542 },
        ]);
        expect(get.mock.calls[0].slice(0, 2)).toEqual(['https://gelbooru.com', '/index.php']);
        expect(Object.fromEntries(new URLSearchParams(get.mock.calls[0][2]))).toEqual({
            page: 'autocomplete2',
            term: 'furina',
            type: 'tag_query',
            limit: '25',
        });
    });

    it('reads numeric counts', async () => {
        const get = vi.fn().mockResolvedValue([{ ...entry, post_count: 0 }]);
        expect((await new Gelbooru({ get }).suggest('furina'))[0].postCount).toBe(0);
    });

    it.each([
        { ...entry, value: 42 },
        { ...entry, label: null },
        { ...entry, post_count: 'lots' },
        { ...entry, post_count: -1 },
        { label: 'furina (13542)', value: 'furina' },
        'not a suggestion',
    ])('drops malformed suggestions: %s', async (invalid) => {
        const get = vi.fn().mockResolvedValue([invalid]);
        await expect(new Gelbooru({ get }).suggest('furina')).resolves.toEqual([]);
    });

    it('returns no suggestions for a non-array response', async () => {
        const get = vi.fn().mockResolvedValue({ error: 'nope' });
        await expect(new Gelbooru({ get }).suggest('furina')).resolves.toEqual([]);
    });

    it('wraps autocomplete failures', async () => {
        const get = vi.fn().mockRejectedValue(new Error('403'));
        await expect(new Gelbooru({ get }).suggest('furina')).rejects.toThrow('Gelbooru is unavailable.');
    });
});

it.each(['general', 'sensitive', 'questionable', 'explicit'])(
    'accepts the %s rating when SFW filtering is disabled',
    async (rating) => {
        const { api, get } = provider({ post: [{ ...post, rating }] }, { sfw: false });
        expect((await api.search('solo'))?.id).toBe(42);
        expect(new URLSearchParams(get.mock.calls[0][2]).get('tags')).toBe('solo -ai-generated');
    }
);

it.each([
    { ...post, rating: 'unknown' },
    { ...post, file_url: 'https://attacker.test/image.png' },
    { ...post, file_url: 'https://gelbooru.com/image.webm' },
])('rejects invalid posts', async (invalid) => {
    await expect(provider({ post: [invalid] }, { sfw: false }).api.search('solo')).resolves.toBeNull();
});

describe('createGelbooru', () => {
    function build(env: NodeJS.ProcessEnv, allowAiImages = true, response: unknown = { post: [] }) {
        const get = vi.fn().mockResolvedValue(response);
        return { api: createGelbooru({ get }, env, allowAiImages), get };
    }

    it('builds a provider without credentials', () => {
        expect(build({}).api).toBeInstanceOf(Gelbooru);
    });

    it('trims and sends paired credentials', async () => {
        const { api, get } = build({ GELBOORU_API_KEY: ' key ', GELBOORU_USER_ID: ' 42 ' });
        await api.search('solo');
        const params = new URLSearchParams(get.mock.calls[0][2]);
        expect([params.get('api_key'), params.get('user_id')]).toEqual(['key', '42']);
    });

    it.each([{ GELBOORU_API_KEY: 'key' }, { GELBOORU_USER_ID: '42' }])('requires paired credentials', (env) => {
        expect(() => build(env)).toThrow('together');
    });

    it.each(['abc', '0', '-1', '1.5'])('rejects the invalid user ID %s', (id) => {
        expect(() => build({ GELBOORU_API_KEY: 'key', GELBOORU_USER_ID: id })).toThrow('positive integer');
    });

    it('passes the AI policy down from its caller', async () => {
        const { api, get } = build({}, false);
        await api.search('solo');
        expect(new URLSearchParams(get.mock.calls[0][2]).get('tags')).toContain('-ai-generated');
    });
});

it.each([undefined, '', 'true', ' TRUE ', 'no', 'flase', 'false', ' FALSE '])(
    'applies GELBOORU_SFW=%s to the query and returned ratings',
    async (setting) => {
        const get = vi.fn().mockResolvedValue({ post: [{ ...post, rating: 'explicit' }] });
        const api = createGelbooru({ get }, { GELBOORU_SFW: setting }, true);
        const result = await api.search('solo');
        const disabled = setting?.trim().toLowerCase() === 'false';
        expect(new URLSearchParams(get.mock.calls[0][2]).get('tags')).toBe(disabled ? 'solo' : 'solo rating:general');
        expect(result?.id ?? null).toBe(disabled ? 42 : null);
    }
);

it('rejects Safebooru image URLs even with SFW filtering off', async () => {
    const { api } = provider({ post: [{ ...post, file_url: 'https://safebooru.org/a.png' }] }, { sfw: false });
    await expect(api.search('solo')).resolves.toBeNull();
});

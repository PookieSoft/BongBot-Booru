import { describe, expect, it, vi } from 'vitest';
import { Safebooru, createSafebooru } from '../../src/index.js';
import type { SafebooruOptions } from '../../src/index.js';
import { RetryingCaller } from '../../src/helpers/retrying_caller.js';

const post = { id: 42, rating: 'general', file_url: 'https://safebooru.org/images/a.png' };

function provider(response: unknown, options: SafebooruOptions = {}, random = () => 0) {
    const get = vi.fn().mockResolvedValue(response);
    return { api: new Safebooru({ get }, options, random), get };
}

describe('Safebooru', () => {
    it('exposes its site name and referer', () => {
        expect(new Safebooru({ get: vi.fn() }).site).toEqual({ name: 'Safebooru', referer: 'https://safebooru.org/' });
    });

    it('parses a bare array and sends normalized tags without credentials or a rating tag', async () => {
        const { api, get } = provider([post]);
        await expect(api.search('  shirakami_fubuki   solo  ')).resolves.toEqual({
            id: 42,
            imageUrl: post.file_url,
            postUrl: 'https://safebooru.org/index.php?page=post&s=view&id=42',
        });
        expect(get).toHaveBeenCalledOnce();
        expect(get.mock.calls[0].slice(0, 2)).toEqual(['https://safebooru.org', '/index.php']);
        expect(Object.fromEntries(new URLSearchParams(get.mock.calls[0][2]))).toEqual({
            page: 'dapi',
            s: 'post',
            q: 'index',
            json: '1',
            limit: '100',
            tags: 'shirakami_fubuki solo -ai-generated',
        });
    });

    it('allows AI images when requested', async () => {
        const { api, get } = provider([], { allowAiImages: true });
        await api.search('solo');
        expect(new URLSearchParams(get.mock.calls[0][2]).get('tags')).toBe('solo');
    });

    it('selects randomly among valid results', async () => {
        const { api } = provider([post, { ...post, id: 43 }], {}, () => 0.999);
        expect((await api.search('solo'))?.id).toBe(43);
    });

    it('prefers a valid sample image', async () => {
        const sampleUrl = 'https://safebooru.org/samples/a.jpg';
        const { api } = provider([{ ...post, sample_url: sampleUrl }]);
        expect((await api.search('solo'))?.imageUrl).toBe(sampleUrl);
    });

    it.each(['broken', 'https://gelbooru.com/a.png'])(
        'falls back from an invalid sample URL: %s',
        async (sampleUrl) => {
            const { api } = provider([{ ...post, sample_url: sampleUrl }]);
            expect((await api.search('solo'))?.imageUrl).toBe(post.file_url);
        }
    );

    it.each(['general', 'sensitive', 'questionable', 'explicit'])('does not filter the %s rating', async (rating) => {
        expect((await provider([{ ...post, rating }]).api.search('solo'))?.id).toBe(42);
    });

    it.each([[], null, [null], [{ ...post, file_url: 'https://gelbooru.com/a.png' }]])(
        'returns no images: %s',
        async (response) => {
            await expect(provider(response).api.search('solo')).resolves.toBeNull();
        }
    );

    it('treats an empty JSON body as no results without retrying', async () => {
        const get = vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input'));
        await expect(new Safebooru(new RetryingCaller({ get })).search('solo')).resolves.toBeNull();
        expect(get).toHaveBeenCalledOnce();
    });

    it.each([{}, { post: [post] }, 'error', undefined])('rejects malformed responses: %s', async (response) => {
        await expect(provider(response).api.search('solo')).rejects.toThrow('Safebooru returned an invalid response.');
    });

    it.each(['', '   ', 'a'.repeat(501)])('rejects invalid tag length', async (tags) => {
        const { api, get } = provider([]);
        await expect(api.search(tags)).rejects.toThrow('between 1 and 500');
        expect(get).not.toHaveBeenCalled();
    });

    it.each(['rating:explicit', 'solo&limit=1', 'solo ~nude'])('rejects search operators: %s', async (tags) => {
        const { api, get } = provider([]);
        await expect(api.search(tags)).rejects.toThrow('search operators');
        expect(get).not.toHaveBeenCalled();
    });

    it('keeps upstream failures out of the message and on the stack', async () => {
        const get = vi.fn().mockRejectedValue(new Error('403 upstream detail'));
        const failure = (await new Safebooru({ get }).search('solo').catch((error: Error) => error)) as Error;
        expect(failure.message).toBe('Safebooru is unavailable. Please try again later.');
        expect(failure.stack).toContain('Caused by: Error: 403 upstream detail');
    });
});

describe('suggest', () => {
    const entry = { label: 'furina_(genshin_impact) (7188)', value: 'furina_(genshin_impact)' };

    it('uses Safebooru autocomplete and parses the count from the label', async () => {
        const { api, get } = provider([entry, { label: 'solo (0)', value: 'solo' }]);
        await expect(api.suggest('furina')).resolves.toEqual([
            { tag: entry.value, label: 'furina (genshin impact)', postCount: 7188 },
            { tag: 'solo', label: 'solo', postCount: 0 },
        ]);
        expect(get.mock.calls[0]).toEqual(['https://safebooru.org', '/autocomplete.php', 'q=furina']);
    });

    it.each([
        { ...entry, label: 'no count' },
        { ...entry, label: 'solo (-1)' },
        { ...entry, label: 42 },
        { ...entry, value: 42 },
        'not a suggestion',
    ])('drops malformed suggestions: %s', async (invalid) => {
        await expect(provider([invalid]).api.suggest('furina')).resolves.toEqual([]);
    });

    it('returns no suggestions for a non-array response', async () => {
        await expect(provider({}).api.suggest('furina')).resolves.toEqual([]);
    });

    it('reports autocomplete syntax errors as failures', async () => {
        const get = vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input'));
        await expect(new Safebooru({ get }).suggest('furina')).rejects.toThrow('Safebooru is unavailable.');
    });
});

describe('createSafebooru', () => {
    it.each([true, false])('passes the AI policy and ignores Gelbooru credentials: %s', async (allowAiImages) => {
        const get = vi.fn().mockResolvedValue([]);
        const api = createSafebooru(
            { get },
            { GELBOORU_API_KEY: 'secret', GELBOORU_USER_ID: 'invalid' },
            allowAiImages
        );
        expect(api).toBeInstanceOf(Safebooru);
        await api.search('solo');
        const params = new URLSearchParams(get.mock.calls[0][2]);
        expect(params.get('tags')).toBe(allowAiImages ? 'solo' : 'solo -ai-generated');
        expect(params.has('api_key')).toBe(false);
        expect(params.has('user_id')).toBe(false);
    });
});

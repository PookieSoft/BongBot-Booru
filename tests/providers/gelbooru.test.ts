import { describe, expect, it, vi } from 'vitest';
import { Caller } from '@pookiesoft/bongbot-core';
import { Gelbooru } from '../../src/providers/gelbooru.js';

const post = { id: 42, rating: 'general', file_url: 'https://img3.gelbooru.com/images/example.png' };
const sampleUrl = 'https://img3.gelbooru.com/samples/example.jpg';

function provider(response: unknown, credentials: Record<string, boolean | string> = { allowAiImages: true }, random = () => 0) {
    const get = vi.fn().mockResolvedValue(response);
    return { api: new Gelbooru({ get }, credentials, random), get };
}

describe('Gelbooru', () => {
    it('excludes AI-tagged posts by default', async () => {
        const { api, get } = provider({ post: [] }, { allowAiImages: false });
        await api.search('solo');
        expect(new URLSearchParams(get.mock.calls[0][2]).get('tags')).toBe('solo -ai-generated rating:general');
    });
    it('uses Core Caller with an encoded query and authentication', async () => {
        const caller = new Caller();
        const get = vi.spyOn(caller, 'get').mockResolvedValue({ post: [post] });
        const api = new Gelbooru(caller, { apiKey: 'a&b', userId: '12', allowAiImages: true });
        await expect(api.search('  shirakami_fubuki   solo  ')).resolves.toEqual({
            id: 42, imageUrl: post.file_url, postUrl: 'https://gelbooru.com/index.php?page=post&s=view&id=42',
        });
        expect(get).toHaveBeenCalledOnce();
        expect(get.mock.calls[0].slice(0, 2)).toEqual(['https://gelbooru.com', '/index.php']);
        const params = new URLSearchParams(get.mock.calls[0][2]!);
        expect(Object.fromEntries(params)).toEqual({ page: 'dapi', s: 'post', q: 'index', json: '1',
            limit: '100', tags: 'shirakami_fubuki solo rating:general', api_key: 'a&b', user_id: '12' });
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

    it.each(['rating:explicit', '-rating:general', 'solo ~nude', 'solo&limit=1', '{solo}', 'solo\nRaTiNg:sensitive'])('rejects operators: %s', async (tags) => {
        const { api, get } = provider({ post: [] });
        await expect(api.search(tags)).rejects.toThrow('search operators');
        expect(get).not.toHaveBeenCalled();
    });

    it.each([{ post: [] }, { '@attributes': { count: 0 } }, { '@attributes': { count: '0' } }])('handles no matches', async (response) => {
        await expect(provider(response).api.search('solo')).resolves.toBeNull();
    });

    it.each([null, [], 'error', {}, { post: null }, { post: {} }, { '@attributes': { count: 1 } }])('rejects malformed responses', async (response) => {
        await expect(provider(response).api.search('solo')).rejects.toThrow('invalid response');
    });

    it.each([
        null, [], {}, { ...post, rating: undefined }, { ...post, id: 0 }, { ...post, id: 1.5 }, { ...post, id: '42' },
        { ...post, rating: 'sensitive' }, { ...post, rating: 'questionable' }, { ...post, rating: 'explicit' },
        { ...post, rating: 'safe' }, { ...post, file_url: 12 }, { ...post, file_url: 'broken' },
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

    it('does not expose upstream errors or credentials', async () => {
        const get = vi.fn().mockRejectedValue(new Error('URL includes secret-api-key'));
        await expect(new Gelbooru({ get }).search('solo')).rejects.toThrow('Gelbooru is unavailable. Please try again later.');
    });
});


it.each(['general', 'sensitive', 'questionable', 'explicit'])('allows %s only when SFW mode is disabled', async (rating) => {
    const { api, get } = provider({ post: [{ ...post, rating }] }, { sfw: false });
    expect((await api.search('solo'))?.id).toBe(42);
    expect(new URLSearchParams(get.mock.calls[0][2]).get('tags')).toBe('solo -ai-generated');
});

it.each([
    { ...post, rating: 'unknown' },
    { ...post, file_url: 'https://attacker.test/image.png' },
    { ...post, file_url: 'https://gelbooru.com/image.webm' },
])('keeps response validation when SFW mode is disabled', async (invalid) => {
    await expect(provider({ post: [invalid] }, { sfw: false }).api.search('solo')).resolves.toBeNull();
});

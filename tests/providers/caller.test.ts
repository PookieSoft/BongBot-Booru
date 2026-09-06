import { afterEach, expect, it, vi } from 'vitest';
import { Caller } from '@pookiesoft/bongbot-core';
import { Gelbooru } from '../../src/providers/gelbooru.js';

afterEach(() => vi.unstubAllGlobals());

it('passes a Gelbooru JSON response through the real Core HTTP client', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ post: [
        { id: 7, rating: 'general', file_url: 'https://img3.gelbooru.com/image.png' },
    ] }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    const result = await new Gelbooru(new Caller()).search('solo');
    expect(result?.id).toBe(7);
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.origin).toBe('https://gelbooru.com');
    expect(url.searchParams.get('tags')).toBe('solo rating:general');
    expect(fetch.mock.calls[0][1].method).toBe('GET');
});

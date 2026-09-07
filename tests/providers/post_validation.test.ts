import { describe, expect, it } from 'vitest';
import { isRecord, isImage, isImageUrl } from '../../src/providers/post_validation.js';

const post = { id: 42, rating: 'general', file_url: 'https://safebooru.org/images/a.png' };

describe('isRecord', () => {
    it.each([{}, { id: 1 }])('accepts records: %s', (value) => {
        expect(isRecord(value)).toBe(true);
    });

    it.each([null, undefined, [], 'text', 42])('rejects non-records: %s', (value) => {
        expect(isRecord(value)).toBe(false);
    });
});

describe('isImage', () => {
    it.each(['general', 'sensitive', 'questionable', 'explicit'])('accepts a valid %s post', (rating) => {
        expect(isImage({ ...post, rating }, 'safebooru.org')).toBe(true);
    });

    it.each([
        null,
        [],
        {},
        { ...post, id: 0 },
        { ...post, id: -1 },
        { ...post, id: 1.5 },
        { ...post, id: '42' },
        { ...post, id: Number.MAX_SAFE_INTEGER + 1 },
        { ...post, rating: undefined },
        { ...post, rating: 'safe' },
        { ...post, file_url: 12 },
        { ...post, file_url: 'broken' },
    ])('rejects malformed posts: %s', (value) => {
        expect(isImage(value, 'safebooru.org')).toBe(false);
    });

    it('uses the supplied image host', () => {
        expect(isImage(post, 'gelbooru.com')).toBe(false);
        expect(isImage({ ...post, file_url: 'https://gelbooru.com/a.png' }, 'safebooru.org')).toBe(false);
    });
});

describe('isImageUrl', () => {
    it.each(['gelbooru.com', 'safebooru.org'])('binds URLs to %s and its subdomains', (host) => {
        expect(isImageUrl(`https://${host}/images/a.png`, host)).toBe(true);
        expect(isImageUrl(`https://img3.${host}/images/a.png`, host)).toBe(true);
    });

    it.each(['jpg', 'JPEG', 'png', 'gif', 'webp'])('accepts the %s image extension', (extension) => {
        expect(isImageUrl(`https://safebooru.org/images/a.${extension}?size=large`, 'safebooru.org')).toBe(true);
    });

    it.each([
        'broken',
        'http://safebooru.org/a.png',
        'https://user@safebooru.org/a.png',
        'https://:pass@safebooru.org/a.png',
        'https://safebooru.org:8443/a.png',
        'https://safebooru.org.attacker.test/a.png',
        'https://evilsafebooru.org/a.png',
        'https://gelbooru.com/a.png',
        'https://img3.gelbooru.com/a.png',
        'https://127.0.0.1/a.png',
        'https://safebooru.org/a.webm',
        'https://safebooru.org/a',
    ])('rejects unsafe or unsupported URLs: %s', (url) => {
        expect(isImageUrl(url, 'safebooru.org')).toBe(false);
    });

    it('rejects Safebooru URLs for Gelbooru', () => {
        expect(isImageUrl('https://safebooru.org/a.png', 'gelbooru.com')).toBe(false);
    });
});

import type { Caller } from '@pookiesoft/bongbot-core';
import type { ImagePost, ImageProvider, ImageSite } from './image_provider.js';

const endpoint = 'https://gelbooru.com';
const imageHost = new URL(endpoint).hostname;

export class Gelbooru implements ImageProvider {
    readonly site: ImageSite = { name: 'Gelbooru', referer: `${endpoint}/` };

    constructor(
        private readonly caller: Pick<Caller, 'get'>,
        private readonly options: GelbooruOptions = {},
        private readonly random: () => number = Math.random
    ) {}

    async search(tags: string): Promise<ImagePost | null> {
        const normalized = tags.trim().split(/\s+/).join(' ');
        if (!normalized || normalized.length > 500) {
            throw new Error('Enter between 1 and 500 characters of tags.');
        }
        if (!normalized.split(' ').every((tag) => /^-?[a-z0-9_().*-]+$/i.test(tag))) {
            throw new Error('Use space-separated tags; search operators and rating overrides are not supported.');
        }
        const sfw = this.options.sfw ?? true;
        const searchTags = this.options.allowAiImages ? normalized : `${normalized} -ai-generated`;
        const params = new URLSearchParams({
            page: 'dapi',
            s: 'post',
            q: 'index',
            json: '1',
            limit: '100',
            tags: sfw ? `${searchTags} rating:general` : searchTags,
        });
        if (this.options.apiKey && this.options.userId) {
            params.set('api_key', this.options.apiKey);
            params.set('user_id', this.options.userId);
        }
        let response: unknown;
        try {
            response = await this.caller.get(endpoint, '/index.php', params.toString());
        } catch {
            throw new Error('Gelbooru is unavailable. Please try again later.');
        }
        if (!isRecord(response)) throw new Error('Gelbooru returned an invalid response.');
        const posts = response.post;
        if (posts === undefined && isRecord(response['@attributes']) && Number(response['@attributes'].count) === 0) {
            return null;
        }
        if (!Array.isArray(posts)) throw new Error('Gelbooru returned an invalid response.');
        const images = posts.filter(isImage).filter((post) => !sfw || post.rating === 'general');
        if (images.length === 0) return null;
        const post = images[Math.floor(this.random() * images.length)];
        return {
            id: post.id,
            imageUrl: post.sample_url && isImageUrl(post.sample_url) ? post.sample_url : post.file_url,
            postUrl: `${endpoint}/index.php?page=post&s=view&id=${post.id}`,
        };
    }
}

export function createGelbooru(caller: Pick<Caller, 'get'>, env: NodeJS.ProcessEnv, allowAiImages: boolean): Gelbooru {
    const apiKey = env.GELBOORU_API_KEY?.trim();
    const userId = env.GELBOORU_USER_ID?.trim();
    if (Boolean(apiKey) !== Boolean(userId)) {
        throw new Error('Set GELBOORU_API_KEY and GELBOORU_USER_ID together.');
    }
    if (userId && !/^[1-9]\d*$/.test(userId)) {
        throw new Error('GELBOORU_USER_ID must be a positive integer.');
    }
    return new Gelbooru(caller, {
        apiKey,
        userId,
        allowAiImages,
        // Off for the exact word false and nothing else, so a typo leaves the filter on.
        // ALLOW_AI_IMAGES compares the opposite way for the same reason; see config.ts.
        sfw: env.GELBOORU_SFW?.trim().toLowerCase() !== 'false',
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isImage(value: unknown): value is GelbooruPost {
    if (!isRecord(value) || !Number.isSafeInteger(value.id) || Number(value.id) <= 0) return false;
    if (
        typeof value.rating !== 'string' ||
        !['general', 'sensitive', 'questionable', 'explicit'].includes(value.rating)
    )
        return false;
    return typeof value.file_url === 'string' && isImageUrl(value.file_url);
}

function isImageUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return (
            url.protocol === 'https:' &&
            !url.username &&
            !url.password &&
            !url.port &&
            (url.hostname === imageHost || url.hostname.endsWith(`.${imageHost}`)) &&
            /\.(?:jpe?g|png|gif|webp)$/i.test(url.pathname)
        );
    } catch {
        return false;
    }
}

export interface GelbooruOptions {
    sfw?: boolean;
    allowAiImages?: boolean;
    apiKey?: string;
    userId?: string;
}

interface GelbooruPost {
    id: number;
    rating: string;
    file_url: string;
    sample_url?: string;
}

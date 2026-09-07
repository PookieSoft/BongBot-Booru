import type { Caller } from '@pookiesoft/bongbot-core';
import { userFacingError } from '../helpers/user_facing_error.js';
import { isRecord, isImage, isImageUrl } from './post_validation.js';
import type { ImagePost, ImageProvider, ImageSite, TagSuggestion } from './image_provider.js';

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
        const response = await this.request(sfw ? `${searchTags} rating:general` : searchTags);
        if (!isRecord(response)) throw new Error('Gelbooru returned an invalid response.');
        const posts = response.post;
        if (posts === undefined && isRecord(response['@attributes']) && Number(response['@attributes'].count) === 0) {
            return null;
        }
        if (!Array.isArray(posts)) throw new Error('Gelbooru returned an invalid response.');
        const images = posts
            .filter((post) => isImage(post, imageHost))
            .filter((post) => !sfw || post.rating === 'general');
        if (images.length === 0) return null;
        const post = images[Math.floor(this.random() * images.length)];
        return {
            id: post.id,
            imageUrl: post.sample_url && isImageUrl(post.sample_url, imageHost) ? post.sample_url : post.file_url,
            postUrl: `${endpoint}/index.php?page=post&s=view&id=${post.id}`,
        };
    }

    async suggest(term: string): Promise<TagSuggestion[]> {
        const params = new URLSearchParams({ page: 'autocomplete2', term, type: 'tag_query', limit: '25' });
        const response = await this.get(endpoint, '/index.php', params);
        if (!Array.isArray(response)) return [];
        return response.filter(isSuggestion).flatMap((entry) => {
            const postCount = Number(entry.post_count);
            return postCount >= 0 ? [{ tag: entry.value, label: entry.value.replace(/_/g, ' '), postCount }] : [];
        });
    }

    private request(tags: string): Promise<unknown> {
        const params = new URLSearchParams({ page: 'dapi', s: 'post', q: 'index', json: '1', limit: '100', tags });
        if (this.options.apiKey && this.options.userId) {
            params.set('api_key', this.options.apiKey);
            params.set('user_id', this.options.userId);
        }
        return this.get(endpoint, '/index.php', params);
    }

    private async get(url: string, path: string, params: URLSearchParams): Promise<unknown> {
        try {
            return await this.caller.get(url, path, params.toString());
        } catch (error) {
            throw userFacingError('Gelbooru is unavailable. Please try again later.', error);
        }
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
        sfw: env.GELBOORU_SFW?.trim().toLowerCase() !== 'false',
    });
}

function isSuggestion(value: unknown): value is GelbooruSuggestion {
    return isRecord(value) && typeof value.value === 'string' && typeof value.label === 'string';
}

export interface GelbooruOptions {
    sfw?: boolean;
    allowAiImages?: boolean;
    apiKey?: string;
    userId?: string;
}

interface GelbooruSuggestion {
    value: string;
    label: string;
    post_count?: string | number;
}

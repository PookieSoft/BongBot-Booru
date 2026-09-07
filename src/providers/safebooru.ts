import type { Caller } from '@pookiesoft/bongbot-core';
import { userFacingError } from '../helpers/user_facing_error.js';
import { isRecord, isImage, isImageUrl } from './post_validation.js';
import type { ImagePost, ImageProvider, ImageSite, TagSuggestion } from './image_provider.js';

const endpoint = 'https://safebooru.org';
const imageHost = new URL(endpoint).hostname;

export class Safebooru implements ImageProvider {
    readonly site: ImageSite = { name: 'Safebooru', referer: `${endpoint}/` };

    constructor(
        private readonly caller: Pick<Caller, 'get'>,
        private readonly options: SafebooruOptions = {},
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
        const searchTags = this.options.allowAiImages ? normalized : `${normalized} -ai-generated`;
        const response = await this.request(searchTags);
        if (response === null) return null;
        if (!Array.isArray(response)) throw new Error('Safebooru returned an invalid response.');
        const images = response.filter((post) => isImage(post, imageHost));
        if (images.length === 0) return null;
        const post = images[Math.floor(this.random() * images.length)];
        return {
            id: post.id,
            imageUrl: post.sample_url && isImageUrl(post.sample_url, imageHost) ? post.sample_url : post.file_url,
            postUrl: `${endpoint}/index.php?page=post&s=view&id=${post.id}`,
        };
    }

    async suggest(term: string): Promise<TagSuggestion[]> {
        const params = new URLSearchParams({ q: term });
        const response = await this.get('/autocomplete.php', params);
        if (!Array.isArray(response)) return [];
        return response.filter(isSuggestion).flatMap((entry) => {
            const postCount = Number(entry.label.match(/\((\d+)\)$/)?.[1]);
            return postCount >= 0 ? [{ tag: entry.value, label: entry.value.replace(/_/g, ' '), postCount }] : [];
        });
    }

    private async request(tags: string): Promise<unknown> {
        const params = new URLSearchParams({ page: 'dapi', s: 'post', q: 'index', json: '1', limit: '100', tags });
        try {
            return await this.caller.get(endpoint, '/index.php', params.toString());
        } catch (error) {
            // Safebooru sends an empty JSON body when no posts match.
            if (error instanceof SyntaxError) return null;
            throw userFacingError('Safebooru is unavailable. Please try again later.', error);
        }
    }

    private async get(path: string, params: URLSearchParams): Promise<unknown> {
        try {
            return await this.caller.get(endpoint, path, params.toString());
        } catch (error) {
            throw userFacingError('Safebooru is unavailable. Please try again later.', error);
        }
    }
}

export function createSafebooru(
    caller: Pick<Caller, 'get'>,
    _env: NodeJS.ProcessEnv,
    allowAiImages: boolean
): Safebooru {
    return new Safebooru(caller, { allowAiImages });
}

function isSuggestion(value: unknown): value is SafebooruSuggestion {
    return isRecord(value) && typeof value.value === 'string' && typeof value.label === 'string';
}

export interface SafebooruOptions {
    allowAiImages?: boolean;
}

interface SafebooruSuggestion {
    value: string;
    label: string;
}

import type { Caller } from '@pookiesoft/bongbot-core';
import { Gelbooru } from './providers/gelbooru.js';
import type { ImageProvider } from './providers/image_provider.js';

type ProviderFactory = (caller: Pick<Caller, 'get'>, env: NodeJS.ProcessEnv) => ImageProvider;

const providerMap: Record<string, ProviderFactory> = {
    gelbooru: createGelbooru,
};

export function createProvider(caller: Pick<Caller, 'get'>, env: NodeJS.ProcessEnv = process.env): ImageProvider {
    const providerName = env.IMAGE_PROVIDER?.trim().toLowerCase() || 'gelbooru';
    const create = providerMap[providerName];
    if (!create) {
        throw new Error(`Unsupported image provider: ${providerName}.`);
    }
    return create(caller, env);
}

function createGelbooru(caller: Pick<Caller, 'get'>, env: NodeJS.ProcessEnv): ImageProvider {
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
        // The flags default opposite ways, so the comparisons must too: an unrecognised
        // value leaves both filters on.
        sfw: env.GELBOORU_SFW?.trim().toLowerCase() !== 'false',
        allowAiImages: env.ALLOW_AI_IMAGES?.trim().toLowerCase() === 'true',
    });
}

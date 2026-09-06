import { Caller } from '@pookiesoft/bongbot-core';
import { Gelbooru } from './providers/gelbooru.js';
import type { ImageProvider } from './providers/image_provider.js';

type ProviderFactory = (env: NodeJS.ProcessEnv) => ImageProvider;

const providerMap: Record<string, ProviderFactory> = {
    gelbooru: createGelbooru,
};

export function createProvider(env: NodeJS.ProcessEnv = process.env): ImageProvider {
    const providerName = env.IMAGE_PROVIDER?.trim().toLowerCase() || 'gelbooru';
    const create = providerMap[providerName];
    if (!create) {
        throw new Error(`Unsupported image provider: ${providerName}.`);
    }
    return create(env);
}

function createGelbooru(env: NodeJS.ProcessEnv): ImageProvider {
    const sfwSetting = env.GELBOORU_SFW?.trim().toLowerCase() || 'true';
    if (sfwSetting !== 'true' && sfwSetting !== 'false') {
        throw new Error('GELBOORU_SFW must be true or false.');
    }
    const apiKey = env.GELBOORU_API_KEY?.trim();
    const userId = env.GELBOORU_USER_ID?.trim();
    if (Boolean(apiKey) !== Boolean(userId)) {
        throw new Error('Set GELBOORU_API_KEY and GELBOORU_USER_ID together.');
    }
    if (userId && !/^[1-9]\d*$/.test(userId)) {
        throw new Error('GELBOORU_USER_ID must be a positive integer.');
    }
    const allowAiSetting = env.ALLOW_AI_IMAGES?.trim().toLowerCase() || 'false';
    if (allowAiSetting !== 'true' && allowAiSetting !== 'false') {
        throw new Error('ALLOW_AI_IMAGES must be true or false.');
    }
    return new Gelbooru(new Caller(), {
        apiKey,
        userId,
        sfw: sfwSetting === 'true',
        allowAiImages: allowAiSetting === 'true',
    });
}

import type { Caller } from '@pookiesoft/bongbot-core';
import { createSafebooru } from './providers/safebooru.js';
import { createGelbooru } from './providers/gelbooru.js';
import type { ImageProvider } from './providers/image_provider.js';

export function createProvider(caller: Pick<Caller, 'get'>, env: NodeJS.ProcessEnv = process.env): ImageProvider {
    const allowAiImages = env.ALLOW_AI_IMAGES?.trim().toLowerCase() === 'true';
    const provider =
        env.IMAGE_PROVIDER ?? (env.GELBOORU_SFW?.trim().toLowerCase() === 'false' ? 'gelbooru' : 'safebooru');
    if (provider === 'safebooru') return createSafebooru(caller, env, allowAiImages);
    if (provider === 'gelbooru') return createGelbooru(caller, env, allowAiImages);
    throw new Error('IMAGE_PROVIDER must be safebooru or gelbooru.');
}

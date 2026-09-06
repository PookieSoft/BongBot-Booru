import type { Caller } from '@pookiesoft/bongbot-core';
import { createGelbooru } from './providers/gelbooru.js';
import type { ImageProvider } from './providers/image_provider.js';

export function createProvider(caller: Pick<Caller, 'get'>, env: NodeJS.ProcessEnv = process.env): ImageProvider {
    const allowAiImages = env.ALLOW_AI_IMAGES?.trim().toLowerCase() === 'true';
    return createGelbooru(caller, env, allowAiImages);
}

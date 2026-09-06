import { Caller } from '@pookiesoft/bongbot-core';
import { Gelbooru } from './providers/gelbooru.js';

export function createProvider(env: NodeJS.ProcessEnv = process.env): Gelbooru {
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
    return new Gelbooru(new Caller(), { apiKey, userId, sfw: sfwSetting === 'true' });
}

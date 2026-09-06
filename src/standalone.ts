import { mkdirSync } from 'node:fs';
import { Caller, basicStart } from '@pookiesoft/bongbot-core';
import buildCommands from './commands/buildCommands.js';
import { createProvider } from './config.js';
import { HttpImageDownloader } from './helpers/image_downloader.js';

const caller = new Caller();
const provider = createProvider(caller);
const downloader = new HttpImageDownloader(caller);
mkdirSync('logs', { recursive: true });
await basicStart('PookieSoft', 'BongBot-Booru', (bot) => buildCommands(bot, provider, downloader));

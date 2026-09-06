import { mkdirSync } from 'node:fs';
import { basicStart } from '@pookiesoft/bongbot-core';
import buildCommands from './commands/buildCommands.js';
import { createProvider } from './config.js';

const provider = createProvider();
mkdirSync('logs', { recursive: true });
await basicStart('PookieSoft', 'BongBot-Booru', (bot) => buildCommands(bot, provider));

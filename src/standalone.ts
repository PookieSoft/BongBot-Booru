import { mkdirSync } from 'node:fs';
import { Caller, basicStart } from '@pookiesoft/bongbot-core';
import buildCommands from './commands/buildCommands.js';
import { createProvider } from './config.js';
import { HttpImageDownloader } from './helpers/image_downloader.js';
import { RetryingCaller } from './helpers/retrying_caller.js';

const caller = new RetryingCaller(new Caller());
const provider = createProvider(caller);
const downloader = new HttpImageDownloader(caller);
mkdirSync('logs', { recursive: true });
const bot = await basicStart('PookieSoft', 'BongBot-Booru', (client) => buildCommands(client, provider, downloader));
// Core's handler ignores an autocomplete interaction, so the tag suggestions are wired up here.
bot.on('interactionCreate', (interaction) => {
    if (!interaction.isAutocomplete()) return;
    bot.commands
        .get(interaction.commandName)
        ?.autocomplete?.(interaction)
        .catch((error: Error) => bot.logger.error(error));
});

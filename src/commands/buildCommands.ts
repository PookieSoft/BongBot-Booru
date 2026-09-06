import { commandBuilder } from '@pookiesoft/bongbot-core';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import type { ImageProvider } from '../providers/image_provider.js';
import { createProvider } from '../config.js';
import { ImageCommand } from './image_command.js';
import { Booru } from './booru/master.js';

export default function buildCommands(bot: ExtendedClient, provider: ImageProvider = createProvider()) {
    const commandsArray = [
        new ImageCommand('clown', 'Find an Omaru Polka image.', 'omaru_polka', provider),
        new ImageCommand('fox', 'Find a Shirakami Fubuki image.', 'shirakami_fubuki', provider),
        new Booru(provider),
    ];
    return commandBuilder(bot, commandsArray);
}

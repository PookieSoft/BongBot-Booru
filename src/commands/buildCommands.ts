import { commandBuilder } from '@pookiesoft/bongbot-core';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import type { HttpImageDownloader } from '../helpers/image_downloader.js';
import type { ImageProvider } from '../providers/image_provider.js';
import { ImageCommand } from './image_command.js';
import { Booru } from './booru/master.js';

export default function buildCommands(
    bot: ExtendedClient,
    provider: ImageProvider,
    downloader: Pick<HttpImageDownloader, 'download'>
) {
    const commandsArray = [
        new ImageCommand('clown', 'Find an Omaru Polka image.', 'omaru_polka', provider, downloader),
        new ImageCommand('fox', 'Find a Shirakami Fubuki image.', 'shirakami_fubuki', provider, downloader),
        new Booru(provider, downloader),
    ];
    return commandBuilder(bot, commandsArray);
}

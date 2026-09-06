import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { HttpImageDownloader } from '../../helpers/image_downloader.js';
import type { ImageProvider } from '../../providers/image_provider.js';
import { imageResponse } from '../image_command.js';

export class Search {
    constructor(
        private readonly provider: ImageProvider,
        private readonly downloader: Pick<HttpImageDownloader, 'download'>
    ) {}

    async execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient) {
        const tags = interaction.options.getString('tags', true);
        return imageResponse(interaction, bot, this.provider, tags, this.downloader);
    }
}

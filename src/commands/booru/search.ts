import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { ImageProvider } from '../../providers/image_provider.js';
import { imageResponse } from '../image_command.js';

export class Search {
    constructor(private readonly provider: ImageProvider) {}

    async execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient) {
        return imageResponse(interaction, bot, this.provider, interaction.options.getString('tags', true));
    }
}

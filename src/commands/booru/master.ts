import type { Caller, ExtendedClient } from '@pookiesoft/bongbot-core';
import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { ImageProvider } from '../../providers/image_provider.js';
import { Search } from './search.js';

export class Booru {
    readonly data = new SlashCommandBuilder()
        .setName('booru')
        .setDescription('Find images on Gelbooru.')
        .addSubcommand((command) =>
            command
                .setName('search')
                .setDescription('Search by space-separated tags.')
                .addStringOption((option) =>
                    option
                        .setName('tags')
                        .setDescription('For example: shirakami_fubuki solo')
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(500)
                )
        );
    readonly fullDesc = {
        description: 'Find images on Gelbooru.',
        options: [{ name: 'search', description: 'Search using space-separated tags and underscores within tags.' }],
    };
    private readonly search: Search;

    constructor(provider: ImageProvider, caller?: Pick<Caller, 'get'>) {
        this.search = new Search(provider, caller);
    }

    async execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient) {
        if (interaction.options.getSubcommand() === 'search') return this.search.execute(interaction, bot);
        throw new Error('Unknown booru subcommand.');
    }
}

import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { SlashCommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { HttpImageDownloader } from '../../helpers/image_downloader.js';
import type { ImageProvider } from '../../providers/image_provider.js';
import { Search, TAG_FIELDS } from './search.js';

export class Booru {
    readonly data = new SlashCommandBuilder()
        .setName('booru')
        .setDescription('Find images on Gelbooru.')
        .addSubcommand((command) => {
            command.setName('search').setDescription('Search by tag, one tag to a field.');
            for (const [index, field] of TAG_FIELDS.entries()) {
                command.addStringOption((option) =>
                    option
                        .setName(field)
                        .setDescription(index === 0 ? 'For example: shirakami_fubuki' : 'A further tag to narrow it.')
                        .setRequired(index === 0)
                        .setAutocomplete(true)
                        .setMinLength(1)
                        .setMaxLength(100)
                );
            }
            return command;
        });
    readonly fullDesc = {
        description: 'Find images on Gelbooru.',
        options: [{ name: 'search', description: 'Search by tag, one tag to a field, with suggestions as you type.' }],
    };
    private readonly search: Search;

    constructor(provider: ImageProvider, downloader: Pick<HttpImageDownloader, 'download'>) {
        this.search = new Search(provider, downloader);
    }

    async execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient) {
        if (interaction.options.getSubcommand() === 'search') return this.search.execute(interaction, bot);
        throw new Error('Unknown booru subcommand.');
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        if (interaction.options.getSubcommand() === 'search') return this.search.autocomplete(interaction);
        throw new Error('Unknown booru subcommand.');
    }
}

import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { HttpImageDownloader } from '../../helpers/image_downloader.js';
import type { ImageProvider, TagSuggestion } from '../../providers/image_provider.js';
import { imageResponse } from '../image_command.js';

export const TAG_FIELDS = ['tag_1', 'tag_2', 'tag_3', 'tag_4', 'tag_5'];

const CHOICE_LIMIT = 25;
const FIELD_LIMIT = 100;

export class Search {
    constructor(
        private readonly provider: ImageProvider,
        private readonly downloader: Pick<HttpImageDownloader, 'download'>
    ) {}

    async execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient) {
        const tags = TAG_FIELDS.flatMap((field) => interaction.options.getString(field) ?? [])
            .map((tag) => tag.trim().replace(/\s+/g, '_'))
            .join(' ');
        return imageResponse(interaction, bot, this.provider, tags, this.downloader);
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        const term = interaction.options.getFocused();
        if (!term) return interaction.respond([]);
        return interaction.respond(choicesFor(await this.provider.suggest(term)));
    }
}

function choicesFor(suggestions: TagSuggestion[]) {
    return suggestions
        .filter((suggestion) => suggestion.tag.length <= FIELD_LIMIT)
        .slice(0, CHOICE_LIMIT)
        .map((suggestion) => ({
            name: `${suggestion.label} (${suggestion.postCount})`.slice(0, FIELD_LIMIT),
            value: suggestion.tag,
        }));
}

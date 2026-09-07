import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { HttpImageDownloader } from '../../helpers/image_downloader.js';
import type { ImageProvider, TagSuggestion } from '../../providers/image_provider.js';
import { imageResponse } from '../image_command.js';

const CHOICE_LIMIT = 25;
const FIELD_LIMIT = 100;

export class Search {
    constructor(
        private readonly provider: ImageProvider,
        private readonly downloader: Pick<HttpImageDownloader, 'download'>
    ) {}

    async execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient) {
        const tags = interaction.options.getString('tags', true);
        return imageResponse(interaction, bot, this.provider, tags, this.downloader);
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        const typed = interaction.options.getFocused();
        // Only the word under the cursor is completed, so the tags already typed survive the choice.
        const prefix = typed.slice(0, typed.lastIndexOf(' ') + 1);
        const term = typed.slice(prefix.length);
        if (!term) return interaction.respond([]);
        const suggestions = await this.provider.suggest(term);
        return interaction.respond(choicesFor(prefix, suggestions));
    }
}

function choicesFor(prefix: string, suggestions: TagSuggestion[]) {
    return suggestions
        .map((suggestion) => ({
            name: `${suggestion.label} (${suggestion.postCount.toLocaleString('en-GB')} posts)`.slice(0, FIELD_LIMIT),
            value: `${prefix}${suggestion.tag}`,
        }))
        .filter((choice) => choice.value.length <= FIELD_LIMIT)
        .slice(0, CHOICE_LIMIT);
}

import { EMBED_BUILDER, buildError } from '@pookiesoft/bongbot-core';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { ImageProvider } from '../providers/image_provider.js';

export class ImageCommand {
    readonly data: SlashCommandBuilder;
    readonly fullDesc: { description: string; options: never[] };

    constructor(
        name: string,
        description: string,
        private readonly tags: string,
        private readonly provider: ImageProvider,
    ) {
        this.data = new SlashCommandBuilder().setName(name).setDescription(description);
        this.fullDesc = { description, options: [] };
    }

    async execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient) {
        return imageResponse(interaction, bot, this.provider, this.tags);
    }
}

export async function imageResponse(
    interaction: ChatInputCommandInteraction,
    bot: ExtendedClient,
    provider: ImageProvider,
    tags: string,
) {
    try {
        const post = await provider.search(tags);
        if (!post) return { content: 'No images found for those tags.', allowedMentions: { parse: [] } };
        const builder = new EMBED_BUILDER().addDefaultFooter(bot);
        builder.embed.setTitle('View on Gelbooru').setURL(post.postUrl).setImage(post.imageUrl);
        return builder.build();
    } catch (error) {
        return buildError(interaction, error);
    }
}

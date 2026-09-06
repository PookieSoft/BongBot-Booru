import { EMBED_BUILDER, buildError } from '@pookiesoft/bongbot-core';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { HttpImageDownloader } from '../helpers/image_downloader.js';
import type { ImageProvider } from '../providers/image_provider.js';

export class ImageCommand {
    readonly data: SlashCommandBuilder;
    readonly fullDesc: { description: string; options: never[] };

    constructor(
        name: string,
        description: string,
        private readonly tags: string,
        private readonly provider: ImageProvider,
        private readonly downloader: Pick<HttpImageDownloader, 'download'>
    ) {
        this.data = new SlashCommandBuilder().setName(name).setDescription(description);
        this.fullDesc = { description, options: [] };
    }

    async execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient) {
        return imageResponse(interaction, bot, this.provider, this.tags, this.downloader);
    }
}

export async function imageResponse(
    interaction: ChatInputCommandInteraction,
    bot: ExtendedClient,
    provider: ImageProvider,
    tags: string,
    downloader: Pick<HttpImageDownloader, 'download'>
) {
    try {
        const post = await provider.search(tags);
        if (!post) return { content: 'No images found for those tags.', allowedMentions: { parse: [] } };
        const image = await downloader.download(post.imageUrl, provider.site);
        const attachment = new AttachmentBuilder(image.data, { name: image.filename });
        const builder = new EMBED_BUILDER(attachment).addDefaultFooter(bot);
        builder.embed
            .setTitle(`View on ${provider.site.name}`)
            .setURL(post.postUrl)
            .setImage(`attachment://${image.filename}`);
        return builder.build();
    } catch (error) {
        return buildError(interaction, error);
    }
}

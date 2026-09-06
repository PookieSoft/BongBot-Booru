import { EMBED_BUILDER, buildError } from '@pookiesoft/bongbot-core';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { ImageProvider } from '../providers/image_provider.js';

export class ImageCommand {
    readonly data: SlashCommandBuilder;
    readonly fullDesc: { description: string; options: never[] };

    constructor(
        name: string,
        description: string,
        private readonly tags: string,
        private readonly provider: ImageProvider
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
    tags: string
) {
    try {
        const post = await provider.search(tags);
        if (!post) return { content: 'No images found for those tags.', allowedMentions: { parse: [] } };
        const response = await fetch(post.imageUrl, {
            headers: {
                Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                Referer: 'https://gelbooru.com/',
                'User-Agent': 'BongBot-Booru/0.1',
            },
        });
        if (!response.ok) throw new Error(`Image server returned HTTP ${response.status}.`);
        if (!response.headers.get('content-type')?.startsWith('image/')) {
            throw new Error('Image server returned a non-image response.');
        }
        const image = Buffer.from(await response.arrayBuffer());
        const filename = imageFilename(post.imageUrl);
        const attachment = new AttachmentBuilder(image, { name: filename });
        const builder = new EMBED_BUILDER(attachment).addDefaultFooter(bot);
        builder.embed.setTitle('View on Gelbooru').setURL(post.postUrl).setImage(`attachment://${filename}`);
        return builder.build();
    } catch (error) {
        return buildError(interaction, error);
    }
}

function imageFilename(imageUrl: string): string {
    const pathname = new URL(imageUrl).pathname;
    const extension = pathname.match(/\.(jpe?g|png|gif|webp)$/i)?.[1] ?? 'jpg';
    return `gelbooru-image.${extension.toLowerCase()}`;
}

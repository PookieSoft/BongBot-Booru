import { Caller, EMBED_BUILDER, buildError } from '@pookiesoft/bongbot-core';
import type { BinaryResponse, ExtendedClient } from '@pookiesoft/bongbot-core';
import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { ImageProvider, ImageSite } from '../providers/image_provider.js';

const IMAGE_HEADERS = {
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'User-Agent': 'BongBot-Booru/0.1',
};

const DEFAULT_CALLER = new Caller();

export class ImageCommand {
    readonly data: SlashCommandBuilder;
    readonly fullDesc: { description: string; options: never[] };

    constructor(
        name: string,
        description: string,
        private readonly tags: string,
        private readonly provider: ImageProvider,
        private readonly caller?: Pick<Caller, 'get'>
    ) {
        this.data = new SlashCommandBuilder().setName(name).setDescription(description);
        this.fullDesc = { description, options: [] };
    }

    async execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient) {
        return imageResponse(interaction, bot, this.provider, this.tags, this.caller);
    }
}

export async function imageResponse(
    interaction: ChatInputCommandInteraction,
    bot: ExtendedClient,
    provider: ImageProvider,
    tags: string,
    caller: Pick<Caller, 'get'> = DEFAULT_CALLER
) {
    try {
        const post = await provider.search(tags);
        if (!post) return { content: 'No images found for those tags.', allowedMentions: { parse: [] } };
        const image = await downloadImage(caller, post.imageUrl, provider.site);
        const filename = imageFilename(post.imageUrl, provider.site);
        const attachment = new AttachmentBuilder(image, { name: filename });
        const builder = new EMBED_BUILDER(attachment).addDefaultFooter(bot);
        builder.embed
            .setTitle(`View on ${provider.site.name}`)
            .setURL(post.postUrl)
            .setImage(`attachment://${filename}`);
        return builder.build();
    } catch (error) {
        return buildError(interaction, error);
    }
}

async function downloadImage(caller: Pick<Caller, 'get'>, imageUrl: string, site: ImageSite): Promise<Buffer> {
    let response: BinaryResponse | null;
    try {
        response = await caller.get(imageUrl, null, null, { ...IMAGE_HEADERS, Referer: site.referer }, 'binary');
    } catch {
        // Core reports the status alongside the full image URL, which does not belong in a Discord reply.
        throw new Error(`${site.name} could not deliver the image. Please try again later.`);
    }
    if (!response) throw new Error('Image server returned an empty response.');
    if (!response.contentType?.startsWith('image/')) {
        throw new Error('Image server returned a non-image response.');
    }
    return response.data;
}

function imageFilename(imageUrl: string, site: ImageSite): string {
    const pathname = new URL(imageUrl).pathname;
    const extension = pathname.match(/\.(jpe?g|png|gif|webp)$/i)?.[1] ?? 'jpg';
    const name = site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${name}-image.${extension.toLowerCase()}`;
}

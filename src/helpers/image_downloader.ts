import type { BinaryResponse, Caller } from '@pookiesoft/bongbot-core';
import { userFacingError } from './user_facing_error.js';
import type { ImageSite } from '../providers/image_provider.js';

const IMAGE_HEADERS = {
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'User-Agent': 'BongBot-Booru/0.1',
};

export class HttpImageDownloader {
    constructor(private readonly caller: Pick<Caller, 'get'>) {}

    async download(imageUrl: string, site: ImageSite): Promise<DownloadedImage> {
        let response: BinaryResponse | null;
        try {
            response = await this.caller.get(
                imageUrl,
                null,
                null,
                { ...IMAGE_HEADERS, Referer: site.referer },
                'binary'
            );
        } catch (error) {
            // Core reports the status alongside the full image URL, which does not belong in a Discord reply.
            throw userFacingError(`${site.name} could not deliver the image. Please try again later.`, error);
        }
        if (!response) throw new Error('Image server returned an empty response.');
        if (!response.contentType?.startsWith('image/')) {
            throw new Error('Image server returned a non-image response.');
        }
        return { data: response.data, filename: imageFilename(imageUrl, site) };
    }
}

function imageFilename(imageUrl: string, site: ImageSite): string {
    const pathname = new URL(imageUrl).pathname;
    const extension = pathname.match(/\.(jpe?g|png|gif|webp)$/i)?.[1] ?? 'jpg';
    const name = site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${name}-image.${extension.toLowerCase()}`;
}

export interface DownloadedImage {
    data: Buffer;
    filename: string;
}

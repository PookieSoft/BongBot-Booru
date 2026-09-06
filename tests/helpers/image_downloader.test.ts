import { expect, it, vi } from 'vitest';
import { HttpImageDownloader } from '../../src/helpers/image_downloader.js';

const site = { name: 'Gelbooru', referer: 'https://gelbooru.com/' };
const imageUrl = 'https://img3.gelbooru.com/a.png';

function downloader(result: unknown = { data: Buffer.from([1, 2, 3]), contentType: 'image/png' }) {
    const get = vi.fn().mockResolvedValue(result);
    return { downloader: new HttpImageDownloader({ get }), get };
}

it('requests the image through Core with the headers the host requires', async () => {
    const { downloader: subject, get } = downloader();
    await expect(subject.download(imageUrl, site)).resolves.toEqual({
        data: Buffer.from([1, 2, 3]),
        filename: 'gelbooru-image.png',
    });
    expect(get).toHaveBeenCalledWith(
        imageUrl,
        null,
        null,
        {
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            Referer: 'https://gelbooru.com/',
            'User-Agent': 'BongBot-Booru/0.1',
        },
        'binary'
    );
});

it('takes the referer and filename from the site it is given', async () => {
    const mirror = { name: 'Safebooru Mirror', referer: 'https://safebooru.org/' };
    const { downloader: subject, get } = downloader();
    const image = await subject.download(imageUrl, mirror);
    expect(get.mock.calls[0][3]).toMatchObject({ Referer: 'https://safebooru.org/' });
    expect(image.filename).toBe('safebooru-mirror-image.png');
});

it('accepts a content type that includes a charset', async () => {
    const { downloader: subject } = downloader({ data: Buffer.from([1]), contentType: 'image/jpeg; charset=binary' });
    await expect(subject.download(imageUrl, site)).resolves.toMatchObject({ filename: 'gelbooru-image.png' });
});

it.each([
    ['https://img3.gelbooru.com/a.JPEG', 'gelbooru-image.jpeg'],
    ['https://img3.gelbooru.com/image', 'gelbooru-image.jpg'],
    ['https://img3.gelbooru.com/a.png?size=large', 'gelbooru-image.png'],
])('derives the attachment name from %s', async (url, filename) => {
    const { downloader: subject } = downloader();
    expect((await subject.download(url, site)).filename).toBe(filename);
});

it('does not leak the image URL when Core reports a failure', async () => {
    const upstream = new Error(`Network response was not ok: 502 Bad Gateway ${imageUrl}`);
    const get = vi.fn().mockRejectedValue(upstream);
    const failure = (await new HttpImageDownloader({ get })
        .download(imageUrl, site)
        .catch((error: Error) => error)) as Error;
    expect(failure.message).toBe('Gelbooru could not deliver the image. Please try again later.');
    expect(failure.stack).toContain(`Caused by: Error: ${upstream.message}`);
});

it('rejects an empty download', async () => {
    const { downloader: subject } = downloader(null);
    await expect(subject.download(imageUrl, site)).rejects.toThrow('Image server returned an empty response.');
});

it.each([
    { data: Buffer.from([1]), contentType: 'text/html' },
    { data: Buffer.from([1]), contentType: null },
])('rejects a non-image download', async (result) => {
    const { downloader: subject } = downloader(result);
    await expect(subject.download(imageUrl, site)).rejects.toThrow('Image server returned a non-image response.');
});

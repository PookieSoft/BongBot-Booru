export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isImage(value: unknown, host: string): value is BoardPost {
    if (!isRecord(value) || !Number.isSafeInteger(value.id) || Number(value.id) <= 0) return false;
    if (
        typeof value.rating !== 'string' ||
        !['general', 'sensitive', 'questionable', 'explicit'].includes(value.rating)
    )
        return false;
    return typeof value.file_url === 'string' && isImageUrl(value.file_url, host);
}

export function isImageUrl(value: string, host: string): boolean {
    try {
        const url = new URL(value);
        return (
            url.protocol === 'https:' &&
            !url.username &&
            !url.password &&
            !url.port &&
            (url.hostname === host || url.hostname.endsWith(`.${host}`)) &&
            /\.(?:jpe?g|png|gif|webp)$/i.test(url.pathname)
        );
    } catch {
        return false;
    }
}

interface BoardPost {
    id: number;
    rating: string;
    file_url: string;
    sample_url?: string;
}

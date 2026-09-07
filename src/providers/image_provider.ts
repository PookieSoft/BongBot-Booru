export interface ImagePost {
    id: number;
    imageUrl: string;
    postUrl: string;
}

export interface ImageProvider {
    readonly site: ImageSite;
    search(tags: string): Promise<ImagePost | null>;
    suggest(term: string): Promise<string[]>;
}

export interface ImageSite {
    name: string;
    referer: string;
}

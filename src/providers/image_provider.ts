export interface ImagePost {
    id: number;
    imageUrl: string;
    postUrl: string;
}

export interface ImageProvider {
    readonly site: ImageSite;
    search(tags: string): Promise<ImagePost | null>;
    suggest(term: string): Promise<TagSuggestion[]>;
}

export interface ImageSite {
    name: string;
    referer: string;
}

export interface TagSuggestion {
    tag: string;
    label: string;
    postCount: number;
}

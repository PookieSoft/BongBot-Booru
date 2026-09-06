export interface ImagePost {
    id: number;
    imageUrl: string;
    postUrl: string;
}

export interface ImageProvider {
    search(tags: string): Promise<ImagePost | null>;
}

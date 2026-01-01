export interface Manga {
    id: string;
    title: string;
    cover: string;
    description?: string;
    author?: string;
    status?: string;
    sourceId: string; // "mangadex", "mangakakalot", etc.
}

export interface Chapter {
    id: string;
    title: string;
    volume?: string;
    chapter?: string;
    publishAt?: string;
    externalUrl?: string;
    sourceId: string;
}

export interface MangaDetails {
    manga: Manga;
    chapters: Chapter[];
}

export interface MangaSource {
    id: string; // e.g. "mangadex"
    name: string; // e.g. "MangaDex"

    search(query: string): Promise<Manga[]>;
    getMangaDetails(mangaId: string): Promise<MangaDetails | null>;
    getChapterImages(chapterId: string): Promise<string[]>;
}

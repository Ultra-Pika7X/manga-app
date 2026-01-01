import axios from 'axios';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://api.mangadex.org';
const UPLOADS_URL = 'https://uploads.mangadex.org';

const fetchWithRetry = async (url: string, options: any = {}, retries = 3, delay = 1000): Promise<any> => {
    try {
        const config = {
            ...options,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...options.headers,
            }
        };
        return await axios.get(url, config);
    } catch (error: any) {
        if (retries > 0 && (error.code === 'ECONNRESET' || error.response?.status === 429 || error.response?.status >= 500)) {
            await new Promise(res => setTimeout(res, delay));
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
};

export const MangaDexSource: MangaSource = {
    id: 'mangadex',
    name: 'MangaDex',

    async search(query: string): Promise<Manga[]> {
        try {
            const params = new URLSearchParams();
            params.append('title', query);
            params.append('limit', '20');
            params.append('order[relevance]', 'desc');
            params.append('availableTranslatedLanguage[]', 'en');
            params.append('includes[]', 'cover_art');
            params.append('includes[]', 'author');
            params.append('contentRating[]', 'safe');
            params.append('contentRating[]', 'suggestive');

            const { data } = await fetchWithRetry(`${BASE_URL}/manga`, { params });

            return data.data.map((manga: any) => {
                const title = Object.values(manga.attributes.title)[0] as string;
                const description = manga.attributes.description?.en || Object.values(manga.attributes.description)[0] || '';
                const coverRel = manga.relationships.find((r: any) => r.type === 'cover_art');
                const coverFileName = coverRel?.attributes?.fileName;
                const cover = coverFileName
                    ? `${UPLOADS_URL}/covers/${manga.id}/${coverFileName}`
                    : 'https://via.placeholder.com/150';

                return {
                    id: manga.id,
                    title,
                    cover,
                    description,
                    status: manga.attributes.status,
                    sourceId: 'mangadex'
                };
            });
        } catch (error: any) {
            console.error(`[MangaDex] Search error for "${query}":`, error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            const params = new URLSearchParams();
            params.append('includes[]', 'cover_art');
            params.append('includes[]', 'author');

            const mangaRes = await fetchWithRetry(`${BASE_URL}/manga/${id}`, { params });
            const mangaData = mangaRes.data.data;

            const title = Object.values(mangaData.attributes.title)[0] as string;
            const description = mangaData.attributes.description?.en || '';
            const coverRel = mangaData.relationships.find((r: any) => r.type === 'cover_art');
            const coverFileName = coverRel?.attributes?.fileName;
            const cover = coverFileName
                ? `${UPLOADS_URL}/covers/${id}/${coverFileName}`
                : 'https://via.placeholder.com/150';

            const manga: Manga = {
                id: mangaData.id,
                title,
                cover,
                description,
                status: mangaData.attributes.status,
                sourceId: 'mangadex'
            };

            const feedParams = new URLSearchParams();
            feedParams.append('translatedLanguage[]', 'en');
            feedParams.append('order[chapter]', 'desc');
            feedParams.append('limit', '500');

            const feedRes = await fetchWithRetry(`${BASE_URL}/manga/${id}/feed`, { params: feedParams });

            const chapters: Chapter[] = feedRes.data.data.map((ch: any) => ({
                id: ch.id,
                title: ch.attributes.title || `Chapter ${ch.attributes.chapter}`,
                chapter: ch.attributes.chapter,
                volume: ch.attributes.volume,
                publishAt: ch.attributes.publishAt,
                externalUrl: ch.attributes.externalUrl,
                sourceId: 'mangadex'
            }));

            return { manga, chapters };
        } catch (error: any) {
            console.error(`[MangaDex] Details error for ${id}:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            const { data } = await fetchWithRetry(`${BASE_URL}/at-home/server/${chapterId}`);

            if (!data.baseUrl || !data.chapter || !data.chapter.hash || !data.chapter.data) {
                return [];
            }

            const baseUrl = data.baseUrl;
            const hash = data.chapter.hash;
            const files = data.chapter.data;

            return files.map((file: string) => `${baseUrl}/data/${hash}/${file}`);
        } catch (error: any) {
            console.error(`[MangaDex] Chapter images error for ${chapterId}:`, error.message);
            return [];
        }
    }
};

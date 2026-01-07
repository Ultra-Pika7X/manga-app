import axios from 'axios';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const API_BASE = 'https://api.mangadex.org';
const CDN_BASE = 'https://uploads.mangadex.org';

export const MangaDexSource: MangaSource = {
    id: 'mangadex',
    name: 'MangaDex',

    async search(query: string): Promise<Manga[]> {
        try {
            const resp = await axios.get(`${API_BASE}/manga`, {
                params: {
                    title: query,
                    limit: 20,
                    'includes[]': 'cover_art',
                    'contentRating[]': ['safe', 'suggestive', 'erotica']
                }
            });

            return resp.data.data.map((item: any) => {
                const coverRel = item.relationships.find((r: any) => r.type === 'cover_art');
                const coverFileName = coverRel?.attributes?.fileName;
                const cover = coverFileName
                    ? `${CDN_BASE}/covers/${item.id}/${coverFileName}.256.jpg`
                    : '';

                return {
                    id: item.id,
                    title: item.attributes.title.en || Object.values(item.attributes.title)[0] || 'Unknown',
                    cover,
                    sourceId: 'mangadex',
                    status: item.attributes.status
                };
            });
        } catch (error: any) {
            console.error('[MangaDex] Search error:', error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            const [mangaResp, chaptersResp] = await Promise.all([
                axios.get(`${API_BASE}/manga/${id}`, {
                    params: { 'includes[]': ['cover_art', 'author'] }
                }),
                axios.get(`${API_BASE}/manga/${id}/feed`, {
                    params: {
                        limit: 500,
                        'translatedLanguage[]': ['en'],
                        'order[chapter]': 'desc',
                        'contentRating[]': ['safe', 'suggestive', 'erotica']
                    }
                })
            ]);

            const item = mangaResp.data.data;
            const coverRel = item.relationships.find((r: any) => r.type === 'cover_art');
            const authorRel = item.relationships.find((r: any) => r.type === 'author');

            const manga: Manga = {
                id: item.id,
                title: item.attributes.title.en || Object.values(item.attributes.title)[0] || 'Unknown',
                cover: coverRel?.attributes?.fileName ? `${CDN_BASE}/covers/${item.id}/${coverRel.attributes.fileName}` : '',
                description: item.attributes.description.en || '',
                author: authorRel?.attributes?.name || 'Unknown',
                status: item.attributes.status,
                sourceId: 'mangadex'
            };

            const chapters: Chapter[] = chaptersResp.data.data.map((ch: any) => ({
                id: ch.id,
                title: ch.attributes.title ? `Ch. ${ch.attributes.chapter}: ${ch.attributes.title}` : `Chapter ${ch.attributes.chapter}`,
                chapter: ch.attributes.chapter,
                publishAt: new Date(ch.attributes.publishAt).toLocaleDateString(),
                sourceId: 'mangadex'
            }));

            return { manga, chapters };
        } catch (error: any) {
            console.error('[MangaDex] Details error:', error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            const resp = await axios.get(`${API_BASE}/at-home/server/${chapterId}`);
            const { baseUrl, chapter } = resp.data;
            const { hash, data } = chapter;

            return data.map((filename: string) => `${baseUrl}/data/${hash}/${filename}`);
        } catch (error: any) {
            console.error('[MangaDex] Images error:', error.message);
            return [];
        }
    }
};

import axios from 'axios';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const API_BASE = 'https://api.comick.fun';

export const ComickSource: MangaSource = {
    id: 'comick',
    name: 'Comick',

    async search(query: string): Promise<Manga[]> {
        try {
            const resp = await axios.get(`${API_BASE}/v1.0/search`, {
                params: { q: query, limit: 20 }
            });

            return resp.data.map((item: any) => ({
                id: item.slug,
                title: item.title,
                cover: item.md_covers?.[0]?.b2key ? `https://meo.comick.pictures/${item.md_covers[0].b2key}` : '',
                sourceId: 'comick',
                status: item.status === 1 ? 'Ongoing' : 'Completed'
            }));
        } catch (error: any) {
            console.error('[Comick] Search error:', error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            const mangaResp = await axios.get(`${API_BASE}/comic/${id}`);
            const comic = mangaResp.data.comic;
            const hid = comic.hid;

            const chaptersResp = await axios.get(`${API_BASE}/comic/${hid}/chapters`, {
                params: { limit: 1000, lang: 'en' }
            });

            const manga: Manga = {
                id: comic.slug,
                title: comic.title,
                cover: comic.md_covers?.[0]?.b2key ? `https://meo.comick.pictures/${comic.md_covers[0].b2key}` : '',
                description: comic.desc || '',
                author: comic.authors?.[0]?.name || 'Unknown',
                status: comic.status === 1 ? 'Ongoing' : 'Completed',
                sourceId: 'comick'
            };

            const chapters: Chapter[] = chaptersResp.data.chapters.map((ch: any) => ({
                id: ch.hid,
                title: ch.title ? `Vol. ${ch.vol || '?'} Ch. ${ch.chap}: ${ch.title}` : `Chapter ${ch.chap}`,
                chapter: ch.chap,
                publishAt: new Date(ch.created_at).toLocaleDateString(),
                sourceId: 'comick'
            }));

            return { manga, chapters };
        } catch (error: any) {
            console.error('[Comick] Details error:', error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            const resp = await axios.get(`${API_BASE}/chapter/${chapterId}`);
            const chapter = resp.data.chapter;

            return chapter.md_images.map((img: any) => `https://meo.comick.pictures/${img.b2key}`);
        } catch (error: any) {
            console.error('[Comick] Images error:', error.message);
            return [];
        }
    }
};

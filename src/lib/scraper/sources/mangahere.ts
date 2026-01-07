import axios from 'axios';
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'http://m.mangahere.cc';

export const MangaHereSource: MangaSource = {
    id: 'mangahere',
    name: 'MangaHere',

    async search(query: string): Promise<Manga[]> {
        try {
            const { data } = await axios.get(`${BASE_URL}/search`, {
                params: { title: query }
            });
            const $ = cheerio.load(data);
            const results: Manga[] = [];

            $('.manga-list-2 .manga-list-2-item').each((_, el) => {
                const link = $(el).find('a').first();
                const title = $(el).find('.manga-list-2-title').text().trim();
                const id = link.attr('href') || '';
                const cover = $(el).find('img').attr('src') || '';

                if (title && id) {
                    results.push({
                        id, // usually full url like /manga/naruto/
                        title,
                        cover,
                        sourceId: this.id,
                        status: $(el).find('.manga-list-2-tip').text().includes('Ongoing') ? 'Ongoing' : 'Completed'
                    });
                }
            });

            return results;
        } catch (error: any) {
            console.error(`[${this.name}] Search error:`, error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            const url = id.startsWith('http') ? id : `${BASE_URL}${id}`;
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const manga: Manga = {
                id,
                title: $('.main-banner .manga-detail-name').text().trim(),
                cover: $('.main-banner img').attr('src') || '',
                description: $('.manga-detail-desc').text().trim(),
                author: $('.manga-detail-author').text().trim(),
                status: 'Unknown', // Mobile site often hides this or puts it in a difficult string
                sourceId: this.id
            };

            const chapters: Chapter[] = [];
            $('#chapter-list li').each((_, el) => {
                const link = $(el).find('a');
                const title = link.text().trim();
                const chapId = link.attr('href') || '';

                if (title && chapId) {
                    chapters.push({
                        id: chapId,
                        title,
                        sourceId: this.id
                    });
                }
            });

            return { manga, chapters }; // Chapters usually in descending order
        } catch (error: any) {
            console.error(`[${this.name}] Details error:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            // MangaHere mobile often has "1.html" for page 1.
            // But they also have a "Show All" or similar, or we can just iterate.
            // Usually http://m.mangahere.cc/roll_manga/...
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}${chapterId}`;

            // Try "roll_manga" mode if available, it lists all images
            // Replace /manga/ with /roll_manga/ if it exists, or check structure
            // Actually, mobile chapter URL often redirects to page 1.
            // Let's try fetching the page and finding image links.

            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const images: string[] = [];

            // Mobile site often uses a simple JS array for images like 'var image_list = [...]'
            const scripts = $('script').map((_, el) => $(el).html()).get();
            for (const script of scripts) {
                if (script && (script.includes('image_list') || script.includes('chapter_images'))) {
                    // Extract extract array
                    // Example: var image_list = ["http://...", "http://..."];
                    const matches = script.match(/image_list\s*=\s*\[(.*?)\]/);
                    if (matches && matches[1]) {
                        const urls = matches[1].split(',').map(u => u.trim().replace(/['"]/g, ''));
                        return urls;
                    }
                }
            }

            // Fallback: Check for img tags if it's a long-strip page
            $('.mangaread-img img').each((_, el) => {
                const src = $(el).attr('data-src') || $(el).attr('src');
                if (src && !src.includes('loading')) images.push(src);
            });

            if (images.length > 0) return images;

            // If still nothing, it might be single page mode.
            // We can return just the first one or try to guess. 
            // For now, return empty to trigger fallback.
            return [];
        } catch (error: any) {
            console.error(`[${this.name}] Images error:`, error.message);
            return [];
        }
    }
};

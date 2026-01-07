import axios from 'axios';
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://readmanga.cc';

export const ReadMangaSource: MangaSource = {
    id: 'readmanga',
    name: 'ReadManga',

    async search(query: string): Promise<Manga[]> {
        try {
            const { data } = await axios.get(`${BASE_URL}/search`, {
                params: { q: query }
            });
            const $ = cheerio.load(data);
            const results: Manga[] = [];

            $('.manga-list .item, .search-results .manga-item').each((_, el) => {
                const link = $(el).find('a').first();
                const title = $(el).find('.manga-name, .title').text().trim() || link.text().trim();
                const id = link.attr('href') || '';
                const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';

                if (title && id) {
                    results.push({
                        id: id.startsWith('http') ? id : `${BASE_URL}${id}`,
                        title,
                        cover: cover.startsWith('http') ? cover : `${BASE_URL}${cover}`,
                        sourceId: this.id,
                        status: 'Unknown'
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
                title: $('.manga-title, h1').first().text().trim(),
                cover: $('.manga-cover img, .poster img').attr('src') || '',
                description: $('.manga-description, .synopsis').text().trim(),
                author: $('.manga-author, .author').text().trim() || 'Unknown',
                status: $('.manga-status, .status').text().includes('Ongoing') ? 'Ongoing' : 'Completed',
                sourceId: this.id
            };

            const chapters: Chapter[] = [];
            $('.chapter-list li, .chapters-list .chapter').each((_, el) => {
                const link = $(el).find('a');
                const title = link.text().trim();
                const chapId = link.attr('href') || '';

                if (title && chapId) {
                    chapters.push({
                        id: chapId.startsWith('http') ? chapId : `${BASE_URL}${chapId}`,
                        title,
                        sourceId: this.id
                    });
                }
            });

            return { manga, chapters };
        } catch (error: any) {
            console.error(`[${this.name}] Details error:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}${chapterId}`;
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const images: string[] = [];

            // Common patterns for manga readers
            $('.reader-images img, .chapter-images img, .page-img').each((_, el) => {
                const src = $(el).attr('data-src') || $(el).attr('src');
                if (src && !src.includes('loading') && !src.includes('placeholder')) {
                    images.push(src.startsWith('http') ? src : `${BASE_URL}${src}`);
                }
            });

            // Fallback: Look for JS arrays
            if (images.length === 0) {
                const scripts = $('script').map((_, el) => $(el).html()).get();
                for (const script of scripts) {
                    if (script && (script.includes('pages') || script.includes('images'))) {
                        const matches = script.match(/https?:\/\/[^"']+\.(jpg|jpeg|png|webp)/gi);
                        if (matches && matches.length > 0) {
                            return [...new Set(matches)];
                        }
                    }
                }
            }

            return images;
        } catch (error: any) {
            console.error(`[${this.name}] Images error:`, error.message);
            return [];
        }
    }
};

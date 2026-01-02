import axios from 'axios';
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://weebdex.org';

export const WeebDexSource: MangaSource = {
    id: 'weebdex',
    name: 'WeebDex',

    async search(query: string): Promise<Manga[]> {
        try {
            const formattedQuery = encodeURIComponent(query);
            const url = `${BASE_URL}/search?q=${formattedQuery}`;

            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const results: Manga[] = [];

            // Generic selectors based on typical scraping patterns for WeebDex
            // Adjust these selectors based on actual site structure if needed
            $('.grid-cols-2 > div, .search-result').each((_, element) => {
                const titleElement = $(element).find('h3, .title');
                const imgElement = $(element).find('img');
                const linkElement = $(element).find('a').first();

                const title = titleElement.text().trim();
                const link = linkElement.attr('href');
                let cover = imgElement.attr('src') || '';

                if (cover && !cover.startsWith('http')) {
                    cover = cover.startsWith('//') ? `https:${cover}` : `${BASE_URL}${cover}`;
                }

                const id = link ? link.split('/').pop() || '' : '';

                if (id && title) {
                    results.push({
                        id,
                        title,
                        cover,
                        sourceId: 'weebdex',
                        status: 'Unknown'
                    });
                }
            });

            return results;
        } catch (error: any) {
            console.error(`[WeebDex] Search error for "${query}":`, error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            const url = `${BASE_URL}/title/${id}`; // Guessing URL structure: /title/id or /manga/id
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const title = $('h1').text().trim();
            const cover = $('img.cover, .poster img').attr('src') || '';
            const description = $('.description, .synopsis').text().trim();
            const author = $('.author, .artist').text().trim();
            const status = $('.status').text().trim();

            const manga: Manga = {
                id,
                title,
                cover,
                description,
                author,
                status,
                sourceId: 'weebdex'
            };

            const chapters: Chapter[] = [];
            $('.chapter-list a, .chapters a').each((_, element) => {
                const title = $(element).text().trim();
                const href = $(element).attr('href');
                const chapterId = href || '';

                if (chapterId) {
                    chapters.push({
                        id: chapterId,
                        title,
                        chapter: title.match(/Chapter\s+([\d.]+)/)?.[1] || '',
                        sourceId: 'weebdex'
                    });
                }
            });

            return { manga, chapters };

        } catch (error: any) {
            console.error(`[WeebDex] Details error for ${id}:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}${chapterId}`;
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const images: string[] = [];
            $('img.chapter-image, .reader img').each((_, element) => {
                const src = $(element).attr('src');
                if (src) images.push(src);
            });

            return images;
        } catch (error: any) {
            console.error(`[WeebDex] Images error for ${chapterId}:`, error.message);
            return [];
        }
    }
};

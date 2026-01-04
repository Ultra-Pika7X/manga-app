import axios from 'axios';
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://mangabuddy.com';

export const MangaBuddySource: MangaSource = {
    id: 'mangabuddy',
    name: 'MangaBuddy',

    async search(query: string): Promise<Manga[]> {
        try {
            const formattedQuery = query.toLowerCase().replace(/ /g, '-');
            const url = `${BASE_URL}/search?q=${formattedQuery}`;

            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);

            const results: Manga[] = [];

            // Selectors based on MangaBuddy structure
            $('.book-item').each((_, element) => {
                const titleElement = $(element).find('.title h3 a');
                const imgElement = $(element).find('.thumb img');

                const title = titleElement.text().trim();
                const link = titleElement.attr('href');
                let cover = imgElement.attr('data-src') || imgElement.attr('src') || '';

                // Ensure cover is absolute URL
                if (cover && !cover.startsWith('http')) {
                    cover = cover.startsWith('//') ? `https:${cover}` : `${BASE_URL}${cover}`;
                }

                const id = link ? link.split('/').pop() || '' : '';

                if (id && title) {
                    results.push({
                        id,
                        title,
                        cover,
                        sourceId: 'mangabuddy',
                        status: 'Unknown'
                    });
                }
            });

            return results;
        } catch (error: any) {
            console.error(`[MangaBuddy] Search error for "${query}":`, error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            const url = `${BASE_URL}/${id}`;
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);

            // Selectors for details
            const title = $('.detail-info h1').text().trim();
            let cover = $('.detail-info .img-cover img').attr('data-src') || $('.detail-info .img-cover img').attr('src') || '';
            if (cover && !cover.startsWith('http')) {
                cover = cover.startsWith('//') ? `https:${cover}` : `${BASE_URL}${cover}`;
            }

            const description = $('.summary .content').text().trim();
            const author = $('.detail-info .authors a').map((_, el) => $(el).text()).get().join(', ');
            const status = $('.detail-info .status').text().replace('Status :', '').trim();

            const manga: Manga = {
                id,
                title,
                cover,
                description,
                author,
                status,
                sourceId: 'mangabuddy'
            };

            const chapters: Chapter[] = [];
            $('#chapter-list li').each((_, element) => {
                const a = $(element).find('a');
                const title = a.text().trim(); // e.g. "Chapter 123"
                const href = a.attr('href');
                const time = $(element).find('time').text().trim();

                // ID extraction: "/one-piece/chapter-123" -> "chapter-123"
                // But for MangaBuddy, the chapter link is relative e.g., /manga-name/chapter-id
                // We'll use the full relative path or just the last part? 
                // Let's use the full relative path minus the manga part to be safe, or just the whole slug?
                // Actually, getChapterImages will need to construct the URL.
                // Let's store the full href relative part as ID, or just the end?
                // If we perform `axios.get(BASE_URL + chapterId)`, then chapterId should be `/manga/chapter`.
                // HREF is usually `/manga-name/chapter-slug`.
                const chapterId = href || '';

                if (chapterId) {
                    chapters.push({
                        id: chapterId, // This might be "/one-piece/chapter-100"
                        title,
                        chapter: title.match(/Chapter\s+([\d.]+)/)?.[1] || '',
                        publishAt: time,
                        sourceId: 'mangabuddy'
                    });
                }
            });

            return { manga, chapters };

        } catch (error: any) {
            console.error(`[MangaBuddy] Details error for ${id}:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            // chapterId is expected to be the relative path e.g. "/one-piece/chapter-100"
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}${chapterId}`;

            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);

            const images: string[] = [];

            // This selector is tricky on MangaBuddy, sometimes images are lazy loaded or in a script
            // Common selector: #reader-area img
            $('#reader-area img').each((_, element) => {
                let src = $(element).attr('data-src') || $(element).attr('src');
                if (src) {
                    if (!src.startsWith('http')) {
                        src = src.startsWith('//') ? `https:${src}` : `${BASE_URL}${src}`;
                    }
                    images.push(src);
                }
            });

            return images;
        } catch (error: any) {
            console.error(`[MangaBuddy] Images error for ${chapterId}:`, error.message);
            return [];
        }
    }
};

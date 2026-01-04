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

                // ID extraction: href is like "/one-piece/chapter-1-romance-dawn"
                // We need to encode this to be URL-safe for Next.js routing
                // Replace slashes with a safe delimiter that we can decode later
                const chapterId = href ? encodeURIComponent(href) : '';

                if (chapterId) {
                    chapters.push({
                        id: chapterId, // URL-encoded path
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
            // chapterId is URL-encoded, decode it first
            const decodedChapterId = decodeURIComponent(chapterId);
            const url = decodedChapterId.startsWith('http') ? decodedChapterId : `${BASE_URL}${decodedChapterId}`;

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

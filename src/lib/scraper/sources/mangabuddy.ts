import axios from 'axios';
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';
import { filterChapterImages, isFakeChapter, fetchPage, sanitizeUrl } from '../utils';


const BASE_URL = 'https://mangabuddy.com';

export const MangaBuddySource: MangaSource = {
    id: 'mangabuddy',
    name: 'MangaBuddy',

    async search(query: string): Promise<Manga[]> {
        try {
            const formattedQuery = query.toLowerCase().replace(/ /g, '-');
            const url = `${BASE_URL}/search?q=${formattedQuery}`;

            const data = await fetchPage(url);
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
                    cover = cover.startsWith('//') ? `https:${cover}` : `${BASE_URL}${cover.startsWith('/') ? '' : '/'}${cover}`;
                }

                // IMPROVED: Use full relative path as ID to preserve prefixes like /manga/
                const id = link || '';

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
            // IMPROVED: Robust URL construction handling both full paths and just slugs
            const url = id.startsWith('http') ? id : `${BASE_URL}${id.startsWith('/') ? '' : '/'}${id}`;
            const data = await fetchPage(url);
            const $ = cheerio.load(data);

            const title = $('.book-info h1').text().trim() || $('h1').first().text().trim();
            const altTitles = $('.book-info h2').text().trim() || $('h2').first().text().trim();
            const cover = $('.book-info .img-cover img').attr('src') || $('.book-info img').first().attr('src') || '';
            const description = $('.summary-content').text().trim() || $('.description').text().trim();

            // Authors and Status are often in specific divs or p tags
            const author = $('.book-info p:contains("Authors") a').text().trim() || $('.book-info .author').text().replace('Authors:', '').trim() || 'Unknown';
            const status = $('.book-info p:contains("Status") a').text().trim() || $('.book-info .status').text().replace('Status:', '').trim() || 'Unknown';

            const manga: Manga = {
                id,
                title,
                cover: sanitizeUrl(cover, BASE_URL) || '',
                description,
                author,
                status,
                sourceId: 'mangabuddy',
                // @ts-ignore - added for internal scoring/logic
                altTitles
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

                if (chapterId && !isFakeChapter(title)) {
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
            // chapterId is URL-encoded
            const decodedChapterId = decodeURIComponent(chapterId);
            // IMPROVED: Safer URL construction
            const url = decodedChapterId.startsWith('http') ? decodedChapterId : `${BASE_URL}${decodedChapterId.startsWith('/') ? '' : '/'}${decodedChapterId}`;

            const data = await fetchPage(url, {
                headers: {
                    'Referer': BASE_URL,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
                }
            });
            const $ = cheerio.load(data);

            const images: string[] = [];
            const seenUrls = new Set<string>();

            // Selectors
            const selector = '#chapter-video-frame, .chapter-content, #reader-area, .chapter-images, .vung-doc';


            $(selector).find('img').each((_, element) => {
                const $img = $(element);
                let src = $img.attr('data-src') || $img.attr('src') || $img.attr('data-lazy-src');

                const cleanUrl = sanitizeUrl(src, BASE_URL);

                if (cleanUrl && !seenUrls.has(cleanUrl) && !cleanUrl.includes('ads') && !cleanUrl.includes('banner')) {
                    const clean = filterChapterImages([cleanUrl]);
                    if (clean.length > 0) {
                        images.push(cleanUrl);
                        seenUrls.add(cleanUrl);
                    }
                }
            });


            // Fallback: ChapImages JS (Refined)
            if (images.length === 0) {
                $('script').each((_, el) => {
                    const script = $(el).html();
                    if (script && (script.includes('chapImages') || script.includes('lstImages'))) {
                        const match = script.match(/chapImages\s*=\s*['"]([^'"]+)['"]/i) ||
                            script.match(/lstImages\s*=\s*\[([^\]]+)\]/i);

                        if (match && match[1]) {
                            const rawImages = script.includes('lstImages') ?
                                match[1].split(',').map(u => u.replace(/['"\s]/g, '')) :
                                match[1].split(',');

                            rawImages.forEach(u => {
                                const cleanUrl = sanitizeUrl(u, BASE_URL);
                                if (cleanUrl && !seenUrls.has(cleanUrl)) {
                                    images.push(cleanUrl);
                                    seenUrls.add(cleanUrl);
                                }
                            });
                        }
                    }
                });
            }

            return images;
        } catch (error: any) {
            console.error(`[MangaBuddy] Images error:`, error.message);
            return [];
        }
    }
};

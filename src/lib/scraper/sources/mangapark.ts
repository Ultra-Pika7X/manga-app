import axios from 'axios';
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://mangapark.net';

export const MangaParkSource: MangaSource = {
    id: 'mangapark',
    name: 'MangaPark',

    async search(query: string): Promise<Manga[]> {
        try {
            const formattedQuery = encodeURIComponent(query);
            const url = `${BASE_URL}/search?q=${formattedQuery}`;

            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const results: Manga[] = [];

            // Selectors based on verified research
            $('div.flex.border-b.border-b-base-200.pb-5').each((_, element) => {
                const titleElement = $(element).find('a.link-hover.link-pri');
                const imgElement = $(element).find('a.relative.block img');

                const title = titleElement.text().trim();
                const link = titleElement.attr('href');
                let cover = imgElement.attr('src') || '';

                if (cover && !cover.startsWith('http')) {
                    cover = cover.startsWith('//') ? `https:${cover}` : `${BASE_URL}${cover}`;
                }

                // ID extraction: "/title/10953-en-one-piece" -> "10953-en-one-piece"
                // The link usually starts with /title/
                const id = link ? link.replace('/title/', '') : '';

                if (id && title) {
                    results.push({
                        id,
                        title,
                        cover,
                        sourceId: 'mangapark',
                        status: 'Unknown'
                    });
                }
            });

            return results;
        } catch (error: any) {
            console.error(`[MangaPark] Search error for "${query}":`, error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            // ID is "10953-en-one-piece"
            const url = `${BASE_URL}/title/${id}`;
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const title = $('h3 a.link.link-hover').text().trim();
            let cover = $('img.w-full').first().attr('src') || ''; // The main large image
            if (cover && !cover.startsWith('http')) {
                cover = cover.startsWith('//') ? `https:${cover}` : `${BASE_URL}${cover}`;
            }

            const description = $('div.limit-html').text().trim();
            const author = $('a[href*="/search?word="]').first().text().trim();
            // Status might be in tags
            const status = $('.status').text().trim() || 'Unknown';

            const manga: Manga = {
                id,
                title,
                cover,
                description,
                author,
                status,
                sourceId: 'mangapark'
            };

            const chapters: Chapter[] = [];
            // Selectors for chapters
            // Research indicated: div.scrollable-panel contain links
            // Example link: a.link-hover.link-primary.visited\:text-accent
            // We want to capture the link to the chapter
            $('div.scrollable-panel .item, div.scrollable-panel div.flex').each((_, element) => {
                const a = $(element).find('a.link-hover.link-primary');
                if (a.length > 0) {
                    const title = a.text().trim();
                    const href = a.attr('href');
                    // Link: /title/10953-en-one-piece/9946889-chapter-1167
                    // ID: "10953-en-one-piece/9946889-chapter-1167" (relative path relative to base, or just keep full path?)
                    // Let's use the full relative path after /title/ or keep it simple.
                    // Scraper engine expects ID.
                    const chapterId = href || '';

                    // time
                    const time = $(element).find('time').text().trim();

                    if (chapterId) {
                        chapters.push({
                            id: chapterId,
                            title,
                            chapter: title.match(/Chapter\s+([\d.]+)/)?.[1] || '',
                            publishAt: time,
                            sourceId: 'mangapark'
                        });
                    }
                }
            });

            return { manga, chapters };

        } catch (error: any) {
            console.error(`[MangaPark] Details error for ${id}:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}${chapterId}`;
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const images: string[] = [];

            // Research: div.flex.flex-col.items-center.gap-2 img
            // Sometimes images are loaded via JS script data (q.pages)
            // But let's check the static img tags first as per research
            $('div.flex.flex-col.items-center.gap-2 img').each((_, element) => {
                let src = $(element).attr('src');
                if (src) {
                    if (!src.startsWith('http')) {
                        src = src.startsWith('//') ? `https:${src}` : `${BASE_URL}${src}`;
                    }
                    images.push(src);
                }
            });

            // Fallback: check for script with `const q =` or similar data if static images aren't there
            if (images.length === 0) {
                const scriptContent = $('script:contains("const load_pages")').html();
                // This part is speculative without deep JS analysis, but common for SPA sites
                // If the research step found images in standard <img> tags, rely on that.
            }

            return images;
        } catch (error: any) {
            console.error(`[MangaPark] Images error for ${chapterId}:`, error.message);
            return [];
        }
    }
};

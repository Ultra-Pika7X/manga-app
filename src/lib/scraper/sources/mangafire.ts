import { fetchPage } from '../utils'; // Use robust fetcher
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://mangafire.to';

export const MangaFireSource: MangaSource = {
    id: 'mangafire',
    name: 'MangaFire',

    async search(query: string): Promise<Manga[]> {
        try {
            const url = `${BASE_URL}/filter?keyword=${encodeURIComponent(query)}`;
            const data = await fetchPage(url);
            const $ = cheerio.load(data);
            const results: Manga[] = [];

            $('.manga-item, .unit, .item').each((_, el) => {
                const link = $(el).find('a[href*="/manga/"]').first();
                const href = link.attr('href') || '';
                const title = link.attr('title') || link.text().trim() || $(el).find('.manga-name, .info h3').text().trim();
                const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';

                if (href && title) {
                    const id = href.replace('/manga/', '').split('/')[0];
                    if (!results.some(r => r.id === id)) {
                        results.push({
                            id,
                            title,
                            cover: cover.startsWith('http') ? cover : `${BASE_URL}${cover}`,
                            sourceId: this.id,
                            status: 'Unknown'
                        });
                    }
                }
            });

            return results;
        } catch (error: any) {
            console.error(`[MangaFire] Search error:`, error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            const url = id.startsWith('http') ? id : `${BASE_URL}/manga/${id}`;
            const data = await fetchPage(url);
            const $ = cheerio.load(data);

            const title = $('h1.manga-name, h1, .title').first().text().trim();
            const cover = $('.manga-poster img, .poster img').attr('src') || '';
            const description = $('.manga-description, .synopsis, .description').text().trim();
            const author = $('span:contains("Author") + a, .meta:contains("Author")').text().trim() || 'Unknown';
            const status = $('span:contains("Status")').next().text().includes('Ongoing') ? 'Ongoing' : 'Completed';

            const chapters: Chapter[] = [];

            $('.chapter-item, .chapter, li[data-number]').each((_, el) => {
                const link = $(el).find('a[href*="/chapter"]').first();
                const href = link.attr('href') || '';
                const chTitle = link.text().trim() || $(el).text().trim();

                if (href) {
                    chapters.push({
                        id: href.startsWith('http') ? href : `${BASE_URL}${href}`,
                        title: chTitle,
                        sourceId: this.id
                    });
                }
            });

            return {
                manga: { id, title, cover, description, author, status, sourceId: this.id },
                chapters
            };
        } catch (error: any) {
            console.error(`[MangaFire] Details error:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}${chapterId}`;
            const data = await fetchPage(url);
            const $ = cheerio.load(data);

            const images: string[] = [];
            const seen = new Set<string>();

            // MangaFire often embeds images in data attributes or script
            $('img.page-img, .reader-img img, .chapter-page img').each((_, el) => {
                const src = $(el).attr('data-src') || $(el).attr('src');
                if (src && !seen.has(src) && !src.includes('logo') && !src.includes('icon')) {
                    images.push(src.startsWith('http') ? src : `${BASE_URL}${src}`);
                    seen.add(src);
                }
            });

            // Fallback: Script extraction
            if (images.length === 0) {
                const scripts = $('script').map((_, el) => $(el).html()).get();
                for (const script of scripts) {
                    if (script && (script.includes('pages') || script.includes('images'))) {
                        const matches = script.match(/https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi);
                        if (matches) {
                            for (const m of matches) {
                                if (!seen.has(m) && !m.includes('logo')) {
                                    images.push(m);
                                    seen.add(m);
                                }
                            }
                        }
                    }
                }
            }

            return images;
        } catch (error: any) {
            console.error(`[MangaFire] Images error:`, error.message);
            return [];
        }
    }
};

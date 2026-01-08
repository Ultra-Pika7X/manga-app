import { fetchPage } from '../utils'; // Use centralized robust fetcher
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://mangasee123.com';

export const MangaSeeSource: MangaSource = {
    id: 'mangasee',
    name: 'MangaSee',

    async search(query: string): Promise<Manga[]> {
        try {
            // Note: JSON endpoint often protected/complex. We use standard search page with robust headers.
            const url = `${BASE_URL}/search/?name=${encodeURIComponent(query)}`;
            const data = await fetchPage(url, {
                headers: {
                    'Referer': BASE_URL
                }
            });
            const $ = cheerio.load(data);

            const results: Manga[] = [];

            // MangaSee lists results in divs with links
            $('a.SeriesName, .top-15 a[href*="/manga/"]').each((_, el) => {
                const href = $(el).attr('href') || '';
                const title = $(el).text().trim();
                const parent = $(el).closest('.top-15, .SeriesListItem');
                const cover = parent.find('img').attr('src') || '';

                if (href && title) {
                    const id = href.replace('/manga/', '').replace('/', '');
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
            console.error(`[MangaSee] Search error:`, error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            const url = `${BASE_URL}/manga/${id}`;
            const data = await fetchPage(url);
            const $ = cheerio.load(data);

            const title = $('h1').first().text().trim();
            const cover = $('img.img-fluid, .cover img').attr('src') || '';
            const description = $('.description-text, .Content').text().trim();
            const author = $('li:contains("Author") a, span:contains("Author")').next().text().trim() || 'Unknown';
            const status = $('li:contains("Status") a, span:contains("Status")').text().includes('Ongoing') ? 'Ongoing' : 'Completed';

            const chapters: Chapter[] = [];

            // MangaSee embeds chapters in a script variable
            const scripts = $('script').map((_, el) => $(el).html()).get();
            for (const script of scripts) {
                if (script && script.includes('vm.Chapters')) {
                    const match = script.match(/vm\.Chapters\s*=\s*(\[[\s\S]*?\]);/);
                    if (match) {
                        try {
                            const chaptersData = JSON.parse(match[1]);
                            for (const ch of chaptersData) {
                                const chNum = ch.Chapter;
                                // Decode chapter number (e.g., "100010" -> "1")
                                const decoded = parseInt(chNum.slice(1, -1), 10).toString();
                                chapters.push({
                                    id: `${id}-chapter-${decoded}`,
                                    title: `Chapter ${decoded}`,
                                    chapter: decoded,
                                    sourceId: this.id
                                });
                            }
                        } catch (e) { }
                    }
                }
            }

            // Fallback: DOM-based chapter extraction
            if (chapters.length === 0) {
                $('a[href*="-chapter-"]').each((_, el) => {
                    const href = $(el).attr('href') || '';
                    const chTitle = $(el).text().trim();
                    if (href) {
                        chapters.push({
                            id: href.replace('/read-online/', ''),
                            title: chTitle || 'Chapter',
                            sourceId: this.id
                        });
                    }
                });
            }

            return {
                manga: { id, title, cover, description, author, status, sourceId: this.id },
                chapters: chapters.reverse()
            };
        } catch (error: any) {
            console.error(`[MangaSee] Details error:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            // chapterId format: "MangaName-chapter-1"
            const url = `${BASE_URL}/read-online/${chapterId}.html`;
            const data = await fetchPage(url);
            const $ = cheerio.load(data);

            const images: string[] = [];

            // MangaSee embeds images in vm.CurChapter.Page array
            const scripts = $('script').map((_, el) => $(el).html()).get();
            for (const script of scripts) {
                if (script && script.includes('vm.CurPathName')) {
                    const pathMatch = script.match(/vm\.CurPathName\s*=\s*"([^"]+)"/);
                    const chapterMatch = script.match(/vm\.CurChapter\s*=\s*({[\s\S]*?});/);

                    if (pathMatch && chapterMatch) {
                        try {
                            const path = pathMatch[1];
                            const chapter = JSON.parse(chapterMatch[1]);
                            const pageCount = parseInt(chapter.Page, 10);
                            const chNum = chapter.Chapter;

                            // Decode chapter (remove leading digit and trailing digit)
                            const decoded = parseInt(chNum.slice(1, -1), 10).toString().padStart(4, '0');

                            for (let i = 1; i <= pageCount; i++) {
                                const page = i.toString().padStart(3, '0');
                                images.push(`https://${path}/manga/${chapterId.split('-chapter-')[0]}/${decoded}-${page}.png`);
                            }
                        } catch (e) { }
                    }
                }
            }

            return images;
        } catch (error: any) {
            console.error(`[MangaSee] Images error:`, error.message);
            return [];
        }
    }
};

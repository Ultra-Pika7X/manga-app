import axios from 'axios';
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://mangareader.to';

export const MangaReaderSource: MangaSource = {
    id: 'mangareader',
    name: 'MangaReader.to',

    async search(query: string): Promise<Manga[]> {
        try {
            const { data } = await axios.get(`${BASE_URL}/search`, {
                params: { keyword: query }
            });
            const $ = cheerio.load(data);
            const results: Manga[] = [];

            $('.manga_list-sbs .item').each((_, el) => {
                const titleEl = $(el).find('.manga-detail .manga-name a');
                const title = titleEl.text().trim();
                const id = titleEl.attr('href') || '';
                const cover = $(el).find('.manga-poster img').attr('src') || '';

                if (title && id) {
                    results.push({
                        id,
                        title,
                        cover,
                        sourceId: this.id,
                        status: $(el).find('.fd-infor .fdi-item').last().text().trim() || 'Unknown'
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
                title: $('.manga-detail .manga-name').text().trim(),
                cover: $('.manga-poster img').attr('src') || '',
                description: $('.description').text().trim(),
                author: $('.manga-detail .fd-infor .fdi-item').first().text().trim(),
                status: $('.manga-detail .fd-infor .fdi-item').last().text().trim(),
                sourceId: this.id
            };

            const chapters: Chapter[] = [];
            $('#chapters-list .item').each((_, el) => {
                const link = $(el).find('a');
                const title = link.attr('title') || link.text().trim();
                const chapId = link.attr('href') || '';

                if (title && chapId) {
                    chapters.push({
                        id: chapId,
                        title,
                        sourceId: this.id
                    });
                }
            });

            return { manga, chapters: chapters.reverse() };
        } catch (error: any) {
            console.error(`[${this.name}] Details error:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}${chapterId}`;
            // MangaReader usually loads images via a reading session ID or in-page script
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            // Heuristic for MangaReader: They often use a JSON structure for pages
            // or specific data-attributes on image tags.
            const images: string[] = [];

            // Checking for data-attributes often used in their reader
            $('#wrapper .iv-card').each((_, el) => {
                const src = $(el).attr('data-url');
                if (src) images.push(src);
            });

            // Fallback: search for scripts containing page info
            if (images.length === 0) {
                const scripts = $('script').map((_, el) => $(el).html()).get();
                for (const script of scripts) {
                    if (script && script.includes('IMAGE_CONFIG')) {
                        // Extracting using simple regex
                        const matches = script.match(/https?:\/\/[^"']+\.(jpg|jpeg|png|webp)/gi);
                        if (matches) return [...new Set(matches)];
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

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://mangakakalot.to';

async function debug() {
    try {
        const query = "chainsaw_man";
        const url = `${BASE_URL}/search/story/${query}`;
        console.log(`Fetching: ${url}`);

        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        console.log(`Title: $('title').text()`);

        const stories = $('.story_item');
        console.log(`Found .story_item elements: ${stories.length}`);

        if (stories.length === 0) {
            console.log("Outputting body sample:");
            console.log($('body').html()?.substring(0, 1000));

            // Check for daily_update div or similar
            console.log("Daily update items: " + $('.daily-update .daily-item').length);
        } else {
            stories.each((i, el) => {
                if (i < 3) {
                    console.log(`Item ${i}:`);
                    console.log(`  Title: ${$(el).find('.story_name a').text()}`);
                    console.log(`  Link: ${$(el).find('.story_name a').attr('href')}`);
                }
            });
        }
    } catch (e: any) {
        console.error(e.message);
    }
}

debug();

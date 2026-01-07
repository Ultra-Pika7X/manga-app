const axios = require('axios');
const cheerio = require('cheerio');

async function debug() {
    try {
        const url = 'https://mangapark.to/title/10953-en-one-piece/8312659-chapter-1102-the-life-of-kuma';
        console.log(`Fetching ${url}...`);

        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://mangapark.to/'
            },
            timeout: 10000
        });

        const $ = cheerio.load(data);

        // Find the script with 'comic'
        let targetScript = '';
        $('script').each((i, el) => {
            const content = $(el).html();
            if (content && content.includes('comic') && content.length > 100) {
                console.log(`\n>>> FOUND TARGET SCRIPT ${i} <<<`);
                targetScript = content;
                // Print first 2000 chars
                console.log(content.substring(0, 2000));
            }
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debug();

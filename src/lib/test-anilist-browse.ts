import { browseManga, getGenres } from './anilist';

async function test() {
    console.log('--- Testing AniList Browsing ---');

    console.log('\n1. Fetching Genres...');
    const genres = await getGenres();
    console.log(`Found ${genres.length} genres:`, genres.slice(0, 5).join(', ') + '...');

    console.log('\n2. Testing Seasonal Search (WINTER 2024)...');
    const seasonal = await browseManga({
        season: 'WINTER',
        seasonYear: 2024,
        perPage: 5
    });
    console.log(`Found ${seasonal.media.length} items.`);
    seasonal.media.forEach(m => console.log(` - ${m.title.english || m.title.romaji}`));

    console.log('\n3. Testing Trending Search...');
    const trending = await browseManga({
        sort: ['TRENDING_DESC'],
        perPage: 5
    });
    console.log(`Found ${trending.media.length} items.`);
    trending.media.forEach(m => console.log(` - ${m.title.english || m.title.romaji} (Trending score: ${m.trending})`));

    console.log('\n4. Testing Genre Filter (Action + Adventure)...');
    const filtered = await browseManga({
        genres: ['Action', 'Adventure'],
        perPage: 5
    });
    console.log(`Found ${filtered.media.length} items.`);
    filtered.media.forEach(m => console.log(` - ${m.title.english || m.title.romaji} [${m.genres?.join(', ')}]`));

    console.log('\n--- Test Complete ---');
}

test().catch(console.error);

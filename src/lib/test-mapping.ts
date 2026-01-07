import { resolveMapping } from './mapping';

async function test() {
    console.log('--- Testing AniList to Source Mapping ---');

    // One Piece (AniList ID: 30013)
    const testCases = [
        { id: '30013', titles: { english: 'One Piece', romaji: 'One Piece' } },
        { id: '30001', titles: { english: 'Monster', romaji: 'Monster' } },
        { id: '101517', titles: { english: 'Solo Leveling', romaji: 'Na Honjaman Level Up' } }
    ];

    for (const testCase of testCases) {
        console.log(`\nTesting: ${testCase.titles.english}...`);
        const mapping = await resolveMapping(testCase.id, testCase.titles);

        if (mapping) {
            console.log(`✅ Matched to: ${mapping.sourceName} (${mapping.matchedTitle})`);
            console.log(`   ID: ${mapping.mangaId}`);
        } else {
            console.log(`❌ No match found.`);
        }
    }

    console.log('\n--- Test Complete ---');
}

test().catch(console.error);

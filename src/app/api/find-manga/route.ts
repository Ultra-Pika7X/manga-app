import { NextResponse } from 'next/server';
import { ScraperEngine } from '@/lib/scraper';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const sourceId = searchParams.get('sourceId');

    if (!title || !sourceId) {
        return NextResponse.json({ error: 'Missing title or sourceId' }, { status: 400 });
    }

    try {
        const results = await ScraperEngine.search(title, sourceId);

        if (results.length === 0) {
            return NextResponse.json({ found: false, mangaId: null });
        }

        // 1. Try case-insensitive exact match
        const exactMatch = results.find(
            m => m.title.toLowerCase() === title.toLowerCase()
        );

        if (exactMatch) {
            return NextResponse.json({ found: true, mangaId: exactMatch.id, title: exactMatch.title });
        }

        // 2. Try contains match (both ways)
        const containsMatch = results.find(
            m => m.title.toLowerCase().includes(title.toLowerCase()) ||
                title.toLowerCase().includes(m.title.toLowerCase())
        );

        if (containsMatch) {
            return NextResponse.json({ found: true, mangaId: containsMatch.id, title: containsMatch.title });
        }

        // 3. Fallback: Return the first result if we have anything
        // This is better than failing to search, as the user likely wants the top hit
        return NextResponse.json({ found: true, mangaId: results[0].id, title: results[0].title });
    } catch (error) {
        console.error('Source switch search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

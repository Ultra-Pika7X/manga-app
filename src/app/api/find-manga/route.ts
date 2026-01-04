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

        // Try to find exact match first
        const exactMatch = results.find(
            m => m.title.toLowerCase() === title.toLowerCase()
        );

        if (exactMatch) {
            return NextResponse.json({ found: true, mangaId: exactMatch.id, title: exactMatch.title });
        }

        // Otherwise return the first result
        return NextResponse.json({ found: true, mangaId: results[0].id, title: results[0].title });
    } catch (error) {
        console.error('Source switch search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

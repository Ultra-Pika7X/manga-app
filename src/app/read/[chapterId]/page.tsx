import { ScraperEngine } from '@/lib/scraper';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReaderControls from '@/components/ReaderControls';

interface PageProps {
    params: {
        chapterId: string;
    };
    searchParams: {
        sourceId?: string;
        mangaId?: string;
        title?: string;
        chapterTitle?: string;
        cover?: string;
    };
}

export default async function ReaderPage({ params, searchParams }: PageProps) {
    const { chapterId } = await params;
    const { sourceId } = await searchParams;

    // Fetch images and manga data using the engine
    const images = await ScraperEngine.getChapterImages(chapterId, sourceId);

    // We need manga details for the history feature
    // Ideally we should have a way to get manga info from chapterId or from the previous page
    // For now, let's assume we can get basic info or it's passed via query params if needed
    // But better: search for the manga by id if we can extract it or have it
    // ScraperEngine.getMangaDetails might be needed if we don't have manga info

    if (!images || images.length === 0) {
        // Build a fallback URL to MangaBuddy
        const decodedChapterId = decodeURIComponent(chapterId);
        const mangabuddyUrl = sourceId === 'mangabuddy' && decodedChapterId.startsWith('/')
            ? `https://mangabuddy.com${decodedChapterId}`
            : `https://mangabuddy.com`;

        return (
            <main className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                <div className="text-center max-w-md p-8">
                    <div className="text-6xl mb-4">📖</div>
                    <h1 className="text-2xl font-bold mb-4">Unable to load chapter</h1>
                    <p className="text-gray-400 mb-6">
                        We couldn&apos;t load this chapter in the app.
                        You can read it directly on the source website instead.
                    </p>
                    <a
                        href={mangabuddyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors mb-4"
                    >
                        Read on MangaBuddy →
                    </a>
                    <Link href="/" className="text-purple-400 block hover:underline mt-4">
                        Go Home
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <ReaderControls
            images={images}
            chapterId={chapterId}
            mangaId={searchParams.mangaId || ''}
            mangaTitle={searchParams.title || 'Manga'}
            chapterTitle={searchParams.chapterTitle || 'Chapter'}
            cover={searchParams.cover || ''}
            sourceId={sourceId || 'mangadex'}
        />
    );
}

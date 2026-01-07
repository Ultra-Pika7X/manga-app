
import { ScraperEngine } from '@/lib/scraper';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReaderControls from '@/components/ReaderControls';
import CommentsSection from '@/components/CommentsSection';

interface PageProps {
    params: Promise<{
        chapterId: string;
    }>;
    searchParams: Promise<{
        sourceId?: string;
        mangaId?: string;
        title?: string;
        chapterTitle?: string;
        cover?: string;
    }>;
}

export default async function ReaderPage({ params, searchParams }: PageProps) {
    const { chapterId } = await params;
    const resolvedSearchParams = await searchParams;
    const { sourceId, mangaId, title, chapterTitle, cover: coverParam } = resolvedSearchParams;

    // Fetch images and manga data using the engine
    const images = await ScraperEngine.getChapterImages(chapterId, sourceId);

    // We need manga details for the history feature
    let mangaTitle = title || 'Manga';
    let cover = coverParam || '';
    const resolvedMangaId = mangaId || '';

    // If metadata is missing but we have mangaId, try to fetch it
    if (resolvedMangaId && (!mangaTitle || mangaTitle === 'Manga' || !cover)) {
        try {
            const details = await ScraperEngine.getMangaDetails(resolvedMangaId, sourceId);
            if (details) {
                mangaTitle = details.manga.title;
                cover = details.manga.cover;
            }
        } catch (e) {
            console.error('Failed to fetch metadata for history:', e);
        }
    }

    return (
        <main className="min-h-screen bg-[#0f0f1a]">
            {/* Logic for reading and controls is handled by ReaderControls client component */}
            <ReaderControls
                images={images}
                chapterId={chapterId}
                mangaId={resolvedMangaId}
                mangaTitle={mangaTitle}
                chapterTitle={chapterTitle || `Chapter ${chapterId}`}
                cover={cover}
                sourceId={sourceId || 'weebdex'}
            />

            {/* Comments Section */}
            <div className="relative z-10 pb-20">
                <CommentsSection mangaId={resolvedMangaId} chapterId={chapterId} />
            </div>
        </main>
    );
}

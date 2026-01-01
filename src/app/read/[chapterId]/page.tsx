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
    };
}

export default async function ReaderPage({ params, searchParams }: PageProps) {
    const { chapterId } = await params; // Await params in Next.js 15+ (though 14 is sync often, good practice)
    const { sourceId } = await searchParams; // Await searchParams

    // Fetch images using the engine
    const images = await ScraperEngine.getChapterImages(chapterId, sourceId);

    if (!images || images.length === 0) {
        return (
            <main className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Error loading chapter</h1>
                    <p>No images found or external chapter.</p>
                    <Link href="/" className="text-purple-400 mt-4 block hover:underline">Go Home</Link>
                </div>
            </main>
        );
    }

    return (
        <ReaderControls images={images} chapterId={chapterId} />
    );
}

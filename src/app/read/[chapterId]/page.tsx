import { resolveMappingAction, saveLastWorkingSourceAction } from '@/app/actions';
import { getMediaById } from '@/lib/anilist';
import { ScraperEngine } from '@/lib/scraper';
import { MangaReader } from '@/components/reader';
import CommentsSection from '@/components/CommentsSection';

interface PageProps {
    params: Promise<{
        chapterId: string;
    }>;
    searchParams: Promise<{
        sourceId?: string;
        mangaId: string; // Required AniList ID
        chapterTitle?: string;
    }>;
}

export default async function ReaderPage({ params, searchParams }: PageProps) {
    const { chapterId } = await params;
    const { mangaId: anilistId, sourceId: initialSourceId, chapterTitle } = await searchParams;

    // 1. Metadata Sovereignty: Fetch ONLY from AniList
    const aniListMedia = await getMediaById(anilistId);

    // Fallback labels if metadata fetch fails (offline/error)
    const mangaTitle = aniListMedia?.title.english || aniListMedia?.title.romaji || 'Manga';
    const cover = aniListMedia?.coverImage.extraLarge || aniListMedia?.coverImage.large || '';

    // Content Mapping: Resolve technical IDs
    let sourceId = initialSourceId;
    let technicalMangaId = anilistId;

    const mapping = await resolveMappingAction(anilistId, {
        english: aniListMedia?.title.english,
        romaji: aniListMedia?.title.romaji
    });

    if (mapping) {
        // PRIORITIZE: Last working source if it exists, otherwise the mapped source
        sourceId = mapping.lastWorkingSourceId || mapping.sourceId;
        technicalMangaId = mapping.mangaId;
    }

    // 3. Technical Data: Fetch images (Online attempt)
    let images: string[] = [];
    try {
        if (sourceId) {
            images = await ScraperEngine.getChapterImages(chapterId, sourceId);
        }

        // SERVER-SIDE SILENT FALLBACK
        if (images.length === 0) {
            console.log(`[ReadPage] Initial source ${sourceId} failed, attempting server-side fallback...`);
            const fallback = await ScraperEngine.getChapterImagesAuto(mangaTitle, chapterTitle || `Chapter ${chapterId}`, sourceId);

            if (fallback && fallback.images.length > 0) {
                images = fallback.images;
                sourceId = fallback.sourceId;
                technicalMangaId = fallback.mangaId;

                // Cache this working source
                await saveLastWorkingSourceAction(anilistId, sourceId);
                console.log(`[ReadPage] Server fallback SUCCESS on ${sourceId}`);
            }
        }
    } catch (e) {
        console.error('Failed to fetch images online, frontend will check offline cache:', e);
    }

    return (
        <main className="min-h-screen bg-black">
            <MangaReader
                images={images}
                chapterId={chapterId}
                mangaId={technicalMangaId}
                mangaTitle={mangaTitle}
                chapterTitle={chapterTitle || `Chapter ${chapterId}`}
                cover={cover}
                sourceId={sourceId || 'mangakakalot'}
                anilistId={anilistId}
            />

            {/* Comments Section */}
            <div className="relative z-10 pb-20 bg-gray-900">
                <CommentsSection mangaId={anilistId} chapterId={chapterId} />
            </div>
        </main>
    );
}


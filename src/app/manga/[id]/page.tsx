import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ScraperEngine } from '@/lib/scraper';
import { BookOpen, User as UserIcon } from 'lucide-react';
import { getProxyUrl } from '@/lib/utils';
import FavoriteButton from '@/components/FavoriteButton';
import SourceSwitcher from '@/components/SourceSwitcher';
import MangaChapterList from '@/components/MangaChapterList';

import { resolveMappingAction } from '@/app/actions';
import SourceMapper from '@/components/SourceMapper';
import { getMediaById } from '@/lib/anilist';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        sourceId?: string;
    }>;
}

export default async function MangaDetails({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { sourceId: initialSourceId } = await searchParams;

    let mangaId = id;
    let sourceId = initialSourceId;
    let mapping = null;
    let aniListMedia = null;

    // 1. Check if we're dealing with an AniList ID
    const isAniList = initialSourceId === 'anilist' || /^\d{3,}$/.test(id);

    if (isAniList) {
        // Fetch AniList metadata in parallel with potential mapping lookup
        [aniListMedia, mapping] = await Promise.all([
            getMediaById(id),
            resolveMappingAction(id, {}) // Fast lookup from Firestore
        ]);

        // If no mapping in Firestore, try to resolve using titles from AniList
        if (!mapping && aniListMedia) {
            mapping = await resolveMappingAction(id, {
                english: aniListMedia.title.english,
                romaji: aniListMedia.title.romaji,
                native: aniListMedia.title.native
            });
        }

        if (mapping) {
            mangaId = mapping.mangaId;
            sourceId = mapping.sourceId;
        }
    }

    // 2. Fetch technical data (chapters) from the scraper
    const data = await ScraperEngine.getMangaDetails(mangaId, sourceId);

    // 3. Fallback: If scraper fails but we have AniList metadata, show metadata + mapper
    if (!data) {
        return (
            <main className="min-h-screen bg-cloudy flex flex-col items-center justify-center text-white p-6 pb-20">
                <Navbar />

                {aniListMedia ? (
                    <div className="max-w-4xl w-full mt-24">
                        <div className="flex flex-col md:flex-row gap-12 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="flex-shrink-0 w-64 md:w-80 mx-auto md:mx-0">
                                <div className="aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-gray-800">
                                    <img src={getProxyUrl(aniListMedia.coverImage.extraLarge || aniListMedia.coverImage.large)} alt="" className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">{aniListMedia.title.english || aniListMedia.title.romaji}</h1>
                                <p className="text-gray-400 text-lg mb-8 line-clamp-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: aniListMedia.description || '' }} />

                                <div className="space-y-6 bg-purple-500/10 border border-purple-500/20 p-8 rounded-3xl backdrop-blur-md">
                                    <div className="flex items-center gap-3 text-purple-300 font-bold mb-2">
                                        <AlertCircle className="w-6 h-6" />
                                        <span className="text-xl">Reading Source Required</span>
                                    </div>
                                    <p className="text-gray-300">
                                        We couldn't automatically link this series to a reading source.
                                        Please use the search tool below to find and map the correct entry.
                                    </p>
                                    <SourceMapper anilistId={id} currentMapping={null} mangaTitle={aniListMedia.title.english || aniListMedia.title.romaji} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center max-w-lg bg-white/5 border border-white/10 p-12 rounded-3xl backdrop-blur-md">
                        <h1 className="text-6xl font-black mb-6 text-purple-500 italic">Oops!</h1>
                        <h2 className="text-2xl font-bold mb-4">Content Not Located</h2>
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            We couldn't resolve this entry to any content source. It may be too new or under a different name.
                        </p>
                        <div className="flex justify-center">
                            <SourceMapper anilistId={id} currentMapping={null} mangaTitle="this series" />
                        </div>
                    </div>
                )}

                <Link href="/browse" className="mt-12 text-gray-500 hover:text-white transition-colors flex items-center gap-2 font-bold">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Discovery
                </Link>
            </main>
        );
    }

    const { manga, chapters } = data;

    return (
        <main className="min-h-screen bg-cloudy text-gray-100 pb-20">
            <Navbar />

            {/* Backdrop / Header */}
            <div className="relative h-[60vh] w-full overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={getProxyUrl(manga.cover)}
                        alt=""
                        className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/80 to-slate-900" />
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-80 relative z-10">
                <div className="flex flex-col md:flex-row gap-12">
                    {/* Cover Image */}
                    <div className="flex-shrink-0 w-64 md:w-80 mx-auto md:mx-0">
                        <div className="aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-gray-800 transition-transform hover:scale-[1.02] duration-500">
                            <img
                                src={getProxyUrl(aniListMedia ? (aniListMedia.coverImage.extraLarge || aniListMedia.coverImage.large) : manga.cover)}
                                alt={aniListMedia ? (aniListMedia.title.english || aniListMedia.title.romaji) : manga.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-end pb-4 pt-4 md:pt-0">
                        <div className="flex flex-col gap-2 mb-6">
                            {isAniList && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Data Source Management</span>
                                    <SourceMapper anilistId={id} currentMapping={mapping} mangaTitle={manga.title} />
                                </div>
                            )}
                        </div>

                        <h1 className="text-4xl md:text-7xl font-black mb-6 text-white drop-shadow-2xl leading-[1.1] tracking-tight">
                            {aniListMedia ? (aniListMedia.title.english || aniListMedia.title.romaji) : manga.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-4 mb-10">
                            <FavoriteButton manga={manga} />

                            <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />

                            <div className="flex flex-wrap items-center gap-6 text-sm">
                                {manga.status && (
                                    <span className="bg-purple-600 px-4 py-1.5 rounded-xl text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-purple-900/20">
                                        {manga.status}
                                    </span>
                                )}
                                <div className="flex items-center text-gray-300 font-medium">
                                    <UserIcon className="w-4 h-4 mr-2 text-purple-400" />
                                    <span>{manga.author || 'Unknown Author'}</span>
                                </div>
                                <div className="flex items-center text-gray-300 font-medium">
                                    <BookOpen className="w-4 h-4 mr-2 text-purple-400" />
                                    <span>{chapters.length} Chapters</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass p-8 rounded-[2rem] leading-relaxed text-gray-300 text-lg max-w-4xl border-white/5 backdrop-blur-md">
                            <div
                                className="line-clamp-6 hover:line-clamp-none transition-all duration-500 cursor-pointer"
                                dangerouslySetInnerHTML={{ __html: aniListMedia?.description || manga.description || '' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-20">
                    <MangaChapterList
                        chapters={chapters}
                        manga={manga}
                        sourceId={sourceId || 'mangabuddy'}
                        headerExtras={
                            <div className="flex items-center gap-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest hidden md:block">
                                    Server Selection:
                                </p>
                                <SourceSwitcher currentSource={sourceId || 'mangabuddy'} mangaTitle={manga.title} />
                            </div>
                        }
                    />
                </div>
            </div>
        </main>
    );
}

import { ChevronLeft, AlertCircle } from 'lucide-react';

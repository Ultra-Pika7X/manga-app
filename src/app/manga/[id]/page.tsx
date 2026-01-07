import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ScraperEngine } from '@/lib/scraper';
import { BookOpen, User as UserIcon } from 'lucide-react';
import { getProxyUrl } from '@/lib/utils';
import FavoriteButton from '@/components/FavoriteButton';
import SourceSwitcher from '@/components/SourceSwitcher';
import MangaChapterList from '@/components/MangaChapterList';

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
    const { sourceId } = await searchParams;

    const data = await ScraperEngine.getMangaDetails(id, sourceId);

    if (!data) {
        return (
            <main className="min-h-screen bg-cloudy flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p>Manga not found or error fetching details from {sourceId || 'default source'}.</p>
                </div>
            </main>
        );
    }

    const { manga, chapters } = data;

    return (
        <main className="min-h-screen bg-cloudy text-gray-100 pb-20">
            <Navbar />

            {/* Backdrop / Header */}
            {/* Backdrop / Header */}
            <div className="relative h-[50vh] w-full overflow-hidden">
                <div className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={getProxyUrl(manga.cover)}
                        alt=""
                        className="w-full h-full object-cover blur-md opacity-50 scale-105"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900" />
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-64 relative z-10">
                <div className="flex flex-col md:flex-row gap-12">
                    {/* Cover Image */}
                    <div className="flex-shrink-0 w-64 md:w-80 mx-auto md:mx-0">
                        <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-gray-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getProxyUrl(manga.cover)}
                                alt={manga.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-end pb-4 pt-4 md:pt-0">
                        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-white drop-shadow-lg leading-tight">
                            {manga.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <FavoriteButton manga={manga} />

                            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300">
                                {manga.status && (
                                    <span className="bg-purple-600/80 px-3 py-1 rounded-full text-white font-semibold uppercase tracking-wide text-xs">
                                        {manga.status}
                                    </span>
                                )}
                                <div className="flex items-center">
                                    <UserIcon className="w-4 h-4 mr-2 text-purple-400" />
                                    <span>{manga.author || 'Unknown Author'}</span>
                                </div>
                                <div className="flex items-center">
                                    <BookOpen className="w-4 h-4 mr-2 text-purple-400" />
                                    <span>{chapters.length} Chapters</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-300 leading-relaxed text-lg max-w-4xl glass p-6 rounded-xl">
                            {manga.description}
                        </p>
                    </div>
                </div>

                <div className="mt-16">
                    <MangaChapterList
                        chapters={chapters}
                        manga={manga}
                        sourceId={sourceId || 'mangadex'}
                        headerExtras={
                            <div className="flex items-center gap-4">
                                <p className="text-sm text-gray-400 hidden md:block">
                                    Issues? Try another source:
                                </p>
                                <SourceSwitcher currentSource={sourceId || 'mangadex'} mangaTitle={manga.title} />
                            </div>
                        }
                    />
                </div>
            </div>
        </main>
    );
}

import Navbar from '@/components/Navbar';
import MangaCard from '@/components/MangaCard';
import { browseManga, convertAniListToManga } from '@/lib/anilist';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface PageProps {
    searchParams: Promise<{
        q?: string;
        sourceId?: string;
    }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams;
    const query = resolvedSearchParams.q || '';
    const sourceId = resolvedSearchParams.sourceId;

    // AniList as ONLY catalog: We search AniList, NOT scrapers
    const searchRes = query ? await browseManga({ search: query, perPage: 20 }) : { media: [] };
    const results = searchRes.media.map(convertAniListToManga);

    return (
        <main className="min-h-screen bg-cloudy pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 pt-32">
                <div className="mb-12">
                    <h1 className="text-4xl font-extrabold text-white mb-4">
                        {query ? (
                            <>
                                <span className="text-purple-400">AniList Catalog:</span> {query}
                            </>
                        ) : 'Discover Manga'}
                    </h1>
                    {sourceId && query && (
                        <p className="text-purple-300 text-sm mb-2">
                            Current Proxy: {sourceId.charAt(0).toUpperCase() + sourceId.slice(1)}
                        </p>
                    )}
                    {query && results.length > 0 && (
                        <p className="text-gray-400">Found {results.length} canonical titles</p>
                    )}
                </div>

                {results.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        {results.map((manga) => (
                            <MangaCard key={`anilist-${manga.id}`} manga={manga} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-20 text-center rounded-3xl shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600" />
                        <div className="relative z-10 max-w-md mx-auto">
                            <h2 className="text-2xl font-bold text-white mb-4">
                                {query ? "We couldn't find that on AniList" : "Ready to explore?"}
                            </h2>
                            <p className="text-gray-400 text-lg mb-8">
                                {query
                                    ? "Try different keywords. Remember, AniList is our primary catalog for tracking and discovery."
                                    : "Enter a title, author, or genre to start your journey."}
                            </p>

                            <form action="/search" className="relative">
                                {sourceId && <input type="hidden" name="sourceId" value={sourceId} />}
                                <input
                                    name="q"
                                    type="text"
                                    placeholder="Search AniList..."
                                    className="w-full bg-white/10 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <button type="submit" className="absolute right-2 top-2 bottom-2 px-6 bg-purple-600 rounded-lg text-white font-bold hover:bg-purple-500 transition-colors">
                                    Search
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

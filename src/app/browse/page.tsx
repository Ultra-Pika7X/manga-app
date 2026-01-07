import { browseManga, getGenres, convertAniListToManga, BrowseOptions } from '@/lib/anilist';
import Navbar from '@/components/Navbar';
import MangaCard from '@/components/MangaCard';
import BrowseFilters from '@/components/BrowseFilters';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
    searchParams: Promise<{
        sort?: string;
        genres?: string;
        status?: string;
        q?: string;
        page?: string;
        season?: string;
        seasonYear?: string;
    }>;
}

export default async function BrowsePage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = parseInt(params.page || '1');
    const perPage = 20;

    const options: BrowseOptions = {
        page,
        perPage,
        sort: params.sort ? [params.sort] : ['TRENDING_DESC', 'POPULARITY_DESC'],
        genres: params.genres ? params.genres.split(',') : undefined,
        status: params.status,
        search: params.q,
        season: params.season,
        seasonYear: params.seasonYear ? parseInt(params.seasonYear) : undefined,
    };

    // Parallel fetch: Genres (cached for 24h) and Browse results
    const [genres, result] = await Promise.all([
        getGenres(),
        browseManga(options)
    ]);

    const { pageInfo, media } = result;
    const mangaResults = media.map(convertAniListToManga);

    // Filter sub-title logic
    let subTitle = "Discover your next favorite series";
    if (params.q) subTitle = `Search results for "${params.q}"`;
    else if (params.season) subTitle = `${params.season} ${params.seasonYear} Releases`;
    else if (params.sort === 'POPULARITY_DESC') subTitle = "Most Popular of All Time";
    else if (params.sort === 'TRENDING_DESC') subTitle = "What's Trending Now";

    // Pagination Helper
    const createPageUrl = (newPage: number) => {
        const query = new URLSearchParams();
        if (params.sort) query.set('sort', params.sort);
        if (params.genres) query.set('genres', params.genres);
        if (params.status) query.set('status', params.status);
        if (params.q) query.set('q', params.q);
        if (params.season) query.set('season', params.season);
        if (params.seasonYear) query.set('seasonYear', params.seasonYear);
        query.set('page', newPage.toString());
        return `/browse?${query.toString()}`;
    };

    return (
        <main className="min-h-screen bg-cloudy pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 pt-32">
                <header className="mb-12">
                    <h1 className="text-4xl font-extrabold text-white mb-2">
                        Browse <span className="text-purple-400">Manga</span>
                    </h1>
                    <p className="text-gray-400 font-medium">{subTitle}</p>
                </header>

                <BrowseFilters genres={genres} />

                <div className="mt-12">
                    {mangaResults.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                                {mangaResults.map((manga, idx) => (
                                    <div key={`${manga.id}-${idx}`} className="animation-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                                        <MangaCard manga={manga} />
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            <div className="mt-16 flex items-center justify-center gap-4">
                                {page > 1 && (
                                    <Link
                                        href={createPageUrl(page - 1)}
                                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all border border-white/10"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        <span>Previous</span>
                                    </Link>
                                )}

                                <div className="px-6 py-3 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-300 font-bold">
                                    Page {page} of {pageInfo.lastPage}
                                </div>

                                {pageInfo.hasNextPage && (
                                    <Link
                                        href={createPageUrl(page + 1)}
                                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all border border-white/10"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="w-5 h-5" />
                                    </Link>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="bg-white/5 border border-white/10 p-20 text-center rounded-3xl">
                            <h2 className="text-2xl font-bold text-white mb-2">No results found</h2>
                            <p className="text-gray-400">Try adjusting your filters or search query.</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

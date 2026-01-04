import Navbar from '@/components/Navbar';
import MangaCard from '@/components/MangaCard';
import { ScraperEngine } from '@/lib/scraper';

interface PageProps {
    searchParams: {
        q?: string;
        sourceId?: string;
    }
}

export default async function SearchPage({ searchParams }: PageProps) {
    const query = searchParams.q || '';
    const sourceId = searchParams.sourceId;
    const results = query ? await ScraperEngine.search(query, sourceId) : [];

    return (
        <main className="min-h-screen bg-cloudy pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 pt-32">
                <div className="mb-12">
                    <h1 className="text-4xl font-extrabold text-white mb-4">
                        {query ? (
                            <>
                                <span className="text-purple-400">Results for:</span> {query}
                            </>
                        ) : 'Discover Manga'}
                    </h1>
                    {query && results.length > 0 && (
                        <p className="text-gray-400">Found {results.length} amazing titles</p>
                    )}
                </div>

                {results.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        {results.map((manga) => (
                            <MangaCard key={manga.id} manga={manga} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-20 text-center rounded-3xl shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600" />
                        <div className="relative z-10 max-w-md mx-auto">
                            <h2 className="text-2xl font-bold text-white mb-4">
                                {query ? "We couldn't find that" : "Ready to explore?"}
                            </h2>
                            <p className="text-gray-400 text-lg mb-8">
                                {query
                                    ? "Try different keywords or check if the title is spelled correctly."
                                    : "Enter a title, author, or genre to start your journey."}
                            </p>
                            <form action="/search" className="relative">
                                <input
                                    name="q"
                                    type="text"
                                    placeholder="Search again..."
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

import Navbar from '@/components/Navbar';
import MangaCard from '@/components/MangaCard';
import { MangaDex } from '@/lib/scraper';

interface PageProps {
    searchParams: {
        q?: string;
    }
}

export default async function SearchPage({ searchParams }: PageProps) {
    const query = searchParams.q || '';
    const results = query ? await MangaDex.search(query) : [];

    return (
        <main className="min-h-screen bg-cloudy pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 pt-32">
                <h1 className="text-3xl font-bold text-white mb-8">
                    {query ? `Search results for "${query}"` : 'Search'}
                </h1>

                {results.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {results.map((manga) => (
                            <MangaCard key={manga.id} manga={manga} />
                        ))}
                    </div>
                ) : (
                    <div className="glass p-12 text-center rounded-xl">
                        <p className="text-gray-400 text-lg">
                            {query ? 'No results found.' : 'Enter a search term to find manga.'}
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}

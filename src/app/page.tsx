import Navbar from '@/components/Navbar';
import BannerCarousel from '@/components/BannerCarousel';
import MangaCard from '@/components/MangaCard';
import { MangaDex } from '@/lib/scraper';

export default async function Home() {
  // Fetch data on the server
  // Define a larger list of popular manga for the banner (approx 10-12)
  const bannerQueries = [
    'chainsaw man',
    'one piece',
    'jujutsu kaisen',
    'spy x family',
    'blue lock',
    'my hero academia',
    'berserk',
    'vinland saga',
    'vagabond',
    'dandadan',
    'sakamoto days',
    'kaiju no 8'
  ];

  // Fetch all queries in parallel
  const bannerResults = await Promise.all(
    bannerQueries.map(q => MangaDex.search(q))
  );

  // Flatten and take the first valid result from each search
  const bannerManga = bannerResults
    .map(res => res[0])
    .filter(Boolean)
    .slice(0, 10); // Ensure we have exactly 10 or close to it

  // Reuse some for the "Popular Now" grid if needed, or fetch distinct ones
  // For now, let's show the same ones in the grid plus maybe a few others if we had more sources
  const gridManga = bannerManga;

  return (
    <main className="min-h-screen bg-cloudy pb-20">
      <Navbar />

      <BannerCarousel mangaList={bannerManga} />

      <section className="max-w-7xl mx-auto px-6 mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white relative pl-4">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-full" />
            Popular Now
          </h2>
          <a href="/popular" className="text-sm text-purple-300 hover:text-white transition-colors">View All</a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {gridManga.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-12 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white relative pl-4">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-full" />
            Latest Updates
          </h2>
          <a href="/latest" className="text-sm text-blue-300 hover:text-white transition-colors">View All</a>
        </div>
        <div className="p-10 text-center glass rounded-xl">
          <p className="text-gray-400">Latest updates feed coming soon...</p>
        </div>
      </section>
    </main>
  );
}


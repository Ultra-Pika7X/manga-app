import Navbar from '@/components/Navbar';
import BannerCarousel from '@/components/BannerCarousel';
import MangaRow from '@/components/MangaRow';
import ContinueReading from '@/components/ContinueReading';
import { ScraperEngine } from '@/lib/scraper';

export default async function Home() {
  // Fetch content in parallel
  // 1. Updates
  // 2. Featured (Top hits)

  const featuredTitles = ["One Piece", "Jujutsu Kaisen", "Chainsaw Man", "Boruto", "Spy x Family"];

  const [updates, ...featuredResults] = await Promise.all([
    ScraperEngine.getUpdates('mangaplus').catch(() => []),
    ...featuredTitles.map(title => ScraperEngine.search(title, 'mangaplus').then(res => res[0]).catch(() => null))
  ]);

  const featuredManga = featuredResults.filter(m => m !== null) as any[];

  return (
    <main className="min-h-screen bg-cloudy pb-20">
      <Navbar />

      {featuredManga.length > 0 && <BannerCarousel mangaList={featuredManga} />}

      <ContinueReading />

      <div className="px-4 md:px-8 mt-8">
        <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">Latest Updates</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {updates.map((manga) => (
            <div key={manga.id} className="bg-glass-dark p-3 rounded-xl hover:scale-105 transition-transform duration-300">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                <img src={manga.cover} alt={manga.title} className="object-cover w-full h-full" />
                <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
                  UP
                </div>
              </div>
              <h3 className="text-white font-semibold truncate">{manga.title}</h3>
              <p className="text-gray-400 text-xs">{manga.sourceId}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer for bottom nav if mobile */}
      <div className="h-12 md:h-0" />
    </main>
  );
}



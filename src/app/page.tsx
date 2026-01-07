import Navbar from '@/components/Navbar';
import BannerCarousel from '@/components/BannerCarousel';
import MangaRow from '@/components/MangaRow';
import ContinueReading from '@/components/ContinueReading';
import { browseManga, getRecommendations, convertAniListToManga } from '@/lib/anilist';
import { getVerifiedUpdates } from './actions';

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'SPRING';
  if (month >= 5 && month <= 7) return 'SUMMER';
  if (month >= 8 && month <= 10) return 'FALL';
  return 'WINTER';
}

export default async function Home() {
  const season = getCurrentSeason();
  const year = new Date().getFullYear();

  // Fetch all rows in parallel
  const [trendingRes, popularRes, seasonRes, updatedManga, topRatedRes, recRes] = await Promise.all([
    browseManga({ sort: ['TRENDING_DESC'], perPage: 10 }),
    browseManga({ sort: ['POPULARITY_DESC'], perPage: 15 }),
    browseManga({ season, seasonYear: year, sort: ['POPULARITY_DESC'], perPage: 10 }),
    getVerifiedUpdates(),
    browseManga({ sort: ['SCORE_DESC'], perPage: 10 }),
    getRecommendations(1, 10)
  ]);

  const trendingManga = trendingRes.media.map(convertAniListToManga);
  const popularManga = popularRes.media.map(convertAniListToManga);
  const seasonManga = seasonRes.media.map(convertAniListToManga);
  // updatedManga is already converted by the action
  const topRatedManga = topRatedRes.media.map(convertAniListToManga);
  const recManga = recRes.map(convertAniListToManga);

  return (
    <main className="min-h-screen bg-cloudy pb-20">
      <Navbar />

      <BannerCarousel mangaList={trendingManga.slice(0, 5)} />

      <ContinueReading />

      <MangaRow
        title="Trending Now"
        mangaList={trendingManga}
        viewAllLink="/browse?sort=TRENDING_DESC"
        color="purple"
      />

      <MangaRow
        title="Popular This Season"
        mangaList={seasonManga}
        viewAllLink={`/browse?sort=POPULARITY_DESC&season=${season}&year=${year}`}
        color="green"
      />

      <MangaRow
        title="Recommended for You"
        mangaList={recManga}
        viewAllLink="/browse"
        color="orange"
      />

      <MangaRow
        title="Recently Updated"
        mangaList={updatedManga}
        viewAllLink="/browse?sort=UPDATED_AT_DESC"
        color="blue"
      />

      <MangaRow
        title="Top Rated"
        mangaList={topRatedManga}
        viewAllLink="/browse?sort=SCORE_DESC"
        color="pink"
      />

      {/* Spacer for bottom nav if mobile */}
      <div className="h-12 md:h-0" />
    </main>
  );
}



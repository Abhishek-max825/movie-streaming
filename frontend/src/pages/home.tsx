import { useState, useEffect } from 'react';
import Head from 'next/head';
import { searchContent, getMeta } from '@/services/apiClient';
import type { Post } from '@/types/api';
import { Hero } from '@/components/layout/Hero';
import { Row } from '@/components/layout/Row';
import { SkeletonHero } from '@/components/layout/SkeletonHero';
import { SkeletonRow } from '@/components/layout/SkeletonRow';

// Simple in-memory cache to prevent redundant scrapes on every mount
const HOME_CACHE: {
  data: any | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function Home() {
  const [heroMovie, setHeroMovie] = useState<Post | null>(null);
  const [heroDescription, setHeroDescription] = useState<string>("");
  const [trending, setTrending] = useState<Post[]>([]);
  const [actionMovies, setActionMovies] = useState<Post[]>([]);
  const [scifiMovies, setScifiMovies] = useState<Post[]>([]);
  const [animeMovies, setAnimeMovies] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [seriesList, setSeriesList] = useState<Post[]>([]); // New State
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (HOME_CACHE.data && (Date.now() - HOME_CACHE.timestamp < CACHE_DURATION)) {
        const { heroMovie, heroDescription, trending, actionMovies, scifiMovies, animeMovies, seriesList } = HOME_CACHE.data;
        setHeroMovie(heroMovie);
        setHeroDescription(heroDescription);
        setTrending(trending);
        setActionMovies(actionMovies);
        setScifiMovies(scifiMovies);
        setAnimeMovies(animeMovies);
        setSeriesList(seriesList || []);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const trendData = await searchContent('2024');

        if (trendData && trendData.length > 0) {
          const firstHero = trendData[0];
          setHeroMovie(firstHero);
          setTrending(trendData.slice(1));

          getMeta(firstHero.link).then(info => {
            if (info.synopsis) setHeroDescription(info.synopsis);
          }).catch(e => console.error("Hero meta fetch failed", e));
        }

        setIsLoading(false);

        Promise.all([
          // existing movies
          searchContent('Action'),
          searchContent('Avatar'),
          searchContent('Avengers'),
          searchContent('Harry Potter'),
          searchContent('Star Wars'),
          searchContent('Marvel'),
          searchContent('Dune'),

          // Series
          searchContent('Breaking Bad'),
          searchContent('Stranger Things'),
          searchContent('Money Heist'),
          searchContent('Game of Thrones'),
          searchContent('Season'), // Generic season search

          // Anime
          searchContent('Anime'),
          searchContent('One Piece'),
          searchContent('Demon Slayer'),
          searchContent('Naruto'),
          searchContent('Jujutsu Kaisen')

        ]).then(([
          actionData,
          avatarData, avengersData, harryPotterData, starWarsData, marvelData, duneData,
          breakingBad, strangerThings, moneyHeist, got, seasonGeneric,
          animeGeneric, onePiece, demonSlayer, naruto, jjk
        ]) => {

          // Process Sci-Fi
          const allScifi = [
            ...(avatarData || []),
            ...(avengersData || []),
            ...(harryPotterData || []),
            ...(starWarsData || []),
            ...(marvelData || []),
            ...(duneData || [])
          ];
          const uniqueScifi = Array.from(new Map(allScifi.map(item => [item.link, item])).values());
          const shuffledScifi = uniqueScifi.sort(() => 0.5 - Math.random());

          // Process Series
          const allSeries = [
            ...(breakingBad || []),
            ...(strangerThings || []),
            ...(moneyHeist || []),
            ...(got || []),
            ...(seasonGeneric || [])
          ];
          const uniqueSeries = Array.from(new Map(allSeries.map(item => [item.link, item])).values());
          const shuffledSeries = uniqueSeries.sort(() => 0.5 - Math.random());

          // Process Anime
          const allAnime = [
            ...(animeGeneric || []),
            ...(onePiece || []),
            ...(demonSlayer || []),
            ...(naruto || []),
            ...(jjk || [])
          ];
          const uniqueAnime = Array.from(new Map(allAnime.map(item => [item.link, item])).values());
          const shuffledAnime = uniqueAnime.sort(() => 0.5 - Math.random());


          setActionMovies(actionData || []);
          setScifiMovies(shuffledScifi);
          setAnimeMovies(shuffledAnime);
          setSeriesList(shuffledSeries);

          HOME_CACHE.data = {
            heroMovie: trendData[0],
            heroDescription: "",
            trending: trendData.slice(1),
            actionMovies: actionData || [],
            scifiMovies: shuffledScifi,
            animeMovies: shuffledAnime,
            seriesList: shuffledSeries
          };
          HOME_CACHE.timestamp = Date.now();
        }).catch(e => console.error("Secondary fetch failed", e));

      } catch (err) {
        console.error("Failed to fetch movies", err);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (!mounted || !heroMovie) {
    return (
      <div className="bg-[#141414] min-h-screen pb-20 overflow-hidden">
        <SkeletonHero />
        <div className="relative z-10 mt-8 space-y-4">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>BBHC Theatre - Watch Movies & Series</title>
      </Head>

      <div className="bg-[#141414] min-h-screen pb-20 overflow-x-hidden">
        {/* Main Content Container */}
        <Hero post={heroMovie} description={heroDescription} />

        <div className="relative z-10 mt-6 sm:mt-12 space-y-8 md:space-y-12 pb-12">
          {/* Rows container with proper spacing from hero. 
              Removed negative margin to ensure "Trending Now" is distinct. 
          */}
          <div className="relative z-20 px-4 md:px-12">
            <Row title="Trending Now" movies={trending} />
            <Row title="Binge-Worthy Series" movies={seriesList} />
            <Row title="Hit Anime" movies={animeMovies} />
            <Row title="Action Movies" movies={actionMovies} />
            <Row title="Sci-Fi & Fantasy" movies={scifiMovies} />
          </div>
        </div>
      </div>
    </>
  );
}

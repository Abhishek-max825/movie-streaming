import { useState, useEffect } from 'react';
import Head from 'next/head';
import { searchContent } from '@/services/apiClient';
import type { Post } from '@/types/api';
import { Hero } from '@/components/layout/Hero';
import { Row } from '@/components/layout/Row';
import { SkeletonHero } from '@/components/layout/SkeletonHero';
import { SkeletonRow } from '@/components/layout/SkeletonRow';

export default function Movies() {
    const [heroMovie, setHeroMovie] = useState<Post | null>(null);
    const [trending, setTrending] = useState<Post[]>([]);
    const [actionMovies, setActionMovies] = useState<Post[]>([]);
    const [horrorMovies, setHorrorMovies] = useState<Post[]>([]);
    const [comedyMovies, setComedyMovies] = useState<Post[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Critical Path: Get a Hero
                const trendData = await searchContent('2024');

                if (trendData && trendData.length > 0) {
                    setHeroMovie(trendData[0]);
                    // The instruction removes setTrending, but it's used later.
                    // Keeping it for now, as the instruction only specified removing it from the snippet.
                    // If the intent was to remove it entirely, it would need to be removed from the Row component as well.
                    setTrending(trendData.slice(1));
                }

                // 2. Secondary: Fetch everything else
                Promise.all([
                    // Action
                    searchContent('Action'),

                    // Horror (Aggregate)
                    searchContent('Horror'),
                    searchContent('Conjuring'),
                    searchContent('Insidious'),
                    searchContent('Evil Dead'),
                    searchContent('Saw'),
                    searchContent('Nun'),

                    // Comedy (Aggregate)
                    searchContent('Comedy'),
                    searchContent('Deadpool'),
                    searchContent('Hangover'),
                    searchContent('Jumanji'),
                    searchContent('Mask')
                ]).then(([
                    actionData,
                    horrorGeneric, horrorConjuring, horrorInsidious, horrorEvilDead, horrorSaw, horrorNun,
                    comedyGeneric, comedyDeadpool, comedyHangover, comedyJumanji, comedyMask
                ]) => {

                    // Process Action
                    if (actionData) setActionMovies(actionData);

                    // Process Horror
                    const allHorror = [
                        ...(horrorGeneric || []),
                        ...(horrorConjuring || []),
                        ...(horrorInsidious || []),
                        ...(horrorEvilDead || []),
                        ...(horrorSaw || []),
                        ...(horrorNun || [])
                    ];
                    const uniqueHorror = Array.from(new Map(allHorror.map(item => [item.link, item])).values());
                    setHorrorMovies(uniqueHorror);

                    // Process Comedy  
                    const allComedy = [
                        ...(comedyGeneric || []),
                        ...(comedyDeadpool || []),
                        ...(comedyHangover || []),
                        ...(comedyJumanji || []),
                        ...(comedyMask || [])
                    ];
                    const uniqueComedy = Array.from(new Map(allComedy.map(item => [item.link, item])).values());
                    setComedyMovies(uniqueComedy);

                }).catch(e => console.error("Secondary movies fetch failed", e));

            } catch (err) {
                console.error("Failed to fetch movies", err);
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
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Movies - BBHC Theatre</title>
            </Head>

            <div className="bg-[#141414] min-h-screen pb-20">
                <Hero post={heroMovie} />

                <div className="relative z-10 mt-8 space-y-4">
                    <Row title="Trending Movies" movies={trending} />
                    <Row title="Action & Adventure" movies={actionMovies} />
                    <Row title="Horror" movies={horrorMovies} />
                    <Row title="Comedy" movies={comedyMovies} />
                </div>
            </div>
        </>
    );
}

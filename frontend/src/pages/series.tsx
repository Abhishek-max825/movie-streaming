import { useState, useEffect } from 'react';
import Head from 'next/head';
import { searchContent } from '@/services/apiClient';
import type { Post } from '@/types/api';
import { Hero } from '@/components/layout/Hero';
import { Row } from '@/components/layout/Row';
import { SkeletonHero } from '@/components/layout/SkeletonHero';
import { SkeletonRow } from '@/components/layout/SkeletonRow';

export default function Series() {
    const [heroSeries, setHeroSeries] = useState<Post | null>(null);
    const [popularSeries, setPopularSeries] = useState<Post[]>([]);
    const [newEpisodes, setNewEpisodes] = useState<Post[]>([]);
    const [animeSeries, setAnimeSeries] = useState<Post[]>([]);
    const [scifiSeries, setScifiSeries] = useState<Post[]>([]);
    const [crimeSeries, setCrimeSeries] = useState<Post[]>([]);
    const [comedySeries, setComedySeries] = useState<Post[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Critical Path: Get a Hero (using 'Wednesday' as anchor)
                const wednesdayData = await searchContent('Wednesday');

                if (wednesdayData && wednesdayData.length > 0) {
                    setHeroSeries(wednesdayData[0]);
                }

                // 2. PHASE 1: Critical Rows (Popular & New Episodes)
                // Fetch these immediately to fill the top of the screen
                const [
                    st1, st2, st3, st4, st5,
                    breakingBad,
                    moneyHeist,
                    aliceInBorderland,
                    seasonData
                ] = await Promise.all([
                    searchContent('Stranger Things Season 1'),
                    searchContent('Stranger Things Season 2'),
                    searchContent('Stranger Things Season 3'),
                    searchContent('Stranger Things Season 4'),
                    searchContent('Stranger Things Season 5'),
                    searchContent('Breaking Bad'),
                    searchContent('Money Heist'),
                    searchContent('Alice in Borderland'),
                    searchContent('Season')
                ]);

                // Helper to deduplicate and merge
                const mergeUnique = (lists: (Post[] | undefined)[], limit = 20) => {
                    const allItems = lists.flat().filter((item): item is Post => !!item);
                    return Array.from(new Map(allItems.map(item => [item.link, item])).values()).slice(0, limit);
                };

                const pickOne = (list: Post[] | undefined) => list && list.length > 0 ? list[0] : null;

                // Process Phase 1 Data
                const popularPool = [
                    ...(st1 || []),
                    ...(st2 || []),
                    ...(st3 || []),
                    ...(st4 || []),
                    ...(st5 || []),
                    ...(breakingBad || []),
                    ...(wednesdayData || []),
                    ...(moneyHeist || []),
                    ...(aliceInBorderland || [])
                ];

                const uniquePopular = mergeUnique([popularPool]);

                if (uniquePopular.length > 0) {
                    setPopularSeries(uniquePopular);
                }

                if (seasonData) setNewEpisodes(seasonData);


                // 3. PHASE 2: Deferred Content (Below the fold)
                // Fetch these in the background so user can start browsing immediately
                Promise.all([
                    // Anime
                    searchContent('Anime Series'),

                    // Sci-Fi & Fantasy
                    searchContent('House of the Dragon'),
                    searchContent('The Witcher'),
                    searchContent('The Last of Us'),
                    searchContent('Dark'),
                    searchContent('Black Mirror'),
                    searchContent('Mandalorian'),
                    searchContent('Andor'),
                    searchContent('Fallout'),
                    searchContent('Severance'),
                    searchContent('Silo'),
                    searchContent('3 Body Problem'),
                    searchContent('Altered Carbon'),
                    searchContent('Love Death Robots'),
                    searchContent('Arcane'),
                    searchContent('Foundation'),
                    searchContent('Westworld'),
                    searchContent('The Expanse'),
                    searchContent('Lost in Space'),

                    // Crime & Thrillers
                    searchContent('Peaky Blinders'),
                    searchContent('Sherlock'),
                    searchContent('Better Call Saul'),
                    searchContent('True Detective'),
                    searchContent('Mindhunter'),
                    searchContent('Narcos'),
                    searchContent('Ozark'),
                    searchContent('Reacher'),
                    searchContent('Fargo'),
                    searchContent('The Wire'),
                    searchContent('Dexter'),
                    searchContent('Hannibal'),
                    searchContent('Luther'),
                    searchContent('The Blacklist'),
                    searchContent('Mare of Easttown'),
                    searchContent('Broadchurch'),
                    searchContent('Bosch'),

                    // Comedy Favorites
                    searchContent('Friends'),
                    searchContent('The Office'),
                    searchContent('Brooklyn Nine-Nine'),
                    searchContent('Big Bang Theory'),
                    searchContent('Modern Family'),
                    searchContent('How I Met Your Mother'),
                    searchContent('Parks and Recreation'),
                    searchContent('Seinfeld'),
                    searchContent('Ted Lasso'),
                    searchContent('Rick and Morty'),
                    searchContent('Arrested Development'),
                    searchContent('Curb Your Enthusiasm'),
                    searchContent('It\'s Always Sunny'),
                    searchContent('Schitt\'s Creek'),
                    searchContent('The Good Place'),
                    searchContent('Community'),
                    searchContent('30 Rock'),
                    searchContent('Scrubs'),
                    searchContent('New Girl'),
                    searchContent('Silicon Valley'),
                    searchContent('Fleabag'),
                    searchContent('Two and a Half Men'),
                    searchContent('Veep'),
                    searchContent('Frasier'),
                    searchContent('Cheers'),
                    searchContent('Will and Grace'),
                    searchContent('Everybody Loves Raymond'),
                    searchContent('King of Queens'),
                    searchContent('That 70s Show'),
                    searchContent('Fresh Prince'),
                    searchContent('Family Guy'),
                    searchContent('South Park'),
                    searchContent('American Dad'),
                    searchContent('Bob\'s Burgers'),
                    searchContent('Futurama'),
                    searchContent('Comedy'),
                    searchContent('Sitcom')
                ]).then(([
                    animeData,
                    hotd, witcher, lastOfUs, dark, blackMirror, mandalorian, andor, fallout, severance, silo, threeBody, altered, ldr, arcane, foundation, westworld, expanse, lostSpace,
                    peaky, sherlock, bcs, trueDet, mindhunter, narcos, ozark, reacher, fargo, wire, dexter, hannibal, luther, blacklist, mare, broadchurch, bosch,
                    friends, office, b99, bbt, modernFamily, himym, parks, seinfeld, tedLasso, rickMorty, arrested, curb, sunny, schitts, goodPlace, community, thirtyRock, scrubs, newGirl, silicon, fleabag, twoHalf, veep, frasier, cheers, willGrace, raymond, queens, that70s, freshPrince, familyGuy, southPark, americanDad, bobs, futurama, comedy, sitcom
                ]) => {

                    // Update Anime
                    if (animeData) setAnimeSeries(animeData);

                    // Update Sci-Fi
                    const allScifi = [
                        pickOne(hotd),
                        pickOne(witcher),
                        pickOne(lastOfUs),
                        pickOne(dark),
                        pickOne(blackMirror),
                        pickOne(mandalorian),
                        pickOne(andor),
                        pickOne(fallout),
                        pickOne(severance),
                        pickOne(silo),
                        pickOne(threeBody),
                        pickOne(altered),
                        pickOne(ldr),
                        pickOne(arcane),
                        pickOne(foundation),
                        pickOne(westworld),
                        pickOne(expanse),
                        pickOne(lostSpace)
                    ].filter((item): item is Post => !!item);
                    setScifiSeries(allScifi);

                    // Update Crime
                    const allCrime = [
                        pickOne(peaky),
                        pickOne(sherlock),
                        pickOne(bcs),
                        pickOne(trueDet),
                        pickOne(mindhunter),
                        pickOne(narcos),
                        pickOne(ozark),
                        pickOne(reacher),
                        pickOne(fargo),
                        pickOne(wire),
                        pickOne(dexter),
                        pickOne(hannibal),
                        pickOne(luther),
                        pickOne(blacklist),
                        pickOne(mare),
                        pickOne(broadchurch),
                        pickOne(bosch)
                    ].filter((item): item is Post => !!item);
                    setCrimeSeries(allCrime);

                    // Update Comedy
                    const allComedy = [
                        pickOne(friends),
                        pickOne(office),
                        pickOne(b99),
                        pickOne(bbt),
                        pickOne(modernFamily),
                        pickOne(himym),
                        pickOne(parks),
                        pickOne(seinfeld),
                        pickOne(tedLasso),
                        pickOne(rickMorty),
                        pickOne(arrested),
                        pickOne(curb),
                        pickOne(sunny),
                        pickOne(schitts),
                        pickOne(goodPlace),
                        pickOne(community),
                        pickOne(thirtyRock),
                        pickOne(scrubs),
                        pickOne(newGirl),
                        pickOne(silicon),
                        pickOne(fleabag),
                        pickOne(twoHalf),
                        pickOne(veep),
                        pickOne(frasier),
                        pickOne(cheers),
                        pickOne(willGrace),
                        pickOne(raymond),
                        pickOne(queens),
                        pickOne(that70s),
                        pickOne(freshPrince),
                        pickOne(familyGuy),
                        pickOne(southPark),
                        pickOne(americanDad),
                        pickOne(bobs),
                        pickOne(futurama),
                        ...(comedy || []),
                        ...(sitcom || [])
                    ].filter((item): item is Post => !!item);
                    setComedySeries(allComedy);

                }).catch(e => console.error("Secondary series fetch failed", e));

            } catch (err) {
                console.error("Failed to fetch series", err);
            }
        };

        fetchData();
    }, []);

    if (!mounted || !heroSeries) {
        return (
            <div className="bg-[#141414] min-h-screen pb-20 overflow-hidden">
                <SkeletonHero />
                <div className="relative z-10 mt-8 space-y-4">
                    <SkeletonRow />
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
                <title>Series - BBHC Theatre</title>
            </Head>

            <div className="bg-[#141414] min-h-screen pb-20">
                <Hero post={heroSeries} />

                <div className="relative z-10 mt-8 space-y-4">
                    <Row title="Popular Series" movies={popularSeries} />
                    <Row title="New Episodes" movies={newEpisodes} />
                    <Row title="Sci-Fi & Fantasy" movies={scifiSeries} />
                    <Row title="Crime & Thrillers" movies={crimeSeries} />
                    <Row title="Comedy Favorites" movies={comedySeries} />
                    <Row title="Anime Series" movies={animeSeries} />
                </div>
            </div>
        </>
    );
}

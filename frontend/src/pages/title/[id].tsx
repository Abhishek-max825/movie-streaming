import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { getMeta } from '@/services/apiClient';
import type { Info } from '@/types/api';
import { Play, Star, Calendar, Clock, Film, ChevronLeft, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';

export default function TitleDetails() {
    const router = useRouter();
    const { id } = router.query;

    const [meta, setMeta] = useState<Info | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        const fetchMeta = async () => {
            try {
                const link = decodeURIComponent(id as string);
                const data = await getMeta(link);
                setMeta(data);
            } catch (err) {
                setError('Failed to load details.');
            } finally {
                setLoading(false);
            }
        };

        fetchMeta();
    }, [id]);

    const handlePlay = async (link: string, type: string, nextEpisode?: { link: string; title: string }) => {
        const query: any = {
            link: encodeURIComponent(link),
            type,
            duration: meta?.duration,
            seriesId: encodeURIComponent(id as string)
        };

        if (nextEpisode) {
            query.nextLink = encodeURIComponent(nextEpisode.link);
            query.nextTitle = encodeURIComponent(nextEpisode.title);
        }

        router.push({
            pathname: '/player',
            query,
        });
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-red-500 font-black tracking-widest bg-[#141414] animate-pulse">LOADING...</div>;
    if (error) return <div className="flex h-screen items-center justify-center text-red-500 font-bold bg-[#141414]">{error}</div>;
    if (!meta) return null;

    return (
        <>
            <Head>
                <title>{meta.title} - BBHC Theatre</title>
            </Head>

            <div className="relative min-h-screen bg-[#141414] text-white overflow-x-hidden">
                {/* Full Screen Ambient Backdrop */}
                <div className="absolute inset-0 min-h-screen w-full overflow-hidden pointer-events-none">
                    <motion.img
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1.1, opacity: 0.2 }}
                        transition={{ duration: 2 }}
                        src={meta.image}
                        alt=""
                        className="h-full w-full object-cover blur-3xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-black/60" />

                    {/* Pulsing Ambient Aura */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-[120px] animate-pulse delay-700" />
                </div>

                <div className="relative z-10 container mx-auto px-4 pt-24 pb-20">
                    <motion.button
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        onClick={() => router.back()}
                        className="mb-8 flex items-center gap-2 text-zinc-400 hover:text-white transition group"
                    >
                        <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold uppercase tracking-widest">Back</span>
                    </motion.button>

                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
                        {/* 3D Poster Card */}
                        <div className="shrink-0 w-full max-w-sm mx-auto lg:mx-0 perspective-1000">
                            <TiltCard image={meta.image} title={meta.title} />
                        </div>

                        <div className="flex-1 space-y-8 w-full">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-6"
                            >
                                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[1.1] break-words">
                                    {meta.title}
                                </h1>

                                <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
                                    {meta.imdbId && (
                                        <div className="flex items-center gap-1.5 bg-[#f5c518] text-black px-3 py-1 rounded-md shadow-[0_0_15px_rgba(245,197,24,0.3)]">
                                            <Star className="h-4 w-4 fill-current" />
                                            <span>IMDb</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 bg-zinc-800/80 text-zinc-200 px-3 py-1 rounded-md border border-zinc-700 backdrop-blur-md">
                                        <Calendar className="h-4 w-4" />
                                        <span>2024</span>
                                    </div>
                                    {meta.duration && (
                                        <div className="flex items-center gap-1.5 bg-zinc-800/80 text-zinc-200 px-3 py-1 rounded-md border border-zinc-700 backdrop-blur-md">
                                            <Clock className="h-4 w-4" />
                                            <span>{meta.duration}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 bg-red-600/10 text-red-500 px-3 py-1 rounded-md border border-red-600/30 uppercase tracking-widest">
                                        <Film className="h-4 w-4" />
                                        <span>{meta.type}</span>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-4 max-w-4xl"
                            >
                                <h4 className="text-zinc-500 font-bold uppercase tracking-widest text-xs flex items-center gap-4">
                                    Overview
                                    <div className="h-[1px] flex-1 bg-zinc-800/50"></div>
                                </h4>
                                <p className="text-lg leading-relaxed text-zinc-300 drop-shadow-md">
                                    {meta.synopsis || 'Experience this incredible title with high-quality streaming on BBHC Theatre.'}
                                </p>
                            </motion.div>

                            <div className="space-y-8 pt-6 border-t border-zinc-800/50">
                                {meta.type === 'series' && meta.seasons && meta.seasons.length > 0 ? (
                                    <SeriesView seasons={meta.seasons} onPlay={(link, nextEp) => handlePlay(link, 'series', nextEp)} />
                                ) : (
                                    <div className="space-y-6">
                                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                            <div className="h-8 w-1 bg-red-600 rounded-full"></div>
                                            Available Servers
                                        </h3>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {meta.linkList.map((group, idx) => (
                                                <div key={idx} className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 hover:bg-zinc-900/60 transition-all hover:border-zinc-700 backdrop-blur-sm">
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <h4 className="font-bold text-zinc-100 flex items-center gap-3">
                                                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse ring-4 ring-green-500/20"></div>
                                                            {group.title}
                                                        </h4>
                                                        {group.quality && (
                                                            <span className="rounded bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-zinc-400 border border-white/10 tracking-widest">
                                                                {group.quality}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {group.directLinks.map((link, lIdx) => (
                                                            <button
                                                                key={lIdx}
                                                                onClick={() => handlePlay(link.link, meta.type)}
                                                                className="flex grow items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-black hover:bg-zinc-200 hover:scale-[1.03] active:scale-95 transition-all shadow-xl"
                                                            >
                                                                <Play className="h-4 w-4 fill-current" />
                                                                {link.title || 'STREAM'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function TiltCard({ image, title }: { image: string, title: string }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateY, rotateX, transformStyle: "preserve-3d" }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative group rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 aspect-[2/3]"
        >
            <div
                style={{ transform: "translateZ(50px)" }}
                className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <motion.img
                src={image}
                alt={title}
                className="h-full w-full object-cover"
                style={{ transform: "translateZ(0px)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

            {/* Glossy Overlay */}
            <div
                className="absolute inset-0 z-20 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.4) 100%)",
                    transform: "translateZ(80px)"
                }}
            />
        </motion.div>
    );
}

function SeriesView({ seasons, onPlay }: { seasons: NonNullable<Info['seasons']>; onPlay: (link: string, nextEp?: { link: string; title: string }) => void }) {
    const [selectedSeason, setSelectedSeason] = useState(seasons[0]);

    return (
        <div className="space-y-10">
            <div>
                <h4 className="text-zinc-500 font-bold uppercase tracking-widest text-xs flex items-center gap-4 mb-6">
                    Select Season
                    <div className="h-[1px] flex-1 bg-zinc-800/50"></div>
                </h4>
                <div className="flex flex-wrap gap-3">
                    {seasons.map((season) => (
                        <button
                            key={season.title}
                            onClick={() => setSelectedSeason(season)}
                            className={`rounded-2xl px-8 py-3 text-sm font-black transition-all shadow-xl ${selectedSeason.title === season.title
                                ? 'bg-red-600 text-white shadow-red-600/30 scale-105 z-10'
                                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-700/50'
                                }`}
                        >
                            {season.title}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-zinc-900/30 rounded-3xl p-6 sm:p-8 border border-zinc-800/50 backdrop-blur-sm shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-white italic">Episodes</h3>
                    <span className="bg-zinc-800 px-4 py-1.5 rounded-full text-xs font-black text-zinc-400 tracking-widest border border-zinc-700 uppercase">
                        {selectedSeason.title}
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {(() => {
                        // 1. FILTER: Exclude invalid episodes
                        const filteredEpisodes = selectedSeason.episodes.filter(ep =>
                            !ep.title.includes('1720') && !ep.title.includes('5720')
                        );

                        // 2. DEDUPLICATE: Normalize titles (e.g., "Episode 08" -> "Episode 8")
                        const seenTitles = new Set();
                        const uniqueEpisodes = filteredEpisodes.filter(ep => {
                            // Normalize: remove "Episode" prefix, trim, remove leading zeros from numbers
                            const normalized = ep.title
                                .replace(/episode/i, '')
                                .trim()
                                .replace(/^0+(\d+)/, '$1');

                            if (seenTitles.has(normalized)) return false;
                            seenTitles.add(normalized);
                            return true;
                        });

                        return uniqueEpisodes.map((episode, idx) => {
                            const nextEpInSeason = uniqueEpisodes[idx + 1];
                            let finalNextEp = nextEpInSeason ? { link: nextEpInSeason.link, title: nextEpInSeason.title } : undefined;

                            // If no next episode in current season, look for first episode of next season
                            if (!finalNextEp) {
                                const currentSeasonIdx = seasons.findIndex(s => s.title === selectedSeason.title);
                                const nextSeason = seasons[currentSeasonIdx + 1];
                                if (nextSeason && nextSeason.episodes.length > 0) {
                                    // Apply same filter logic to next season's first episode finding
                                    const nextSeasonEps = nextSeason.episodes.filter(ep =>
                                        !ep.title.includes('1720') && !ep.title.includes('5720')
                                    );

                                    // Simple dedupe for the first one is just taking the first one that matches
                                    const firstEpOfNextSeason = nextSeasonEps[0];

                                    if (firstEpOfNextSeason) {
                                        finalNextEp = {
                                            link: firstEpOfNextSeason.link,
                                            title: `${nextSeason.title} - ${firstEpOfNextSeason.title}`
                                        };
                                    }
                                }
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => onPlay(episode.link, finalNextEp)}
                                    className="group flex items-center gap-5 rounded-2xl border border-zinc-800/40 bg-zinc-900/40 p-4 text-left hover:border-red-600/50 hover:bg-zinc-900 transition-all duration-300 shadow-md hover:shadow-red-600/10"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 group-hover:bg-red-600 group-hover:text-white transition-all duration-300 shadow-inner group-hover:rotate-6">
                                        <Play className="h-4 w-4 fill-current ml-1" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="line-clamp-2 text-sm font-black text-zinc-300 group-hover:text-white transition-colors leading-tight uppercase tracking-tight">
                                            {episode.title}
                                        </p>
                                    </div>
                                </button>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
}

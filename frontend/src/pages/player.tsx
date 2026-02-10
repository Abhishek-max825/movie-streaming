import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { getMeta, startStream, stopStream } from '@/services/apiClient';
import { ArrowLeft, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';


const VideoPlayer = dynamic(() => import('@/components/media/VideoPlayer').then(mod => mod.VideoPlayer), {
    ssr: false,
    loading: () => <div className="w-full aspect-video bg-slate-900 animate-pulse rounded-xl" />,
});

export default function WatchPage() {
    const router = useRouter();
    const { link, type, duration, seriesId } = router.query;

    const [showNextOverlay, setShowNextOverlay] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [mounted, setMounted] = useState(false);

    const [dynamicNextLink, setDynamicNextLink] = useState<string | null>(null);
    const [dynamicNextTitle, setDynamicNextTitle] = useState<string | null>(null);

    // Parse duration string (e.g., "2h 45min" or "1h 30m") to seconds
    const parseDuration = (str: string | undefined): number | undefined => {
        if (!str) return undefined;
        try {
            const hoursMatch = str.match(/(\d+)\s*h/i);
            const minsMatch = str.match(/(\d+)\s*m/i);

            let totalSeconds = 0;
            if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
            if (minsMatch) totalSeconds += parseInt(minsMatch[1]) * 60;

            return totalSeconds > 0 ? totalSeconds : undefined;
        } catch (e) {
            return undefined;
        }
    };

    const durationSec = parseDuration(duration as string);

    const [streamUrl, setStreamUrl] = useState('');
    const [currentPort, setCurrentPort] = useState<number | null>(null);
    const [exactDuration, setExactDuration] = useState<number | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('Initializing stream...');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch playlist info for series to manage "Next" button chain
    useEffect(() => {
        if (type !== 'series' || !seriesId || !mounted) return;

        const updatePlaylist = async () => {
            try {
                const sId = decodeURIComponent(seriesId as string);
                const meta = await getMeta(sId);
                if (meta.seasons) {
                    // Flatten all valid episodes from all seasons
                    const allEpisodes: { link: string; title: string }[] = [];
                    meta.seasons.forEach(season => {
                        // 1. FILTER
                        const filtered = season.episodes.filter(ep =>
                            !ep.title.includes('1720') && !ep.title.includes('5720')
                        );

                        // 2. DEDUPLICATE (Scoped to season to be safe, or global? title is unique typically)
                        // Actually, duplicate episodes usually appear within the same season list from the source.
                        // Let's dedupe per season before flattening.
                        const seenTitles = new Set();
                        const uniqueSeasonEpisodes = filtered.filter(ep => {
                            const normalized = ep.title
                                .replace(/episode/i, '')
                                .trim()
                                .replace(/^0+(\d+)/, '$1');

                            if (seenTitles.has(normalized)) return false;
                            seenTitles.add(normalized);
                            return true;
                        });

                        uniqueSeasonEpisodes.forEach(ep => {
                            allEpisodes.push({
                                link: ep.link,
                                title: `${season.title} - ${ep.title}`
                            });
                        });
                    });

                    // Find current episode and its successor
                    const currentLink = decodeURIComponent(link as string);
                    const currentIndex = allEpisodes.findIndex(ep => ep.link === currentLink);

                    if (currentIndex !== -1 && currentIndex < allEpisodes.length - 1) {
                        const next = allEpisodes[currentIndex + 1];
                        setDynamicNextLink(next.link);
                        setDynamicNextTitle(next.title);
                    } else {
                        setDynamicNextLink(null);
                        setDynamicNextTitle(null);
                    }
                }
            } catch (err) {
                console.error("Failed to update playlist info", err);
            }
        };

        updatePlaylist();
    }, [link, seriesId, type, mounted]);

    useEffect(() => {
        if (showNextOverlay) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [showNextOverlay]);

    // Cleanup proxy when leaving page or switching episodes
    useEffect(() => {
        const portToStop = currentPort;
        return () => {
            if (portToStop) {
                console.log('Cleaning up proxy on port:', portToStop);
                stopStream(portToStop);
            }
        };
    }, [currentPort]);

    const handleBack = async () => {
        if (currentPort) {
            console.log('[Player] 🔙 Back button clicked. Force killing stream proxy on port:', currentPort);
            try {
                // Explicitly signal shutdown before navigating
                await stopStream(currentPort);
            } catch (e) {
                console.warn('[Player] Failed to stop stream during back navigation:', e);
            }
        }
        router.back();
    };

    useEffect(() => {
        if (!link || !mounted) return;

        const initStream = async () => {
            setLoading(true);
            setError('');
            setStreamUrl('');
            setCurrentPort(null); // Force cleanup of previous proxy
            setExactDuration(undefined);
            setShowNextOverlay(false);
            // Don't reset dynamic next info here, let its own useEffect handle it

            try {
                setStatus('Extracting video source...');
                const decodedLink = decodeURIComponent(link as string);

                setStatus('Starting proxy server...');
                const data = await startStream(decodedLink, type as string);

                if (data.proxyUrl) {
                    setStreamUrl(data.proxyUrl);

                    // Extract port from proxyUrl (e.g. /api/hls/stream.m3u8?port=8000)
                    const portMatch = data.proxyUrl.match(/[?&]port=(\d+)/);
                    if (portMatch) {
                        setCurrentPort(parseInt(portMatch[1]));
                    }

                    if (data.duration) {
                        setExactDuration(data.duration);
                    }
                } else {
                    throw new Error('No stream URL returned');
                }
            } catch (err: any) {
                console.error(err);
                setError(err.response?.data?.error || err.message || 'Failed to start stream');
            } finally {
                setLoading(false);
            }
        };

        initStream();
    }, [link, type, mounted]);

    if (!mounted) {
        return <div className="min-h-screen bg-black" />;
    }

    return (
        <>
            <Head>
                <title>Watching... - BBHC Theatre</title>
            </Head>

            <div className="min-h-screen bg-black flex flex-col text-white">
                <div className="pt-4 px-4 pb-4">
                    <button onClick={handleBack} className="inline-flex items-center gap-2 text-gray-400 hover:text-[#E50914] transition-colors mb-4">
                        <ArrowLeft className="h-5 w-5" /> Back
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                    {loading ? (
                        <div className="text-center space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-[#E50914] mx-auto" />
                            <p className="text-gray-300 text-lg animate-pulse">{status}</p>
                            <p className="text-gray-500 text-sm">This might take a few seconds...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center max-w-md">
                            <div className="text-[#E50914] text-xl mb-4">⚠️ Stream Error</div>
                            <p className="text-gray-300 mb-6">{error}</p>
                            <button
                                onClick={() => router.reload()}
                                className="px-6 py-2 bg-[#E50914] rounded-full text-white hover:bg-[#b20710] transition-colors font-medium"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div className="w-full max-w-6xl relative group">
                            <VideoPlayer
                                src={streamUrl}
                                autoPlay
                                duration={exactDuration || durationSec}
                                onEnded={() => {
                                    if (dynamicNextLink) {
                                        setShowNextOverlay(true);
                                        setCountdown(5);
                                    }
                                }}
                            />

                            {dynamicNextLink && !showNextOverlay && (
                                <button
                                    onClick={() => {
                                        router.push({
                                            pathname: '/player',
                                            query: { ...router.query, link: dynamicNextLink }
                                        });
                                    }}
                                    className="absolute top-4 right-4 z-40 bg-black/60 hover:bg-[#E50914] text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 font-bold text-sm"
                                >
                                    Next Episode <ArrowLeft className="h-4 w-4 rotate-180" />
                                </button>
                            )}

                            <AnimatePresence>
                                {showNextOverlay && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md rounded-xl border border-white/10"
                                    >
                                        <CountdownTimer
                                            initialCount={5}
                                            onTick={setCountdown}
                                            onComplete={() => {
                                                router.push({
                                                    pathname: '/player',
                                                    query: { ...router.query, link: dynamicNextLink }
                                                });
                                                setShowNextOverlay(false);
                                            }}
                                        />
                                        <div className="max-w-md w-full text-center space-y-8 p-8">
                                            <div className="space-y-2">
                                                <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-xs">Up Next</p>
                                                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter line-clamp-2">
                                                    {dynamicNextTitle ? decodeURIComponent(dynamicNextTitle as string) : 'Next Episode'}
                                                </h3>
                                            </div>

                                            <div className="relative h-24 w-24 mx-auto flex items-center justify-center">
                                                <svg className="h-full w-full rotate-[-90deg]">
                                                    <circle
                                                        cx="48" cy="48" r="44"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                        fill="transparent"
                                                        className="text-white/10"
                                                    />
                                                    <motion.circle
                                                        cx="48" cy="48" r="44"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                        fill="transparent"
                                                        strokeDasharray="276"
                                                        initial={{ strokeDashoffset: 276 }}
                                                        animate={{ strokeDashoffset: 0 }}
                                                        transition={{ duration: 5, ease: "linear" }}
                                                        className="text-red-600"
                                                    />
                                                </svg>
                                                <span className="absolute text-3xl font-black text-white">{countdown}</span>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <button
                                                    onClick={() => {
                                                        router.push({
                                                            pathname: '/player',
                                                            query: { ...router.query, link: dynamicNextLink }
                                                        });
                                                        setShowNextOverlay(false);
                                                    }}
                                                    className="flex-1 bg-white text-black font-black py-4 rounded-lg hover:bg-zinc-200 transition active:scale-95"
                                                >
                                                    Play Now
                                                </button>
                                                <button
                                                    onClick={() => setShowNextOverlay(false)}
                                                    className="flex-1 bg-zinc-800 text-white font-black py-4 rounded-lg hover:bg-zinc-700 transition active:scale-95"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function CountdownTimer({ initialCount, onComplete, onTick }: { initialCount: number, onComplete: () => void, onTick: (val: number) => void }) {
    useEffect(() => {
        let count = initialCount;
        const timer = setInterval(() => {
            count -= 1;
            onTick(count);
            if (count <= 0) {
                clearInterval(timer);
                onComplete();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [initialCount, onComplete, onTick]);

    return null;
}

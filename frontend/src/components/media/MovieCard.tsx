import type { Post, Info } from '@/types/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { ImageOff, Play, Heart, Info as InfoIcon, Star } from 'lucide-react';
import { useRouter } from 'next/router';
import { getMeta } from '@/services/apiClient';
import { cleanTitle } from '@/utils/textUtils';

interface Props {
    post: Post;
}

// Cache for metadata to avoid repeated API calls
const metadataCache = new Map<string, Info>();

export const MovieCard = ({ post }: Props) => {
    const id = encodeURIComponent(post.link);
    const [imgError, setImgError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [metadata, setMetadata] = useState<Info | null>(null);
    const [isLoadingMeta, setIsLoadingMeta] = useState(false);
    const [isInList, setIsInList] = useState(false);
    const hoverTimer = useRef<NodeJS.Timeout | undefined>(undefined);
    const router = useRouter();

    const displayTitle = cleanTitle(post.title);

    useEffect(() => {
        // Check if item is in list (from localStorage)
        const myList = JSON.parse(localStorage.getItem('myList') || '[]');
        setIsInList(myList.some((item: Post) => item.link === post.link));
    }, [post.link]);

    const fetchMetadata = async () => {
        // Check cache first
        if (metadataCache.has(post.link)) {
            setMetadata(metadataCache.get(post.link)!);
            return;
        }

        setIsLoadingMeta(true);
        try {
            const data = await getMeta(post.link);
            metadataCache.set(post.link, data);
            setMetadata(data);
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
        } finally {
            setIsLoadingMeta(false);
        }
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        // Delay metadata fetch by 500ms to avoid fetching for quick hovers
        hoverTimer.current = setTimeout(() => {
            fetchMetadata();
        }, 500);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
        }
    };

    const handlePlay = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/title/${id}`);
    };

    const handleToggleList = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const myList = JSON.parse(localStorage.getItem('myList') || '[]');
        if (isInList) {
            const filtered = myList.filter((item: Post) => item.link !== post.link);
            localStorage.setItem('myList', JSON.stringify(filtered));
            setIsInList(false);
        } else {
            localStorage.setItem('myList', JSON.stringify([...myList, post]));
            setIsInList(true);
        }
    };

    const handleExpand = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/title/${id}`);
    };

    // Extract genres (limit to 3)
    const genres = metadata?.synopsis ? extractGenres(metadata.synopsis) : [];

    // Get a rating (mock for now, since we don't have TMDB integration)
    const rating = generateMockRating(post.title);

    return (
        <div
            className="block h-full group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                animate={{
                    scale: isHovered ? 1.15 : 1,
                    zIndex: isHovered ? 50 : 1
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="relative h-full w-full aspect-[2/3] rounded-md cursor-pointer bg-zinc-800 overflow-visible"
            >
                {/* Main Card Content */}
                <div className="relative h-full w-full overflow-hidden rounded-md shadow-md hover:shadow-2xl">
                    {/* Glow Effect Layer */}
                    <AnimatePresence>
                        {isHovered && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-red-600/20 blur-xl z-0"
                            />
                        )}
                    </AnimatePresence>

                    {!imgError ? (
                        <img
                            src={post.image}
                            alt={post.title}
                            className="h-full w-full object-cover rounded-md z-10 relative"
                            loading="lazy"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="h-full w-full relative bg-zinc-900 border border-zinc-800 z-10">
                            <img
                                src="/popcorn-placeholder.png"
                                alt="No Poster Available"
                                className="h-full w-full object-cover opacity-50"
                            />
                            <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black via-black/50 to-transparent">
                                <span className="text-xs text-white font-medium line-clamp-3 text-center w-full shadow-black drop-shadow-md">
                                    {displayTitle}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Enhanced Hover Overlay */}
                    <AnimatePresence>
                        {isHovered && !imgError && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                className="absolute inset-0 glass-card z-20 flex flex-col justify-between p-4 rounded-md border border-white/20 shadow-2xl"
                            >
                                {/* Top Section: Actions */}
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.1, backgroundColor: "white", color: "black" }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={handlePlay}
                                            className="p-2.5 bg-white/10 rounded-full border border-white/20 text-white transition-all shadow-lg"
                                        >
                                            <Play className="h-5 w-5 fill-current" />
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1, backgroundColor: "white", color: "black" }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={handleToggleList}
                                            className={`p-2.5 rounded-full border border-white/20 transition-all shadow-lg ${isInList
                                                ? 'bg-red-600 text-white border-red-500'
                                                : 'bg-white/10 text-white hover:bg-white'
                                                }`}
                                        >
                                            <Heart className={`h-5 w-5 ${isInList ? 'fill-current' : ''}`} />
                                        </motion.button>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleExpand}
                                        className="p-2.5 bg-white/10 rounded-full border border-white/20 text-white transition-all shadow-lg"
                                    >
                                        <InfoIcon className="h-5 w-5" />
                                    </motion.button>
                                </div>

                                {/* Bottom Section: Metadata */}
                                <div className="space-y-3">
                                    <div>
                                        <h3 className="text-white font-black text-base line-clamp-1 group-hover:text-red-500 transition-colors">
                                            {displayTitle}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center gap-1 bg-green-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-green-400">
                                                <Star className="h-2.5 w-2.5 fill-current" />
                                                <span>{rating}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                {metadata?.type || (post.title.toLowerCase().includes('season') ? 'Series' : 'Movie')}
                                            </span>
                                        </div>
                                    </div>

                                    {metadata && !isLoadingMeta ? (
                                        <>
                                            {/* Genre Tags */}
                                            {genres.length > 0 && (
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {genres.slice(0, 2).map((genre, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-300 font-medium"
                                                        >
                                                            {genre}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Description */}
                                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed italic">
                                                "{metadata.synopsis}"
                                            </p>

                                            {/* Watch Now Button */}
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handlePlay}
                                                className="w-full flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-lg shadow-red-600/20"
                                            >
                                                Watch Now
                                            </motion.button>
                                        </>
                                    ) : isLoadingMeta ? (
                                        <div className="flex flex-col items-center justify-center py-6 gap-2">
                                            <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-red-600"
                                                    animate={{ x: [-48, 48] }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Loading Details</span>
                                        </div>
                                    ) : (
                                        <div className="h-24 flex items-center justify-center">
                                            <span className="text-[10px] text-zinc-500 font-medium italic">Hover for preview...</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

// Helper function to extract genre-like keywords from synopsis
function extractGenres(synopsis: string): string[] {
    const genreKeywords = [
        'action', 'adventure', 'comedy', 'drama', 'horror', 'thriller',
        'romance', 'sci-fi', 'fantasy', 'mystery', 'crime', 'animation',
        'documentary', 'family', 'war', 'western', 'musical', 'biography'
    ];

    const found: string[] = [];
    const lowerSynopsis = synopsis.toLowerCase();

    for (const genre of genreKeywords) {
        if (lowerSynopsis.includes(genre) && found.length < 3) {
            found.push(genre.charAt(0).toUpperCase() + genre.slice(1));
        }
    }

    // Default genres if none found
    if (found.length === 0) {
        return ['Entertainment'];
    }

    return found;
}

// Mock rating generator (deterministic based on title)
function generateMockRating(title: string): string {
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rating = 6.5 + (hash % 25) / 10; // Generates rating between 6.5 and 9.0
    return rating.toFixed(1);
}

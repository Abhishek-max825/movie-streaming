

import { Play, ImageOff } from 'lucide-react';
import Link from 'next/link';
import type { Post } from '@/types/api';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useState } from 'react';
import { cleanTitle } from '@/utils/textUtils';

interface Props {
    post: Post;
    description?: string;
}

export const Hero = ({ post, description }: Props) => {
    const id = encodeURIComponent(post.link);
    const displayTitle = cleanTitle(post.title);
    const [imgError, setImgError] = useState(false);

    // Parallax logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["1deg", "-1deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-1deg", "1deg"]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        x.set(clientX / innerWidth - 0.5);
        y.set(clientY / innerHeight - 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    // Determine valid description
    const isJunkDescription = (desc?: string) => {
        if (!desc) return true;
        const junkPattern = /(\(\d{4}\)|\[.*?\]|\d{3,4}p|WEB-DL|Dual Audio|HEVC|x264|10Bit|HDTC|BluRay|ESub)/i;
        return junkPattern.test(desc) || desc.trim() === post.title.trim() || cleanTitle(desc) === displayTitle;
    };

    const finalDescription = !isJunkDescription(description)
        ? description
        : "Experience the magic of cinema with this incredible title. Now streaming in high definition on BBHC Theatre.";

    return (
        <div className="w-full flex justify-center pt-24 pb-8 px-4 sm:px-6">
            <motion.div
                style={{ rotateX, rotateY, perspective: 1000 }}
                className="relative w-full max-w-[1400px] h-[75vh] md:h-[85vh] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/10 group"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <motion.div
                        className="h-full w-full"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.8 }}
                    >
                        {!imgError ? (
                            <img
                                src={post.image}
                                alt={displayTitle}
                                className="h-full w-full object-cover transition-opacity duration-1000"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                                <div className="absolute inset-0 bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/f85718e0-bc46-4f47-90f8-b787af293e56/20002.jpg')] bg-cover opacity-20 blur-sm"></div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent z-10" />

                {/* Content Container */}
                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-20">
                    <div className="max-w-3xl space-y-6">
                        {/* Title */}
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter drop-shadow-xl"
                        >
                            {displayTitle}
                        </motion.h1>

                        {/* Metadata Badges */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center gap-3 text-sm font-medium text-white/90"
                        >
                            <span className="bg-red-600/90 text-white px-2 py-0.5 rounded text-xs font-bold tracking-wider">
                                {post.title.toLowerCase().includes('season') ? 'SERIES' : 'MOVIE'}
                            </span>
                            <span>•</span>
                            <span className="text-green-400 font-bold">98% Match</span>
                            <span>•</span>
                            <span>2025</span>
                            <span>•</span>
                            <span className="border border-white/40 px-1.5 rounded text-xs">HD</span>
                        </motion.div>

                        {/* Description */}
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-lg text-gray-200 line-clamp-3 font-medium drop-shadow-md max-w-2xl leading-relaxed"
                        >
                            {finalDescription}
                        </motion.p>

                        {/* Buttons */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-wrap items-center gap-4 pt-4"
                        >
                            <Link href={`/title/${id}`}>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-8 py-3 bg-white text-black rounded-full font-bold text-lg flex items-center gap-3 hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
                                >
                                    <Play className="h-6 w-6 fill-current" />
                                    Play
                                </motion.button>
                            </Link>

                            <Link href={`/title/${id}`}>
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.3)" }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-8 py-3 bg-white/20 backdrop-blur-md text-white rounded-full font-bold text-lg flex items-center gap-3 border border-white/10 transition-all"
                                >
                                    <img src="/info.png" alt="Info" className="w-[14px] h-[14px]" />
                                    More Info
                                </motion.button>
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};


import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { searchContent } from '@/services/apiClient';
import { MovieCard } from '@/components/media/MovieCard';
import type { Post } from '@/types/api';
import { Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchPage() {
    const router = useRouter();
    const { q } = router.query;

    const [results, setResults] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!q) return;

        const fetchResults = async () => {
            setLoading(true);
            try {
                const data = await searchContent(q as string);
                setResults(data);
            } catch (error) {
                console.error("Search failed", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [q]);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <>
            <Head>
                <title>Search: {q} - BBHC Theatre</title>
            </Head>

            <div className="min-h-screen bg-[#141414] pt-32 pb-20 px-4 md:px-12 lg:px-16">
                <div className="max-w-[1600px] mx-auto">
                    <motion.header
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-16 border-l-4 border-red-600 pl-8 py-2 bg-gradient-to-r from-red-600/5 to-transparent rounded-r-2xl"
                    >
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500 mb-2">Streaming Database</p>
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                            Explore titles related to: <span className="text-white font-black">"{q}"</span>
                        </h1>
                    </motion.header>

                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center pt-32 space-y-4"
                            >
                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-red-600 border-r-transparent border-b-red-600 border-l-transparent"></div>
                                <p className="text-red-600 font-bold uppercase tracking-widest text-xs animate-pulse">Searching...</p>
                            </motion.div>
                        ) : results.length > 0 ? (
                            <motion.div
                                key="results"
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
                            >
                                {results.map((post, idx) => (
                                    <motion.div
                                        key={`${post.link}-${idx}`}
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.05, zIndex: 10 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <MovieCard post={post} />
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-2xl mx-auto text-center pt-24 space-y-8 bg-zinc-900/40 rounded-3xl p-12 border border-zinc-800/50 backdrop-blur-sm shadow-2xl"
                            >
                                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-zinc-800 text-zinc-500 mb-4 shadow-inner">
                                    <Search className="h-8 w-8" />
                                </div>
                                <div className="space-y-4">
                                    <h1 className="text-3xl font-black text-white">Oops! No matches found.</h1>
                                    <p className="text-zinc-400 text-lg">Your search for <span className="text-zinc-200">"{q}"</span> didn't yield any results on BBHC Theatre.</p>
                                </div>

                                <div className="bg-zinc-800/50 rounded-2xl p-6 text-left border border-zinc-700/50 max-w-sm mx-auto shadow-lg">
                                    <div className="flex items-center gap-2 text-red-500 mb-3 font-bold text-sm">
                                        <Info className="h-4 w-4" />
                                        Suggestions
                                    </div>
                                    <ul className="space-y-2 text-sm text-zinc-400 font-medium">
                                        <li className="flex items-start gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5 shrink-0"></div>
                                            Try different keywords
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5 shrink-0"></div>
                                            Search for actor, director, or genre
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5 shrink-0"></div>
                                            Double check your spelling
                                        </li>
                                    </ul>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

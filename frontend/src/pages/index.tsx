import { motion, useMotionValue, useTransform, useSpring, Variants } from 'framer-motion';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export default function Showcase() {
  const text = "BBHC THEATRE";
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D Parallax Motion Values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for the parallax
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Transforms for various layers
  const rotateX = useTransform(springY, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(springX, [-0.5, 0.5], ["-10deg", "10deg"]);

  const contentX = useTransform(springX, [-0.5, 0.5], ["-20px", "20px"]);
  const contentY = useTransform(springY, [-0.5, 0.5], ["-20px", "20px"]);

  const nebulaScale = useTransform(springX, [-0.5, 0.5], [1, 1.1]);

  const [particles, setParticles] = useState<{
    id: number;
    initialX: string;
    initialY: string;
    scale: number;
    duration: number;
    size: number;
  }[]>([]);

  useEffect(() => {
    // Generate cinematic embers
    setParticles(Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      initialX: Math.random() * 100 + "%",
      initialY: Math.random() * 100 + "%",
      scale: Math.random() * 0.5 + 0.5,
      duration: Math.random() * 15 + 10,
      size: Math.random() * 2 + 1,
    })));
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.8 }
    }
  };

  const letterVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 50,
      rotateX: -90,
      skewX: 20,
      filter: "blur(10px)"
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      skewX: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 150
      }
    }
  };

  return (
    <>
      <Head>
        <title>Experience - BBHC Theatre</title>
      </Head>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative min-h-screen w-full bg-[#050505] overflow-hidden flex flex-col items-center justify-center"
        style={{ perspective: "1000px" }}
      >
        {/* Dynamic Nebula Background */}
        <motion.div
          style={{ scale: nebulaScale }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          {/* Main Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-[radial-gradient(circle_at_center,_rgba(229,9,20,0.08)_0%,_transparent_70%)]" />

          {/* Animated Nebula Clouds */}
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-red-900/10 blur-[150px] rounded-full"
          />
          <motion.div
            animate={{
              x: [0, -40, 0],
              y: [0, 40, 0],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-zinc-800/20 blur-[120px] rounded-full"
          />
        </motion.div>

        {/* Cinematic Embers/Dust */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: p.initialX, y: p.initialY, opacity: 0 }}
              animate={{
                y: ["0%", "-120%"],
                opacity: [0, 0.8, 0],
                x: [p.initialX, `calc(${p.initialX} + ${Math.random() * 10 - 5}%)`]
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 10
              }}
              className="absolute bg-white/40 rounded-full"
              style={{ width: p.size, height: p.size, filter: "blur(1px)" }}
            />
          ))}
        </div>

        {/* Main 3D Card Container */}
        <motion.div
          style={{
            rotateX,
            rotateY,
            x: contentX,
            y: contentY,
            transformStyle: "preserve-3d"
          }}
          className="relative z-10 flex flex-col items-center justify-center py-20 px-10"
        >
          {/* Title Reflection (Flipped and Blur) */}
          <div
            className="absolute top-[calc(100%-80px)] opacity-10 pointer-events-none scale-y-[-0.8] blur-md select-none hidden md:block"
            style={{ maskImage: "linear-gradient(to bottom, transparent, black)" }}
          >
            <h1 className="text-8xl lg:text-9xl font-black text-white tracking-widest whitespace-nowrap">
              {text}
            </h1>
          </div>

          {/* Main Title */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex justify-center mb-6 relative"
            style={{ transform: "translateZ(80px)" }}
          >
            {Array.from(text).map((letter, index) => (
              <motion.span
                key={index}
                variants={letterVariants}
                className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white tracking-tight sm:tracking-normal inline-block select-none"
                style={{
                  textShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 40px rgba(229,9,20,0.3)",
                  marginRight: letter === " " ? "1.5rem" : "0"
                }}
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 1, type: "spring" }}
            className="flex flex-col items-center"
            style={{ transform: "translateZ(50px)" }}
          >
            <div className="flex items-center gap-4 mb-12">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-red-600/50" />
              <p className="text-sm md:text-xl text-zinc-400 font-bold tracking-[0.6em] uppercase text-center">
                Experience The Magic
              </p>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-red-600/50" />
            </div>

            <Link
              href="/home"
              className="group relative inline-flex items-center gap-4 overflow-hidden rounded-full bg-white/5 border border-white/10 px-10 py-5 text-xl font-black text-white transition-all duration-500 hover:bg-white hover:text-black hover:scale-110 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              {/* Internal Glow Effect */}
              <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-10 transition-opacity" />

              <span className="relative z-10 flex items-center gap-3">
                ENTER THEATRE
                <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-2" />
              </span>

              {/* Outer Glow */}
              <div className="absolute -inset-1 rounded-full bg-red-600 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-20" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Ambient Corner Accents */}
        <div className="absolute top-10 left-10 z-20 opacity-20 hidden lg:block">
          <div className="flex items-center gap-3 text-xs font-black tracking-[0.4em] text-white/50 uppercase">
            <Sparkles className="h-4 w-4" />
            BBHC Theatre Premium
          </div>
        </div>

        {/* Final Cinematic Overlay */}
        <div className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(circle_at_center,_transparent_0%,_#050505_130%)]" />
      </div>
    </>
  );
}

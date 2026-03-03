import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play, Shield, Key } from "lucide-react";
import Aurora from "@/components/ui/Aurora/Aurora";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Folder from "@/components/ui/Folder/Folder";
import { Camera, FileText, Video, Music, Heart, Globe } from "lucide-react";
import { platformStatsAPI } from "@/services/api";

// Rotating phrases for the hero
const rotatingPhrases = [
  "Memories",
  "Documents",
  "Milestones",
  "Stories",
  "Legacy",
  "Moments",
];

// Rotating taglines
const rotatingTaglines = [
  "Your story, your control.",
  "Secure your legacy today.",
  "Share with loved ones.",
  "Never lose what matters.",
  "Private by design.",
  "Your digital time capsule.",
  "Preserve every moment.",
  "Own your data forever.",
  "Future-proof your memories.",
  "Built for generations.",
];

// Animated word component with typewriter effect
const TypewriterWord = ({ words }: { words: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span className="relative inline-flex min-w-[180px] md:min-w-[220px] justify-center lg:justify-start">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-block text-white"
        >
          {words[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

// Animated tagline component
const AnimatedTagline = ({ taglines }: { taglines: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % taglines.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [taglines.length]);

  // Find the longest string to use as an invisible placeholder for fixed width
  const longestTagline = taglines.reduce((a, b) => (a.length > b.length ? a : b), "");

  return (
    <div className="relative grid place-items-center overflow-hidden min-h-[32px]">
      <span className="invisible col-start-1 row-start-1 text-white/60 font-medium whitespace-nowrap px-1">
        {longestTagline}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute col-start-1 row-start-1 text-white/60 font-medium whitespace-nowrap"
        >
          {taglines[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

// Letter by letter animation component
const AnimatedLetters = ({ text, className }: { text: string; className?: string }) => {
  return (
    <motion.span className={className}>
      {text.split("").map((letter, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: index * 0.03,
            ease: "easeOut",
          }}
          className="inline-block"
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.span>
  );
};

// Floating stats animation — defaults shown while API loads
const defaultFloatingStats = [
  { key: "memoriesSecured", label: "Memories Secured", value: "2M+", delay: 0 },
  { key: "happyFamilies", label: "Happy Families", value: "50K+", delay: 0.2 },
  { key: "uptime", label: "Uptime", value: "99.9%", delay: 0.4 },
];

const AnimatedCounter = ({ value, delay }: { value: string; delay: number }) => {
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, delay * 1000 + 500);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <motion.span
      key={displayValue}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="text-2xl font-bold text-white"
    >
      {displayValue}
    </motion.span>
  );
};

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const [floatingStats, setFloatingStats] = useState(defaultFloatingStats);
  const [familyCount, setFamilyCount] = useState("50,000+");

  useEffect(() => {
    setMounted(true);

    // Fetch real platform stats
    const fetchStats = async () => {
      try {
        const { data } = await platformStatsAPI.getStats();
        if (!data?.data?.formatted) return;

        const f = data.data.formatted;
        setFloatingStats([
          { key: "memoriesSecured", label: "Memories Secured", value: f.memoriesSecured, delay: 0 },
          { key: "happyFamilies", label: "Happy Families", value: f.happyFamilies, delay: 0.2 },
          { key: "uptime", label: "Uptime", value: f.uptime, delay: 0.4 },
        ]);

        // Update trust banner with raw vault count
        const rawVaults = data.data.raw.vaults;
        if (rawVaults >= 1000) {
          setFamilyCount(`${(rawVaults / 1000).toFixed(0)},000+`);
        } else {
          setFamilyCount(`${rawVaults}+`);
        }
      } catch {
        // Keep fallback values silently
      }
    };

    fetchStats();
  }, []);

  return (
    <section className="relative pt-40 pb-24 lg:pt-48 lg:pb-40 overflow-hidden flex flex-col items-center justify-center min-h-[95vh]">

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Floating Folders - Desktop Only */}
        <div className="absolute -left-24 lg:-left-40 top-20 hidden md:block">
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [-5, 5, -5]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Folder
              size={0.8}
              color="#6366f1"
              items={[
                <Camera className="w-8 h-8 text-indigo-500" />,
                <Video className="w-8 h-8 text-purple-500" />,
                <Music className="w-8 h-8 text-blue-500" />
              ]}
            />
          </motion.div>
        </div>

        <div className="absolute -right-24 lg:-right-40 bottom-40 hidden md:block">
          <motion.div
            animate={{
              y: [0, 20, 0],
              rotate: [10, -5, 10]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Folder
              size={1}
              color="#a855f7"
              items={[
                <Heart className="w-8 h-8 text-pink-500" />,
                <FileText className="w-8 h-8 text-amber-500" />,
                <Globe className="w-8 h-8 text-emerald-500" />
              ]}
            />
          </motion.div>
        </div>

        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/80 mb-8 backdrop-blur-md shadow-2xl"
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          <AnimatedTagline taglines={["Secure • Private • Forever Yours", "Encrypted • Protected • Owned by You", "Safe • Personal • Your Legacy"]} />
        </motion.div>

        {/* Main Heading with Animated Word */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 w-full flex flex-col items-center justify-center"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 leading-[1.1] drop-shadow-sm">
            <span className="flex items-center justify-center gap-3 flex-wrap">
              <AnimatedLetters text="Your" className="text-white" />
              <div className="text-white min-w-[300px] text-center"><TypewriterWord words={rotatingPhrases} /></div>
            </span>
            <span className="relative mt-4 block text-white">
              <AnimatedLetters text="Preserved " />
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1, delay: 1.5 }}
                className="absolute bottom-2 left-0 h-4 bg-white/10 -z-10 rounded-sm"
              />
              <AnimatedLetters text="Forever." />
            </span>
          </h1>
        </motion.div>

        {/* Animated Tagline Rotator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8 flex items-center justify-center gap-2 text-xl md:text-2xl font-light text-white/80"
        >
          <AnimatedTagline taglines={rotatingTaglines} />
        </motion.div>


        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
        >
          Store memories, documents, and milestones in a personal vault that you truly own.
          Share with loved ones, protect your legacy, and never lose what matters most.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-20 w-full"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-14 px-12 rounded-full bg-white text-black text-lg font-semibold hover:bg-neutral-200 transition-colors flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.3)] backdrop-blur-sm"
          >
            <Link to="/register"> Start Your Vault </Link>
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-14 px-12 rounded-full bg-white/5 border border-white/20 text-white text-lg font-medium hover:bg-white/10 transition-colors flex items-center gap-3 backdrop-blur-md"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Play className="w-5 h-5 text-white" />
            </motion.div>
            Watch Demo
          </motion.button>
        </motion.div>

        {/* Animated Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-16 pt-8 border-t border-white/10 w-full max-w-3xl"
        >
          {floatingStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + stat.delay }}
              className="text-center"
            >
              <AnimatedCounter value={stat.value} delay={stat.delay} />
              <p className="text-sm font-medium text-white/50 uppercase tracking-widest mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Text Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 flex items-center gap-2 text-sm text-white/40"
        >
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-2"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            <span className="tracking-wide">Trusted by {familyCount} families worldwide</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Animated bottom scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-xs uppercase tracking-[0.2em] font-medium text-white/30">Scroll Down</span>
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1.5 h-2 rounded-full bg-white/60"
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
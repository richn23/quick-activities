"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Clock, Zap, Brain } from "lucide-react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import GradientText from "@/components/ui/gradient-text";
import { SkyToggle } from "@/components/ui/sky-toggle";

const activities = [
  {
    title: "Odd One Out",
    desc: "Spot which item doesn't belong",
    icon: "🎯",
    gradient: "from-orange-500 to-rose-500",
    href: "/activities/odd-one-out",
    ready: true,
  },
  {
    title: "Connections",
    desc: "Group words into hidden categories",
    icon: "🔗",
    gradient: "from-violet-500 to-purple-600",
    href: "/activities/connections",
    ready: true,
  },
  {
    title: "What's the Question?",
    desc: "Given an answer, find the question",
    icon: "❓",
    gradient: "from-cyan-400 to-blue-500",
    href: "/activities/whats-the-question",
    ready: true,
  },
  {
    title: "Simple Cloze",
    desc: "Fill in the missing words",
    icon: "📝",
    gradient: "from-emerald-400 to-teal-500",
    href: "/activities/cloze",
    ready: true,
  },
  {
    title: "This or That",
    desc: "Spark debates with tough choices",
    icon: "⚖️",
    gradient: "from-pink-500 to-orange-400",
    href: "/activities/this-or-that",
    ready: true,
  },
];

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showCarousel, setShowCarousel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Dark mode state - check document class synchronously to prevent flash
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      if (document.documentElement.classList.contains('dark')) return true;
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  const prev = () =>
    setActiveIndex((i) => (i - 1 + activities.length) % activities.length);
  const next = () =>
    setActiveIndex((i) => (i + 1) % activities.length);

  // Apply theme class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Show carousel after hero animation completes
  useEffect(() => {
    const timer = setTimeout(() => setShowCarousel(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const handleCardClick = (activity: typeof activities[0], index: number) => {
    if (index !== activeIndex) {
      setActiveIndex(index);
    } else if (activity.ready) {
      window.location.href = activity.href;
    }
  };

  return (
    <BackgroundPaths isDark={isDark}>
      {/* Sky Toggle - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <SkyToggle isDark={isDark} onToggle={toggleTheme} />
      </div>
      
      <div className="flex flex-col min-h-screen">
        {/* Hero Section */}
        <header className="pt-16 pb-8 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="text-teal-500" size={24} />
              <span 
                className="uppercase tracking-widest text-sm font-medium"
                style={{ color: isDark ? "rgba(45, 212, 191, 0.8)" : "rgba(13, 148, 136, 0.9)" }}
              >
                Classroom Tools
              </span>
              <Sparkles className="text-teal-500" size={24} />
            </div>

            <h1 className="text-5xl md:text-7xl font-black mb-4 font-hero">
              <GradientText
                colors={isDark 
                  ? ["#2dd4bf", "#22d3ee", "#a78bfa", "#2dd4bf", "#22d3ee"]
                  : ["#0d9488", "#0891b2", "#7c3aed", "#0d9488", "#0891b2"]
                }
                animationSpeed={4}
                showBorder={false}
                className="text-5xl md:text-7xl font-black"
              >
                Quick Activities
              </GradientText>
            </h1>

            <p 
              className="text-xl font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              To make your teaching life easier
            </p>
          </motion.div>
        </header>

        {/* Main Content - Explainer + Carousel */}
        <main className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="flex items-center gap-8 lg:gap-16 max-w-6xl w-full">
            
            {/* Left: Explainer */}
            <motion.div 
              className="hidden lg:flex flex-col gap-6 w-72 shrink-0"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: showCarousel ? 1 : 0, x: showCarousel ? 0 : -30 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-teal-500/20" : "bg-teal-500/15"
                  }`}>
                    <Zap className="text-teal-500" size={20} />
                  </div>
                  <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>
                    Quick Prep
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Set up in seconds with AI or go manual. Ready when you are.
                </p>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-violet-500/20" : "bg-violet-500/15"
                  }`}>
                    <Brain className="text-violet-500" size={20} />
                  </div>
                  <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>
                    Cognitive Challenge
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Activities designed to engage critical thinking and spark discussion.
                </p>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-cyan-500/20" : "bg-cyan-500/15"
                  }`}>
                    <Clock className="text-cyan-500" size={20} />
                  </div>
                  <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>
                    Anytime Use
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Warmers, reviews, last 10 mins of class. Pull them out when needed.
                </p>
              </div>
            </motion.div>

            {/* Right: Carousel */}
            <motion.div 
              className="flex-1 flex flex-col items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: showCarousel ? 1 : 0, y: showCarousel ? 0 : 30 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Cards */}
              <div
                className="relative h-64 sm:h-80 w-full max-w-xl flex items-center justify-center"
                style={{ perspective: "1000px" }}
              >
                {activities.map((activity, index) => {
                  const offset = index - activeIndex;
                  const isActive = index === activeIndex;
                  
                  // Handle wrap-around for circular navigation
                  const normalizedOffset = 
                    offset > activities.length / 2 ? offset - activities.length :
                    offset < -activities.length / 2 ? offset + activities.length : 
                    offset;

                  // Calculate position - only show active and adjacent cards
                  const isVisible = Math.abs(normalizedOffset) <= 1;
                  
                  let transform = "translateX(0) scale(0.6)";
                  let zIndex = 0;
                  let cardOpacity = 0.5;

                  // Use smaller offset on mobile
                  const offsetX = isMobile ? 80 : 140;
                  const sideScale = isMobile ? 0.7 : 0.8;

                  if (isActive) {
                    transform = "translateX(0) scale(1) rotateY(0deg)";
                    zIndex = 10;
                    cardOpacity = 1;
                  } else if (normalizedOffset === 1) {
                    transform = `translateX(${offsetX}px) scale(${sideScale}) rotateY(-12deg)`;
                    zIndex = 5;
                    cardOpacity = 0.6;
                  } else if (normalizedOffset === -1) {
                    transform = `translateX(-${offsetX}px) scale(${sideScale}) rotateY(12deg)`;
                    zIndex = 5;
                    cardOpacity = 0.6;
                  }

                  return (
                    <div
                      key={activity.title}
                      className="absolute cursor-pointer"
                      style={{
                        transform,
                        zIndex,
                        transformStyle: "preserve-3d",
                        transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), z-index 0.5s",
                        visibility: isVisible ? "visible" : "hidden",
                        pointerEvents: isVisible ? "auto" : "none",
                      }}
                      onClick={() => handleCardClick(activity, index)}
                    >
                      <div
                        className={`
                          glass-card w-44 h-52 sm:w-56 sm:h-64 transition-all duration-500 relative overflow-hidden
                          ${isActive 
                            ? isDark 
                              ? "ring-2 ring-teal-400/50 shadow-[0_0_60px_rgba(45,212,191,0.15)]" 
                              : "ring-2 ring-teal-500/40 shadow-[0_8px_40px_rgba(13,148,136,0.2)]"
                            : ""
                          }
                          ${!activity.ready ? "grayscale-[30%]" : ""}
                        `}
                        style={{ opacity: cardOpacity }}
                      >
                        {/* Coming Soon Badge */}
                        {!activity.ready && (
                          <div className="absolute top-3 right-3 z-20">
                            <span className={`
                              px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                              ${isDark 
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                                : "bg-amber-500/15 text-amber-600 border border-amber-500/25"
                              }
                            `}>
                              Soon
                            </span>
                          </div>
                        )}
                        
                        <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-center">
                          {/* Icon */}
                          <div
                            className={`
                              w-16 h-16 rounded-2xl mb-4 
                              flex items-center justify-center
                              bg-gradient-to-br ${activity.gradient}
                              shadow-lg
                              ${!activity.ready ? "opacity-70" : ""}
                            `}
                          >
                            <span className="text-3xl">{activity.icon}</span>
                          </div>

                          {/* Title - matching hero font style */}
                          <h3 
                            className="text-2xl font-black tracking-tight mb-2"
                            style={{ 
                              color: "var(--text-primary)",
                              fontFamily: "inherit",
                            }}
                          >
                            {activity.title}
                          </h3>

                          {/* CTA on active */}
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2"
                            >
                              {activity.ready ? (
                                <span 
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                                    isDark 
                                      ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                                      : "bg-teal-500/15 text-teal-700 border-teal-500/30"
                                  }`}
                                >
                                  Click to start →
                                </span>
                              ) : (
                                <span 
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                                    isDark 
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                                  }`}
                                >
                                  Coming Soon ✨
                                </span>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Description */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg mt-6 mb-8 text-center h-7"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {activities[activeIndex].desc}
                </motion.p>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center gap-6">
                <button
                  onClick={prev}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--glass-border)",
                  }}
                  aria-label="Previous"
                >
                  <ArrowLeft style={{ color: "var(--text-primary)" }} size={20} />
                </button>

                {/* Dots */}
                <div className="flex gap-2">
                  {activities.map((activity, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      className={`
                        h-2 rounded-full transition-all duration-300
                        ${i === activeIndex
                          ? "w-8 bg-gradient-to-r from-teal-500 to-cyan-500"
                          : ""
                        }
                      `}
                      style={i !== activeIndex ? { 
                        width: "0.5rem",
                        background: !activity.ready 
                          ? (isDark ? "rgba(251, 191, 36, 0.4)" : "rgba(217, 119, 6, 0.3)")
                          : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)")
                      } : {}}
                      aria-label={`Go to activity ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={next}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--glass-border)",
                  }}
                  aria-label="Next"
                >
                  <ArrowRight style={{ color: "var(--text-primary)" }} size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer 
          className="py-6 text-center"
          style={{ borderTop: "1px solid var(--glass-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            More activities coming soon...
          </p>
        </footer>
      </div>
    </BackgroundPaths>
  );
}

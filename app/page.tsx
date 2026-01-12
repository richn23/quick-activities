"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { BackgroundPaths } from "@/components/ui/background-paths";
import GradientText from "@/components/ui/gradient-text";
import { SkyToggle } from "@/components/ui/sky-toggle";

const activities = [
  {
    id: "odd-one-out",
    title: "Odd One Out",
    desc: "Spot which item doesn't belong",
    icon: "🎯",
    gradient: "from-orange-500 to-rose-500",
    href: "/activities/odd-one-out",
    ready: true,
  },
  {
    id: "connections",
    title: "Connections",
    desc: "Group words into hidden categories",
    icon: "🔗",
    gradient: "from-violet-500 to-purple-600",
    href: "/activities/connections",
    ready: true,
  },
  {
    id: "whats-the-question",
    title: "What's the Question?",
    desc: "Given an answer, find the question",
    icon: "❓",
    gradient: "from-cyan-400 to-blue-500",
    href: "/activities/whats-the-question",
    ready: true,
  },
  {
    id: "cloze",
    title: "Simple Cloze",
    desc: "Fill in the missing words",
    icon: "📝",
    gradient: "from-emerald-400 to-teal-500",
    href: "/activities/cloze",
    ready: true,
  },
  {
    id: "this-or-that",
    title: "This or That",
    desc: "Spark debates with tough choices",
    icon: "⚖️",
    gradient: "from-pink-500 to-orange-400",
    href: "/activities/this-or-that",
    ready: true,
  },
  {
    id: "sentence-jumbles",
    title: "Sentence Jumbles",
    desc: "Reorder the words correctly",
    icon: "🔀",
    gradient: "from-teal-400 to-cyan-500",
    href: "/activities/sentence-jumbles",
    ready: true,
  },
  {
    id: "back-to-board-taboo",
    title: "Back to Board: Taboo",
    desc: "Describe without saying it",
    icon: "🗣️",
    gradient: "from-red-500 to-rose-500",
    href: "/activities/back-to-board-taboo",
    ready: true,
  },
  {
    id: "back-to-board-sentences",
    title: "Back to Board: Sentences",
    desc: "Describe word by word",
    icon: "📋",
    gradient: "from-amber-400 to-orange-500",
    href: "/activities/back-to-board-sentences",
    ready: true,
  },
  {
    id: "match-it",
    title: "Match It",
    desc: "Pair up the cards",
    icon: "🧩",
    gradient: "from-blue-500 to-indigo-500",
    href: "/activities/match-it",
    ready: true,
  },
];

// Animation variants for staggered grid
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function Home() {
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

  // Apply theme class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <BackgroundPaths isDark={isDark}>
      {/* Sky Toggle - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <SkyToggle isDark={isDark} onToggle={toggleTheme} />
      </div>
      
      <div className="flex flex-col min-h-screen">
        {/* Hero Section */}
        <header className="pt-12 md:pt-16 pb-6 md:pb-8 text-center px-4">
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

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 font-hero">
              <GradientText
                colors={isDark 
                  ? ["#2dd4bf", "#22d3ee", "#a78bfa", "#2dd4bf", "#22d3ee"]
                  : ["#0d9488", "#0891b2", "#7c3aed", "#0d9488", "#0891b2"]
                }
                animationSpeed={4}
                showBorder={false}
                className="text-4xl sm:text-5xl md:text-7xl font-black"
              >
                Quick Activities
              </GradientText>
            </h1>

            <p 
              className="text-lg md:text-xl font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              To make your teaching life easier
            </p>
          </motion.div>
        </header>

        {/* Two Column Layout: Explainer + Tiles */}
        <main className="flex-1 px-4 pb-8">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
            
            {/* Left Column - Explainer Cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:w-[340px] flex-shrink-0 space-y-4"
            >
              {/* Quick Prep Card */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-teal-500/20" : "bg-teal-500/10"
                  }`}>
                    <Sparkles className="text-teal-500" size={20} />
                  </div>
                  <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                    Quick Prep
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Set up in seconds with AI or go manual. Ready when you are.
                </p>
              </div>

              {/* Cognitive Challenge Card */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-violet-500/20" : "bg-violet-500/10"
                  }`}>
                    <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                    Cognitive Challenge
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Activities designed to engage critical thinking and spark discussion.
                </p>
              </div>

              {/* Anytime Use Card */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-cyan-500/20" : "bg-cyan-500/10"
                  }`}>
                    <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                    Anytime Use
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Warmers, reviews, last 10 mins of class. Pull them out when needed.
                </p>
              </div>
            </motion.div>

            {/* Right Column - Activity Grid */}
            <motion.div 
              className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {activities.map((activity) => (
                <motion.div key={activity.id} variants={itemVariants}>
                  <ActivityTile activity={activity} isDark={isDark} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer 
          className="py-6 text-center"
          style={{ borderTop: "1px solid var(--glass-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Made for language teachers
          </p>
        </footer>
      </div>
    </BackgroundPaths>
  );
}

// Activity Tile Component
interface Activity {
  id: string;
  title: string;
  desc: string;
  icon: string;
  gradient: string;
  href: string;
  ready: boolean;
}

function ActivityTile({ activity, isDark }: { activity: Activity; isDark: boolean }) {
  const content = (
    <div
      className={`
        group
        glass-card
        p-4 md:p-6
        flex flex-col items-center justify-center
        text-center
        transition-all duration-300
        h-[140px] md:h-[180px]
        ${activity.ready 
          ? "cursor-pointer hover:scale-105 active:scale-95" 
          : "cursor-default"
        }
        ${activity.ready 
          ? isDark 
            ? "hover:border-teal-500/50 hover:shadow-[0_0_30px_rgba(45,212,191,0.15)]" 
            : "hover:border-teal-500/40 hover:shadow-[0_8px_30px_rgba(13,148,136,0.15)]"
          : ""
        }
        relative overflow-hidden
        ${!activity.ready ? "opacity-75" : ""}
      `}
    >
      {/* Coming Soon Badge */}
      {!activity.ready && (
        <div className="absolute top-2 right-2 z-20">
          <span className={`
            px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider
            ${isDark 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-amber-500/15 text-amber-600 border border-amber-500/25"
            }
          `}>
            Soon
          </span>
        </div>
      )}
      
      {/* Icon */}
      <div
        className={`
          w-12 h-12 md:w-16 md:h-16 
          rounded-xl md:rounded-2xl 
          mb-3 md:mb-4 
          flex items-center justify-center
          bg-gradient-to-br ${activity.gradient}
          shadow-lg
          transition-transform duration-300
          ${activity.ready ? "group-hover:scale-110" : ""}
          ${!activity.ready ? "opacity-70 grayscale-[20%]" : ""}
        `}
      >
        <span className="text-2xl md:text-3xl">{activity.icon}</span>
      </div>

      {/* Title */}
      <h3 
        className="text-sm md:text-lg font-bold tracking-tight mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {activity.title}
      </h3>

      {/* Description - visible on md and up */}
      <p 
        className="text-xs md:text-sm hidden md:block leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {activity.desc}
      </p>
    </div>
  );

  if (activity.ready) {
    return <Link href={activity.href}>{content}</Link>;
  }

  return content;
}

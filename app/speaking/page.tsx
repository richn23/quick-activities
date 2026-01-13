"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Timer, Repeat, MessageSquare, Scale, Info, X } from "lucide-react";
import Link from "next/link";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { SkyToggle } from "@/components/ui/sky-toggle";

interface ActivityInfo {
  what: string;
  why: string;
  how: string;
  levels: string;
}

const speakingActivities = [
  {
    id: "timed-talk",
    title: "Timed Talk",
    desc: "Speak without stopping for a set time",
    icon: Timer,
    gradient: "from-rose-500 to-pink-500",
    href: "/speaking/timed-talk",
    ready: true,
    info: {
      what: "Students speak continuously on a topic for a set time (1–5 minutes), using prompt points to guide their response. Similar to IELTS Speaking Part 2.",
      why: "Builds fluency by removing the option to stop. Students learn to elaborate, self-correct on the fly, and fill time — essential real-world speaking skills.",
      how: "Show the prompt on screen, give 30 seconds thinking time, then start the timer. Students speak solo or in pairs while you monitor.",
      levels: "A1–C1. Adjust speaking time (shorter for lower levels) and prompt complexity.",
    },
  },
  {
    id: "4-3-2",
    title: "4-3-2",
    desc: "Same topic, decreasing time, new partner",
    icon: Repeat,
    gradient: "from-violet-500 to-purple-500",
    href: "/speaking/4-3-2",
    ready: true,
    info: {
      what: "Students talk about the same topic 3 times: 4 minutes, then 3 minutes, then 2 minutes — with a new partner each round.",
      why: "Research-backed fluency technique. Repetition builds confidence, decreasing time builds speed, and partner changes maintain engagement. Students naturally refine and compress their ideas.",
      how: "Display the prompt, run Round 1 (4 min), signal partner switch, run Round 2 (3 min), switch again, run Round 3 (2 min). Debrief at the end.",
      levels: "A2–C1. The technique works at all levels — just adjust prompt complexity.",
    },
  },
  {
    id: "question-cards",
    title: "Question Cards",
    desc: "Discussion prompts for pairs or groups",
    icon: MessageSquare,
    gradient: "from-cyan-500 to-blue-500",
    href: "/speaking/question-cards",
    ready: true,
    info: {
      what: "Discussion questions shown one at a time. Students discuss in pairs or small groups before moving to the next card.",
      why: "Removes the 'what should we talk about?' friction. Structured prompts get students talking immediately and keep momentum going.",
      how: "Display each card on the whiteboard. Pairs/groups discuss while you circulate. Move to the next card when ready — you control the pace.",
      levels: "A1–C1. Generate simpler questions for beginners, more abstract ones for advanced learners.",
    },
  },
  {
    id: "agree-disagree",
    title: "Agree / Disagree",
    desc: "Take a stance and defend it",
    icon: Scale,
    gradient: "from-amber-500 to-orange-500",
    href: "/speaking/agree-disagree",
    ready: true,
    info: {
      what: "Students see a statement and decide if they agree or disagree. After a class tally, students with opposing views pair up to discuss their reasons.",
      why: "Develops argumentation and critical thinking. Pairing opposing views creates genuine information gaps — students have real reasons to listen and respond.",
      how: "Show the statement, tally opinions visibly, then pair students with different views. Their goal is to understand the other perspective, not 'win'.",
      levels: "A2–C1. Use concrete everyday topics for lower levels, more abstract comparisons for higher levels.",
    },
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function SpeakingPage() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      if (document.documentElement.classList.contains("dark")) return true;
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  const [infoModal, setInfoModal] = useState<{
    title: string;
    info: ActivityInfo;
    gradient: string;
  } | null>(null);

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
      {/* Sky Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <SkyToggle isDark={isDark} onToggle={toggleTheme} />
      </div>

      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="pt-8 pb-6 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-2">
              <Link
                href="/"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-violet-500 transition-all"
              >
                <Home size={20} />
              </Link>
              <div>
                <h1
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Speaking Skills
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Teacher-led fluency and discussion activities
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 pb-8">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Column - Purpose/Advice */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:w-[340px] flex-shrink-0 space-y-4"
            >
              {/* Fluency Focus */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDark ? "bg-violet-500/20" : "bg-violet-500/10"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-violet-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </div>
                  <h3
                    className="font-bold text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Fluency Focus
                  </h3>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Speaking improves through practice, not correction. These activities prioritise getting words out.
                </p>
              </div>

              {/* Teacher-Led */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDark ? "bg-rose-500/20" : "bg-rose-500/10"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-rose-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <h3
                    className="font-bold text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Teacher-Led
                  </h3>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  You control the timing, grouping, and follow-up. The whiteboard supports — it doesn&apos;t dictate.
                </p>
              </div>

              {/* No Recording */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDark ? "bg-cyan-500/20" : "bg-cyan-500/10"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-cyan-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                  </div>
                  <h3
                    className="font-bold text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    No Recording
                  </h3>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Speaking is practice, not performance. No scores, no playback, no pressure.
                </p>
              </div>
            </motion.div>

            {/* Right Column - Activity Tiles */}
            <motion.div
              className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {speakingActivities.map((activity) => (
                <motion.div key={activity.id} variants={itemVariants}>
                  <ActivityTile
                    activity={activity}
                    isDark={isDark}
                    onInfoClick={() =>
                      setInfoModal({
                        title: activity.title,
                        info: activity.info,
                        gradient: activity.gradient,
                      })
                    }
                  />
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

      {/* Info Modal */}
      <AnimatePresence>
        {infoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setInfoModal(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg glass-card p-6 md:p-8 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setInfoModal(null)}
                className="absolute top-4 right-4 p-2 rounded-lg glass-card text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X size={20} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${infoModal.gradient}`}
                >
                  <Info size={24} className="text-white" />
                </div>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {infoModal.title}
                </h2>
              </div>

              {/* Content */}
              <div className="space-y-5">
                {/* What */}
                <div>
                  <h3
                    className="text-sm font-bold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    What is it?
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {infoModal.info.what}
                  </p>
                </div>

                {/* Why */}
                <div>
                  <h3
                    className="text-sm font-bold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Why does it work?
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {infoModal.info.why}
                  </p>
                </div>

                {/* How */}
                <div>
                  <h3
                    className="text-sm font-bold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    How to run it
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {infoModal.info.how}
                  </p>
                </div>

                {/* Levels */}
                <div>
                  <h3
                    className="text-sm font-bold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Suitable levels
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {infoModal.info.levels}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </BackgroundPaths>
  );
}

// Activity Tile Component
interface Activity {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  gradient: string;
  href: string;
  ready: boolean;
  info: ActivityInfo;
}

function ActivityTile({
  activity,
  isDark,
  onInfoClick,
}: {
  activity: Activity;
  isDark: boolean;
  onInfoClick: () => void;
}) {
  const Icon = activity.icon;

  const content = (
    <div
      className={`
        group
        glass-card
        p-6 md:p-8
        flex flex-col items-center justify-center
        text-center
        transition-all duration-300
        min-h-[200px]
        ${
          activity.ready
            ? "cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
            : "cursor-default opacity-75"
        }
        ${
          activity.ready
            ? isDark
              ? "hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]"
              : "hover:border-violet-500/40 hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)]"
            : ""
        }
        relative overflow-hidden
      `}
    >
      {/* Info Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onInfoClick();
        }}
        className={`
          absolute top-3 left-3 z-20
          w-8 h-8 rounded-lg
          flex items-center justify-center
          transition-all
          ${
            isDark
              ? "bg-white/10 hover:bg-white/20 text-white/60 hover:text-white"
              : "bg-black/5 hover:bg-black/10 text-black/40 hover:text-black/70"
          }
        `}
      >
        <Info size={16} />
      </button>

      {/* Coming Soon Badge */}
      {!activity.ready && (
        <div className="absolute top-3 right-3 z-20">
          <span
            className={`
              px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
              ${
                isDark
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-amber-500/15 text-amber-600 border border-amber-500/25"
              }
            `}
          >
            Soon
          </span>
        </div>
      )}

      {/* Icon */}
      <div
        className={`
          w-16 h-16 md:w-20 md:h-20
          rounded-2xl
          mb-4
          flex items-center justify-center
          bg-gradient-to-br ${activity.gradient}
          shadow-lg
          transition-transform duration-300
          ${activity.ready ? "group-hover:scale-110" : ""}
          ${!activity.ready ? "opacity-70 grayscale-[20%]" : ""}
        `}
      >
        <Icon size={32} className="text-white" />
      </div>

      {/* Title */}
      <h3
        className="text-lg md:text-xl font-bold tracking-tight mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        {activity.title}
      </h3>

      {/* Description */}
      <p
        className="text-sm leading-relaxed"
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

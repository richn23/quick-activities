"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Settings,
  ChevronRight,
  RefreshCw,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

type ScaleType = "simple" | "extended";

interface SessionData {
  statement: string;
  scaleType: ScaleType;
  showFeedback: boolean;
}

type SlideType =
  | "instructions"
  | "thinking"
  | "tally"
  | "pairing"
  | "discussion"
  | "reflection"
  | "exit";

export default function AgreeDisagreePresent() {
  const router = useRouter();

  // Dark mode
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      if (document.documentElement.classList.contains("dark")) return true;
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Session data
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentSlide, setCurrentSlide] = useState<SlideType>("instructions");

  // Tally state
  const [tally, setTally] = useState({
    stronglyAgree: 0,
    agree: 0,
    disagree: 0,
    stronglyDisagree: 0,
  });

  // Load session
  useEffect(() => {
    const stored = sessionStorage.getItem("agreeDisagreeData");
    if (stored) {
      try {
        const data = JSON.parse(stored) as SessionData;
        setSession(data);
      } catch {
        router.push("/speaking/agree-disagree");
      }
    } else {
      router.push("/speaking/agree-disagree");
    }
  }, [router]);

  // Slide sequence
  const getNextSlide = (current: SlideType): SlideType | null => {
    const sequence: SlideType[] = [
      "instructions",
      "thinking",
      "tally",
      "pairing",
      "discussion",
    ];
    
    if (session?.showFeedback) {
      sequence.push("reflection");
    }
    sequence.push("exit");

    const currentIndex = sequence.indexOf(current);
    if (currentIndex < sequence.length - 1) {
      return sequence[currentIndex + 1];
    }
    return null;
  };

  const nextSlide = () => {
    const next = getNextSlide(currentSlide);
    if (next) {
      setCurrentSlide(next);
    }
  };

  // Tally functions
  const incrementTally = (key: keyof typeof tally) => {
    setTally((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  };

  const decrementTally = (key: keyof typeof tally) => {
    setTally((prev) => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }));
  };

  const resetTally = () => {
    setTally({
      stronglyAgree: 0,
      agree: 0,
      disagree: 0,
      stronglyDisagree: 0,
    });
  };

  // Loading
  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render slide content
  const renderSlide = () => {
    switch (currentSlide) {
      case "instructions":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2
              className="text-4xl md:text-6xl font-black mb-8"
              style={{ color: "var(--text-primary)" }}
            >
              Agree / Disagree
            </h2>

            <div className="glass-card p-8 md:p-12 text-left">
              <ul
                className="space-y-4 text-xl md:text-2xl"
                style={{ color: "var(--text-secondary)" }}
              >
                <li>• Read the statement carefully</li>
                <li>• Decide what you think</li>
                <li>• Be ready to explain your reasons</li>
                <li>• Listen to different opinions respectfully</li>
              </ul>
            </div>

            <button
              onClick={nextSlide}
              className="mt-8 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              Continue
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "thinking":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <p
              className="text-xl md:text-2xl mb-6"
              style={{ color: "var(--text-muted)" }}
            >
              STATEMENT
            </p>

            <div className="glass-card p-8 md:p-12 mb-8">
              <p
                className="text-2xl md:text-4xl font-bold leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              >
                &quot;{session.statement}&quot;
              </p>
            </div>

            <p
              className="text-lg md:text-xl mb-8"
              style={{ color: "var(--text-secondary)" }}
            >
              Take a moment to think.
              <br />
              Do you agree or disagree?
            </p>

            <button
              onClick={nextSlide}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              Show options
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "tally":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-5xl mx-auto"
          >
            <p
              className="text-xl md:text-2xl mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              What do you think?
            </p>

            {/* Statement */}
            <div className="glass-card p-6 mb-8">
              <p
                className="text-xl md:text-2xl font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                &quot;{session.statement}&quot;
              </p>
            </div>

            {/* Tally Controls */}
            {session.scaleType === "simple" ? (
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Agree */}
                <div className="glass-card p-6">
                  <h3
                    className="text-xl font-bold mb-4 text-green-500"
                  >
                    Agree
                  </h3>
                  <div
                    className="text-6xl md:text-7xl font-black mb-4 tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tally.agree}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => decrementTally("agree")}
                      className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-red-500 transition-all"
                    >
                      <Minus size={24} />
                    </button>
                    <button
                      onClick={() => incrementTally("agree")}
                      className="p-3 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>

                {/* Disagree */}
                <div className="glass-card p-6">
                  <h3
                    className="text-xl font-bold mb-4 text-red-500"
                  >
                    Disagree
                  </h3>
                  <div
                    className="text-6xl md:text-7xl font-black mb-4 tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tally.disagree}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => decrementTally("disagree")}
                      className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-red-500 transition-all"
                    >
                      <Minus size={24} />
                    </button>
                    <button
                      onClick={() => incrementTally("disagree")}
                      className="p-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Strongly Agree */}
                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold mb-2 text-green-600">
                    Strongly Agree
                  </h3>
                  <div
                    className="text-4xl md:text-5xl font-black mb-3 tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tally.stronglyAgree}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => decrementTally("stronglyAgree")}
                      className="p-2 rounded-lg glass-card text-[var(--text-primary)] hover:text-red-500 transition-all"
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      onClick={() => incrementTally("stronglyAgree")}
                      className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Agree */}
                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold mb-2 text-green-500">
                    Agree
                  </h3>
                  <div
                    className="text-4xl md:text-5xl font-black mb-3 tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tally.agree}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => decrementTally("agree")}
                      className="p-2 rounded-lg glass-card text-[var(--text-primary)] hover:text-red-500 transition-all"
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      onClick={() => incrementTally("agree")}
                      className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Disagree */}
                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold mb-2 text-red-500">
                    Disagree
                  </h3>
                  <div
                    className="text-4xl md:text-5xl font-black mb-3 tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tally.disagree}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => decrementTally("disagree")}
                      className="p-2 rounded-lg glass-card text-[var(--text-primary)] hover:text-red-500 transition-all"
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      onClick={() => incrementTally("disagree")}
                      className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Strongly Disagree */}
                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold mb-2 text-red-600">
                    Strongly Disagree
                  </h3>
                  <div
                    className="text-4xl md:text-5xl font-black mb-3 tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tally.stronglyDisagree}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => decrementTally("stronglyDisagree")}
                      className="p-2 rounded-lg glass-card text-[var(--text-primary)] hover:text-red-500 transition-all"
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      onClick={() => incrementTally("stronglyDisagree")}
                      className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reset & Next */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={resetTally}
                className="px-6 py-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-amber-500 font-medium flex items-center gap-2 transition-all"
              >
                <RotateCcw size={18} />
                Reset
              </button>
              <button
                onClick={nextSlide}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg flex items-center gap-2 hover:scale-105 transition-all"
              >
                Pair students
                <ChevronRight size={24} />
              </button>
            </div>
          </motion.div>
        );

      case "pairing":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2
              className="text-3xl md:text-5xl font-black mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Pair up with someone
            </h2>

            <p
              className="text-2xl md:text-3xl mb-8"
              style={{ color: "var(--text-primary)" }}
            >
              who has a <span className="text-amber-500">different opinion</span>.
            </p>

            <p
              className="text-xl mb-12"
              style={{ color: "var(--text-secondary)" }}
            >
              Try to understand their reasons.
            </p>

            <button
              onClick={nextSlide}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              Start discussion
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "discussion":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <p
              className="text-xl mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Discuss with your partner:
            </p>

            <div className="glass-card p-8 md:p-12 text-left">
              <ul
                className="space-y-4 text-xl md:text-2xl"
                style={{ color: "var(--text-secondary)" }}
              >
                <li>• Why do you think this?</li>
                <li>• What examples support your opinion?</li>
                <li>• Did anything make you reconsider?</li>
              </ul>
            </div>

            <button
              onClick={nextSlide}
              className="mt-8 px-8 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-amber-500 font-bold text-lg flex items-center gap-2 mx-auto transition-all"
            >
              Continue
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "reflection":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <p
              className="text-xl mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              REFLECTION
            </p>

            <div className="glass-card p-8 md:p-12 text-left">
              <ul
                className="space-y-4 text-xl md:text-2xl"
                style={{ color: "var(--text-secondary)" }}
              >
                <li>• Did anyone change their opinion?</li>
                <li>• What reasons were convincing?</li>
                <li>• Were there any surprises?</li>
              </ul>
            </div>

            <button
              onClick={nextSlide}
              className="mt-8 px-8 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-amber-500 font-bold text-lg flex items-center gap-2 mx-auto transition-all"
            >
              Continue
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "exit":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2
              className="text-3xl md:text-5xl font-black mb-8"
              style={{ color: "var(--text-primary)" }}
            >
              What would you like to do next?
            </h2>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setCurrentSlide("instructions");
                  resetTally();
                }}
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-amber-500 font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={20} />
                Repeat with same statement
              </button>

              <Link
                href="/speaking/agree-disagree"
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-amber-500 font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                <Settings size={20} />
                Create new statement
              </Link>

              <Link
                href="/speaking"
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-all"
              >
                <Home size={20} />
                Exit to Speaking
              </Link>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
      <AnimatedPaths isDark={isDark} />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <Link
              href="/speaking"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-amber-500 transition-all"
            >
              <Home size={20} />
            </Link>
            <Link
              href="/speaking/agree-disagree"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-amber-500 transition-all"
            >
              <Settings size={20} />
            </Link>
          </div>

          <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-8 py-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {renderSlide()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

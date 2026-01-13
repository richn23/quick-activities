"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Settings,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface SessionData {
  prompt: string;
  rounds: number[];
  interactionMode: "pairs" | "groups";
  showFeedback: boolean;
}

type SlideType =
  | "instructions"
  | "thinking"
  | "get-ready"
  | "round"
  | "switch"
  | "reflection"
  | "exit";

interface Slide {
  type: SlideType;
  roundIndex?: number;
}

export default function FourThreeTwoPresent() {
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
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [thinkingSeconds, setThinkingSeconds] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load session
  useEffect(() => {
    const stored = sessionStorage.getItem("fourThreeTwoData");
    if (stored) {
      try {
        const data = JSON.parse(stored) as SessionData;
        setSession(data);

        // Build slide sequence
        const slideSequence: Slide[] = [
          { type: "instructions" },
          { type: "thinking" },
          { type: "get-ready" },
        ];

        data.rounds.forEach((_, index) => {
          slideSequence.push({ type: "round", roundIndex: index });
          if (index < data.rounds.length - 1) {
            slideSequence.push({ type: "switch", roundIndex: index });
          }
        });

        if (data.showFeedback) {
          slideSequence.push({ type: "reflection" });
        }
        slideSequence.push({ type: "exit" });

        setSlides(slideSequence);
      } catch {
        router.push("/speaking/4-3-2");
      }
    } else {
      router.push("/speaking/4-3-2");
    }
  }, [router]);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setTimerSeconds((t) => t - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      playTimerEndSound();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timerSeconds]);

  // Thinking timer logic
  useEffect(() => {
    const currentSlideData = slides[currentSlide];
    if (currentSlideData?.type === "thinking" && thinkingSeconds > 0) {
      const timer = setTimeout(() => {
        setThinkingSeconds((t) => t - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, slides, thinkingSeconds]);

  // Play sound when timer ends
  const playTimerEndSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      oscillator.start();
      oscillator.frequency.setValueAtTime(550, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      // Silent fail
    }
  }, []);

  // Navigation
  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      const nextSlideData = slides[currentSlide + 1];

      // Reset timer for round slides
      if (nextSlideData.type === "round" && session) {
        setTimerSeconds(session.rounds[nextSlideData.roundIndex!] * 60);
        setTimerRunning(false);
      }

      // Reset thinking timer
      if (nextSlideData.type === "thinking") {
        setThinkingSeconds(30);
      }

      setCurrentSlide((c) => c + 1);
    }
  }, [currentSlide, slides, session]);

  // Timer controls
  const toggleTimer = () => setTimerRunning((r) => !r);

  const resetTimer = () => {
    const currentSlideData = slides[currentSlide];
    if (currentSlideData.type === "round" && session) {
      setTimerSeconds(session.rounds[currentSlideData.roundIndex!] * 60);
      setTimerRunning(false);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading
  if (!session || slides.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];

  // Render slide content
  const renderSlide = () => {
    switch (currentSlideData.type) {
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
              4-3-2 Speaking
            </h2>

            <div className="glass-card p-8 md:p-12 text-left space-y-6">
              <div>
                <h3
                  className="text-xl font-bold mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Your goal:
                </h3>
                <ul
                  className="space-y-2 text-lg"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <li>• Speak more fluently each time</li>
                  <li>• Say the same ideas more clearly</li>
                  <li>• Don't worry about mistakes</li>
                </ul>
              </div>

              <div>
                <h3
                  className="text-xl font-bold mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  For the listening partner:
                </h3>
                <ul
                  className="space-y-2 text-lg"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <li>• Listen actively</li>
                  <li>• Do not interrupt</li>
                  <li>• Encourage your partner</li>
                </ul>
              </div>
            </div>

            <button
              onClick={nextSlide}
              className="mt-8 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
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
              TOPIC
            </p>

            <div className="glass-card p-8 md:p-12 mb-8">
              <p
                className="text-2xl md:text-4xl font-bold leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              >
                "{session.prompt}"
              </p>
            </div>

            <p
              className="text-lg md:text-xl mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Take a moment to think.
              <br />
              What are the key ideas you want to include?
            </p>

            <div className="flex items-center justify-center gap-2 mb-8">
              <span style={{ color: "var(--text-muted)" }}>⏱ Thinking time:</span>
              <span
                className={`text-2xl font-bold tabular-nums ${
                  thinkingSeconds <= 5 ? "text-red-500" : ""
                }`}
                style={{ color: thinkingSeconds > 5 ? "var(--text-primary)" : undefined }}
              >
                {thinkingSeconds}s
              </span>
            </div>

            <button
              onClick={nextSlide}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              Get ready
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "get-ready":
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
              Get ready to speak.
            </h2>

            <p
              className="text-xl md:text-2xl mb-12"
              style={{ color: "var(--text-secondary)" }}
            >
              You will speak without stopping.
              <br />
              Focus on getting your ideas out clearly.
            </p>

            <button
              onClick={nextSlide}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              <Play size={24} />
              Start Round 1
            </button>
          </motion.div>
        );

      case "round":
        const roundNum = currentSlideData.roundIndex! + 1;
        const isLastRound = roundNum === session.rounds.length;
        const roundLabel = isLastRound ? "FINAL ROUND" : `ROUND ${roundNum}`;

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <p
              className="text-xl md:text-2xl font-bold mb-2"
              style={{ color: isLastRound ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {roundLabel}
            </p>

            <p className="text-lg mb-6" style={{ color: "var(--text-muted)" }}>
              Time: {session.rounds[currentSlideData.roundIndex!]} minutes
            </p>

            {/* Timer */}
            <div
              className={`text-8xl md:text-9xl font-black tabular-nums mb-8 transition-colors ${
                timerSeconds <= 10 && timerSeconds > 0
                  ? "text-red-500 animate-pulse"
                  : timerSeconds === 0
                  ? "text-red-500"
                  : ""
              }`}
              style={{
                color:
                  timerSeconds > 10 ? "var(--text-primary)" : undefined,
              }}
            >
              {formatTime(timerSeconds)}
            </div>

            {/* Prompt */}
            <div className="glass-card p-6 md:p-8 mb-8">
              <p
                className="text-xl md:text-2xl font-medium leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              >
                "{session.prompt}"
              </p>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={toggleTimer}
                className={`p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                  timerRunning
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25"
                    : "glass-card text-[var(--text-primary)] hover:text-violet-500"
                }`}
              >
                {timerRunning ? <Pause size={28} /> : <Play size={28} />}
              </button>

              <button
                onClick={resetTimer}
                className="p-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-violet-500 transition-all"
              >
                <RotateCcw size={28} />
              </button>
            </div>

            <button
              onClick={nextSlide}
              className="px-8 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-violet-500 font-bold text-lg flex items-center gap-2 mx-auto transition-all"
            >
              Next
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "switch":
        const nextRoundNum = currentSlideData.roundIndex! + 2;
        const isNextLast = nextRoundNum === session.rounds.length;

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
              Time's up.
            </h2>

            <p
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Switch partner.
            </p>

            <p
              className="text-xl md:text-2xl mb-12"
              style={{ color: "var(--text-secondary)" }}
            >
              {isNextLast
                ? "This should be your most fluent round.\nFocus on key ideas only."
                : "Try to say the same ideas,\nbut a little more clearly this time."}
            </p>

            <button
              onClick={nextSlide}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              <Play size={24} />
              {isNextLast ? "Start Final Round" : `Start Round ${nextRoundNum}`}
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
              className="text-xl md:text-2xl mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              REFLECTION
            </p>

            <h2
              className="text-3xl md:text-5xl font-black mb-8"
              style={{ color: "var(--text-primary)" }}
            >
              Discuss as a class:
            </h2>

            <div className="glass-card p-8 md:p-12 text-left">
              <ul
                className="space-y-4 text-xl md:text-2xl"
                style={{ color: "var(--text-secondary)" }}
              >
                <li>• What became easier?</li>
                <li>• What changed each round?</li>
                <li>• Which round felt most fluent?</li>
              </ul>
            </div>

            <button
              onClick={nextSlide}
              className="mt-8 px-8 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-violet-500 font-bold text-lg flex items-center gap-2 mx-auto transition-all"
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
                  setCurrentSlide(0);
                  setThinkingSeconds(30);
                }}
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-violet-500 font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={20} />
                Repeat from the start
              </button>

              <Link
                href="/speaking/4-3-2"
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-violet-500 font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                <Settings size={20} />
                Create new topic
              </Link>

              <Link
                href="/speaking"
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-all"
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
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-violet-500 transition-all"
            >
              <Home size={20} />
            </Link>
            <Link
              href="/speaking/4-3-2"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-violet-500 transition-all"
            >
              <Settings size={20} />
            </Link>
          </div>

          <span
            className="px-4 py-2 rounded-full glass-card text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {currentSlide + 1} / {slides.length}
          </span>

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

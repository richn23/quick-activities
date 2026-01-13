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

type TimerMode = "countdown" | "countup";

interface PromptData {
  question: string;
  points: string[];
}

interface SessionData {
  prompt: PromptData;
  speakingMinutes: number;
  timerMode: TimerMode;
  showFeedback: boolean;
}

type SlideType = "instructions" | "preparation" | "speaking" | "reflection" | "exit";

export default function TimedTalkPresent() {
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

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [thinkingSeconds, setThinkingSeconds] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load session
  useEffect(() => {
    const stored = sessionStorage.getItem("timedTalkData");
    if (stored) {
      try {
        const data = JSON.parse(stored) as SessionData;
        setSession(data);
        
        // Set initial timer based on mode
        if (data.timerMode === "countdown") {
          setTimerSeconds(data.speakingMinutes * 60);
        } else {
          setTimerSeconds(0);
        }
      } catch {
        router.push("/speaking/timed-talk");
      }
    } else {
      router.push("/speaking/timed-talk");
    }
  }, [router]);

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

  // Main timer logic
  useEffect(() => {
    if (!session || !timerRunning) return;

    if (session.timerMode === "countdown") {
      if (timerSeconds > 0) {
        timerRef.current = setTimeout(() => {
          setTimerSeconds((t) => t - 1);
        }, 1000);
      } else {
        setTimerRunning(false);
        playTimerEndSound();
      }
    } else {
      // Count up
      const targetSeconds = session.speakingMinutes * 60;
      if (timerSeconds < targetSeconds) {
        timerRef.current = setTimeout(() => {
          setTimerSeconds((t) => t + 1);
        }, 1000);
      } else {
        setTimerRunning(false);
        playTimerEndSound();
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timerSeconds, session, playTimerEndSound]);

  // Thinking timer logic
  useEffect(() => {
    if (currentSlide === "preparation" && thinkingSeconds > 0) {
      const timer = setTimeout(() => {
        setThinkingSeconds((t) => t - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, thinkingSeconds]);

  // Slide navigation
  const getNextSlide = (current: SlideType): SlideType | null => {
    const sequence: SlideType[] = ["instructions", "preparation", "speaking"];
    
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
      // Reset timer when entering speaking slide
      if (next === "speaking" && session) {
        if (session.timerMode === "countdown") {
          setTimerSeconds(session.speakingMinutes * 60);
        } else {
          setTimerSeconds(0);
        }
        setTimerRunning(false);
      }
      setCurrentSlide(next);
    }
  };

  // Timer controls
  const toggleTimer = () => setTimerRunning((r) => !r);

  const resetTimer = () => {
    if (session) {
      if (session.timerMode === "countdown") {
        setTimerSeconds(session.speakingMinutes * 60);
      } else {
        setTimerSeconds(0);
      }
      setTimerRunning(false);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Check if timer is near end
  const isTimerNearEnd = () => {
    if (!session) return false;
    if (session.timerMode === "countdown") {
      return timerSeconds <= 10 && timerSeconds > 0;
    } else {
      const targetSeconds = session.speakingMinutes * 60;
      return timerSeconds >= targetSeconds - 10 && timerSeconds < targetSeconds;
    }
  };

  const isTimerComplete = () => {
    if (!session) return false;
    if (session.timerMode === "countdown") {
      return timerSeconds === 0;
    } else {
      return timerSeconds >= session.speakingMinutes * 60;
    }
  };

  // Loading
  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
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
              Timed Talk
            </h2>

            <div className="glass-card p-8 md:p-12 text-left">
              <ul
                className="space-y-4 text-xl md:text-2xl"
                style={{ color: "var(--text-secondary)" }}
              >
                <li>• You will speak for a set amount of time</li>
                <li>• Use the points to help organise your ideas</li>
                <li>• Don't worry about mistakes</li>
                <li>• Focus on communicating clearly</li>
              </ul>
            </div>

            <button
              onClick={nextSlide}
              className="mt-8 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              Continue
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "preparation":
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

            <div className="glass-card p-8 md:p-10 mb-6">
              <p
                className="text-2xl md:text-4xl font-bold mb-6 leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              >
                {session.prompt.question}
              </p>

              {session.prompt.points.length > 0 && (
                <>
                  <p
                    className="text-lg mb-4"
                    style={{ color: "var(--text-muted)" }}
                  >
                    You should talk about:
                  </p>
                  <ul className="space-y-2 text-left max-w-lg mx-auto">
                    {session.prompt.points.map((point, index) => (
                      <li
                        key={index}
                        className="text-lg md:text-xl"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        • {point}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <p
              className="text-lg mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Take a short moment to prepare.
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
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              <Play size={24} />
              Start speaking
            </button>
          </motion.div>
        );

      case "speaking":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <p
              className="text-xl md:text-2xl mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              TIMED TALK
            </p>

            {/* Question */}
            <h2
              className="text-2xl md:text-3xl font-bold mb-6"
              style={{ color: "var(--text-primary)" }}
            >
              {session.prompt.question}
            </h2>

            {/* Timer */}
            <div
              className={`text-8xl md:text-9xl font-black tabular-nums mb-6 transition-colors ${
                isTimerNearEnd()
                  ? "text-red-500 animate-pulse"
                  : isTimerComplete()
                  ? "text-red-500"
                  : ""
              }`}
              style={{
                color: !isTimerNearEnd() && !isTimerComplete() ? "var(--text-primary)" : undefined,
              }}
            >
              {formatTime(timerSeconds)}
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={toggleTimer}
                className={`p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                  timerRunning
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25"
                    : "glass-card text-[var(--text-primary)] hover:text-rose-500"
                }`}
              >
                {timerRunning ? <Pause size={28} /> : <Play size={28} />}
              </button>

              <button
                onClick={resetTimer}
                className="p-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-rose-500 transition-all"
              >
                <RotateCcw size={28} />
              </button>
            </div>

            {/* Prompt Points (smaller) */}
            {session.prompt.points.length > 0 && (
              <div className="glass-card p-4 max-w-2xl mx-auto mb-6">
                <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                  {session.prompt.points.map((point, index) => (
                    <li
                      key={index}
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      • {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={nextSlide}
              className="px-8 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-rose-500 font-bold text-lg flex items-center gap-2 mx-auto transition-all"
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

            <h2
              className="text-3xl md:text-4xl font-black mb-8"
              style={{ color: "var(--text-primary)" }}
            >
              Discuss as a class:
            </h2>

            <div className="glass-card p-8 md:p-12 text-left">
              <ul
                className="space-y-4 text-xl md:text-2xl"
                style={{ color: "var(--text-secondary)" }}
              >
                <li>• Was it easy or difficult to keep speaking?</li>
                <li>• Which points were easiest to talk about?</li>
                <li>• What would you add with more time?</li>
              </ul>
            </div>

            <button
              onClick={nextSlide}
              className="mt-8 px-8 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-rose-500 font-bold text-lg flex items-center gap-2 mx-auto transition-all"
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
                  setThinkingSeconds(30);
                  resetTimer();
                }}
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-rose-500 font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={20} />
                Repeat with same prompt
              </button>

              <Link
                href="/speaking/timed-talk"
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-rose-500 font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                <Settings size={20} />
                Create new timed talk
              </Link>

              <Link
                href="/speaking"
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-all"
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
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-rose-500 transition-all"
            >
              <Home size={20} />
            </Link>
            <Link
              href="/speaking/timed-talk"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-rose-500 transition-all"
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

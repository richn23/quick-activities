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
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface Card {
  id: string;
  prompt: string;
}

interface SessionData {
  cards: Card[];
  timerEnabled: boolean;
  timerMinutes: number;
  showFeedback: boolean;
}

type SlideType = "instructions" | "card-hidden" | "card-revealed" | "feedback" | "exit";

interface Slide {
  type: SlideType;
  cardIndex?: number;
}

export default function QuestionCardsPresent() {
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load session
  useEffect(() => {
    const stored = sessionStorage.getItem("questionCardsData");
    if (stored) {
      try {
        const data = JSON.parse(stored) as SessionData;
        setSession(data);

        // Build slide sequence
        const slideSequence: Slide[] = [{ type: "instructions" }];

        data.cards.forEach((_, index) => {
          slideSequence.push({ type: "card-hidden", cardIndex: index });
          slideSequence.push({ type: "card-revealed", cardIndex: index });
          if (data.showFeedback) {
            slideSequence.push({ type: "feedback", cardIndex: index });
          }
        });

        slideSequence.push({ type: "exit" });
        setSlides(slideSequence);

        // Set initial timer
        if (data.timerEnabled) {
          setTimerSeconds(data.timerMinutes * 60);
        }
      } catch {
        router.push("/speaking/question-cards");
      }
    } else {
      router.push("/speaking/question-cards");
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

      // Reset timer for revealed cards
      if (nextSlideData.type === "card-revealed" && session?.timerEnabled) {
        setTimerSeconds(session.timerMinutes * 60);
        setTimerRunning(false);
      }

      setCurrentSlide((c) => c + 1);
    }
  }, [currentSlide, slides, session]);

  // Timer controls
  const toggleTimer = () => setTimerRunning((r) => !r);

  const resetTimer = () => {
    if (session?.timerEnabled) {
      setTimerSeconds(session.timerMinutes * 60);
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
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];
  const currentCard =
    currentSlideData.cardIndex !== undefined
      ? session.cards[currentSlideData.cardIndex]
      : null;

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
              Speaking Cards
            </h2>

            <div className="glass-card p-8 md:p-12 text-left">
              <ul
                className="space-y-4 text-xl md:text-2xl"
                style={{ color: "var(--text-secondary)" }}
              >
                <li>• One question at a time</li>
                <li>• Take turns speaking</li>
                <li>• Listen actively</li>
                <li>• Respond naturally</li>
              </ul>

              <p
                className="mt-8 text-lg"
                style={{ color: "var(--text-muted)" }}
              >
                There are no right answers.
              </p>
            </div>

            <button
              onClick={nextSlide}
              className="mt-8 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              Start
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "card-hidden":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <p
              className="text-lg mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Card {currentSlideData.cardIndex! + 1} of {session.cards.length}
            </p>

            <h2
              className="text-3xl md:text-5xl font-black mb-8"
              style={{ color: "var(--text-primary)" }}
            >
              Speaking Card
            </h2>

            {/* Card back */}
            <motion.div
              className="glass-card p-12 md:p-16 mb-8 cursor-pointer hover:scale-[1.02] transition-transform"
              onClick={nextSlide}
              whileHover={{ rotateY: 5 }}
            >
              <MessageSquare
                size={64}
                className="mx-auto mb-4 text-cyan-500"
              />
              <p
                className="text-xl md:text-2xl"
                style={{ color: "var(--text-secondary)" }}
              >
                Turn over the card.
              </p>
            </motion.div>

            <button
              onClick={nextSlide}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg flex items-center gap-2 mx-auto hover:scale-105 transition-all"
            >
              Reveal card
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "card-revealed":
        return (
          <motion.div
            initial={{ opacity: 0, rotateY: -90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-4xl mx-auto"
          >
            <p
              className="text-lg mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Card {currentSlideData.cardIndex! + 1} of {session.cards.length}
            </p>

            {/* Card front */}
            <div className="glass-card p-8 md:p-12 mb-8">
              <p
                className="text-2xl md:text-4xl font-bold leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              >
                {currentCard?.prompt}
              </p>

              <p
                className="mt-6 text-lg"
                style={{ color: "var(--text-muted)" }}
              >
                Take turns speaking.
                <br />
                Ask follow-up questions if you can.
              </p>
            </div>

            {/* Timer */}
            {session.timerEnabled && (
              <div className="mb-8">
                <div
                  className={`text-6xl md:text-7xl font-black tabular-nums mb-4 transition-colors ${
                    timerSeconds <= 10 && timerSeconds > 0
                      ? "text-red-500 animate-pulse"
                      : timerSeconds === 0
                      ? "text-red-500"
                      : ""
                  }`}
                  style={{
                    color: timerSeconds > 10 ? "var(--text-primary)" : undefined,
                  }}
                >
                  {formatTime(timerSeconds)}
                </div>

                {/* Timer Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={toggleTimer}
                    className={`p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      timerRunning
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                        : "glass-card text-[var(--text-primary)] hover:text-cyan-500"
                    }`}
                  >
                    {timerRunning ? <Pause size={24} /> : <Play size={24} />}
                  </button>

                  <button
                    onClick={resetTimer}
                    className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
                  >
                    <RotateCcw size={24} />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={nextSlide}
              className="px-8 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-cyan-500 font-bold text-lg flex items-center gap-2 mx-auto transition-all"
            >
              Next
              <ChevronRight size={24} />
            </button>
          </motion.div>
        );

      case "feedback":
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
              Quick reflection
            </p>

            <div className="glass-card p-8 md:p-12 text-left">
              <ul
                className="space-y-4 text-xl md:text-2xl"
                style={{ color: "var(--text-secondary)" }}
              >
                <li>• What did you agree or disagree on?</li>
                <li>• Did anyone change their mind?</li>
                <li>• What was interesting?</li>
              </ul>
            </div>

            <button
              onClick={nextSlide}
              className="mt-8 px-8 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-cyan-500 font-bold text-lg flex items-center gap-2 mx-auto transition-all"
            >
              Next card
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
              className="text-3xl md:text-5xl font-black mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              That&apos;s the end of the cards.
            </h2>

            <p
              className="text-xl mb-8"
              style={{ color: "var(--text-secondary)" }}
            >
              What would you like to do next?
            </p>

            <div className="space-y-4">
              <button
                onClick={() => setCurrentSlide(0)}
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-cyan-500 font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={20} />
                Repeat with same cards
              </button>

              <Link
                href="/speaking/question-cards"
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-cyan-500 font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                <Settings size={20} />
                Create new cards
              </Link>

              <Link
                href="/speaking"
                className="w-full max-w-md mx-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-all"
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
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
            >
              <Home size={20} />
            </Link>
            <Link
              href="/speaking/question-cards"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
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

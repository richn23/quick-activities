"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  Play,
  Pause,
  Volume2,
  RotateCw
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface GameData {
  sets: { question: string; answer: string }[];
  displayMode: "one-at-a-time" | "all-at-once";
  timerEnabled: boolean;
  timerSeconds: number;
}

export default function WhatsTheQuestionPlay() {
  const router = useRouter();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dark mode state
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

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVozbr/NzZRwVlFsvN/Xq3tmV2qVy97Jg1UHElzC+vryp3hcSHaaxdrMmWs7Rn6t0NKueDIGQJvd8u+cYT5Yps3gxZBhNEJwpdPUtYRPMlyPwdnNoXFRV4G42d3AknFPSXOo0NzCkWg1QXeq0drBk2g9TXyo0tzBkWg8TXyo0tzBkWk8TXyo0tzBkWk8Tnyo0tzBkWk8Tnyo0tzBkWk8Tnyo0t3BkWk8Tnyo0t3BkWk8T3yo0t3BkWk9T3yo0t3BkWk9T3yo0t3BkWk9T3yo0t3Ckmo9T3yo0t7Ckmo9UHyo0t7Ckmo9UHyo0t7Ckmo9UHyo0t7Ckmo9UHyo0t7Dk2s9UHyo0t7Dk2s9UHyo0t7Dk2s+UHyo0t7Dk2s+UH2o0t7Dk2s+UH2o0t/Dk2s+UH2o0t/Dk2s+UH2p0t/Dk2s+UH2p0t/Ek2s+UH2p0t/Ek2w+UX2p0t/Ek2w+UX2p0t/Ek2w+UX2p0+DEk2w+UX2p0+DEk2w+UX6p0+DElGw+UX6p0+DElGw+UX6p0+DElGw+UX6p0+DElGw/UX6p0+DFlGw/UX6p0+DFlGw/UX6p0+DFlGw/UX6p0+DFlG0/UX6p0+DFlG0/Un6p0+DFlG0/Un6p0+DFlG0/Un6p0+HFlG0/Un6q0+HFlG0/Un6q0+HFlW0/Un6q0+HFlW0/Un6q0+HGlW0/Un6q0+HGlW0/Un+q0+HGlW0/Un+q0+HGlW0/Un+q0+HGlW4/Un+q0+HGlW4/Un+q0+HGlW4/U3+q0+HGlW4/U3+q0+LGlW4/U3+q0+LGlW4/U3+q0+LGlW4/U3+q0+LGlW4/U3+q0+LGlW4/U3+q0+LHlW4/U3+q0+LHlW4/U3+r1OLHlW4/U3+r1OLHlW4/U3+r1OLHlW4/U3+r1OLHlW8/U3+r1OLHlW8/U3+r1OLHlW8/U3+r1OLHlW8/U4Cr1OLHlW8/U4Cr1OLHlW8/U4Cr1OLHlW8/U4Cr1OLHlm8/U4Cr1OLHlm8/U4Cr1OLHlm8/U4Cr1OLHlm8/U4Cr1OPHlm8/U4Cr1OPHlm8/U4Cr1OPHlm8/U4Cr1OPHlm8/VICr1OPHlm8/VICr1OPHlm8/VICr1OPIlm8/VICr1OPIlm8/VICr1OPIlm8/VICr1OPIlnA/VICr1OPIlnA/VICr1OPIlnA/VICr1OPIlnA/VICr1OPIlnA/VICr1OPIlnA/VICr1OTIlnA/VICr1OTIlnA/VICr1OTIlnA/VICr1OTIlnA/VICr1OTIlnA/VICs1OTIlnA/VICs1OTIlnA/VICs1OTIlnA/VICs1OTIlnA/VICs1OTIlnA/VYCs1OTIlnA/VYCs1OTIl3A/VYCs1OTIl3A/VYCs1OTIl3A/VYCs1OTJl3A/VYCs1OTJl3A/VYCs1OTJl3A/VYCs1OTJl3A/VYCs1OTJl3A/VYCs1OTJl3A/VYCs1OTJl3E/VYCs1OTJl3E/VYCs1OTJl3E/VYCs1OTJl3E/VYCs1OTJl3E/VYCs1OTJl3E/VYCs1OXJl3E/VYCs1OXJl3E/VYCs1OXJl3E/VYCs1OXJl3E/VYCs1OXJl3E/VYCt1OXJl3E/VYCt1OXJl3E/VYCt1OXJl3E/VYCt1OXJl3E/VYCt1OXJl3E/VYCt1OXJl3E/VYCt1OXJl3E/VYCt1OXJl3E/VYCt1OXJmHE/VYCt1OXJmHE/VYCt1OXJmHE/VYCt1OXJmHE/VYCt1OXKmHE/VYCt1OXKmHE/VYCt1OXKmHE/VYCt1OXKmHE/VYCt1OXKmHE/VoCt1OXKmHE/VoCt1OXKmHE/VoCt1OXKmHE/VoCt1OXKmHE/VoCt1OXKmHI/VoCt1OXKmHI/VoCt1OXKmHI/VoCt1OXKmHI/VoCt1OXKmHI/VoCt1OXKmHI/VoCt1ObKmHI/VoCt1ObKmHI/VoCt1ObKmHI/VoCt1ObKmHI/VoCt1ObKmHI/VoCt1ObKmHI/VoCt1ObKmHI/VoCt1ObKmHI/VoCt1ObKmXI/VoCt1ObKmXI/VoCu1ObKmXI/VoCu1ObKmXI/VoCu1ObKmXI/VoCu1ObKmXI/VoCu1ObLmXI/VoCu1ObLmXI/VoCu1ObLmXI/VoCu1ObLmXI/VoCu1ObLmXI/V4Cu1ObLmXI/V4Cu1ObLmXI/V4Cu1ObLmXI/V4Cu1ObLmXI/V4Cu1ObLmXI/V4Cu1ObLmXI/V4Cu1ObLmXI/V4Cu1ObLmXI/V4Cu1ObLmXM/V4Cu1ObLmXM/V4Cu1ObLmXM/V4Cu1ObLmXM/");
  }, []);

  // Play sound function
  const playTimerEndSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        try {
          const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch {
          // Silent fail if audio not supported
        }
      });
    }
  }, []);

  // Play flip sound
  const playFlipSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 500;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Silent fail
    }
  }, []);

  // Load game data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("whatsTheQuestionData");
    if (stored) {
      const data = JSON.parse(stored) as GameData;
      setGameData(data);
      setTimeLeft(data.timerSeconds);
    } else {
      router.push("/activities/whats-the-question");
    }
  }, [router]);

  // Timer logic
  useEffect(() => {
    if (gameData?.timerEnabled && timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && timerActive && gameData) {
      playTimerEndSound();
      setTimerActive(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameData, timerActive, timeLeft, playTimerEndSound]);

  // Flip card handler
  const handleFlip = (index: number) => {
    playFlipSound();
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (!gameData) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--text-primary)] text-xl">Loading...</div>
      </div>
    );
  }

  const { sets, displayMode, timerEnabled, timerSeconds } = gameData;
  const isLast = current === sets.length - 1;
  const isFirst = current === 0;

  const resetTimer = () => {
    setTimeLeft(timerSeconds);
    setTimerActive(false);
  };

  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(timerSeconds);
    }
    setTimerActive(!timerActive);
  };

  const nextCard = () => {
    if (current < sets.length - 1) {
      setDirection(1);
      setCurrent((c) => c + 1);
      resetTimer();
    }
  };

  const prevCard = () => {
    if (current > 0) {
      setDirection(-1);
      setCurrent((c) => c - 1);
      resetTimer();
    }
  };

  const restart = () => {
    setDirection(-1);
    setCurrent(0);
    resetTimer();
    setFlippedCards(new Set());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}`;
  };

  // ============ ALL AT ONCE VIEW ============
  if (displayMode === "all-at-once") {
    return (
      <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
        <AnimatedPaths isDark={isDark} />

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 flex justify-between items-center border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>
              <Link
                href="/activities/whats-the-question"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
                title="Settings"
              >
                <Settings size={20} />
              </Link>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">❓ What&apos;s the Question?</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={restart}
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
                title="Restart"
              >
                <RotateCw size={20} />
              </button>
              <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
            </div>
          </header>

          {/* Timer */}
          {timerEnabled && (
            <div className="p-4 flex justify-center">
              <button
                onClick={toggleTimer}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                  timerActive
                    ? timeLeft <= 5 && timeLeft > 0
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-cyan-500 text-white"
                    : "glass-card text-[var(--text-primary)]"
                }`}
              >
                {timerActive ? <Pause size={20} /> : <Play size={20} />}
                <span className="text-2xl font-black tabular-nums">{formatTime(timeLeft)}</span>
                <Volume2 size={16} className="opacity-50" />
              </button>
            </div>
          )}

          {/* All Cards Grid - Full screen optimized */}
          <main className="flex-1 p-6 overflow-auto flex items-center justify-center">
            <div 
              className="w-full max-w-7xl grid gap-5"
              style={{
                gridTemplateColumns: sets.length <= 4 
                  ? `repeat(${Math.min(sets.length, 2)}, minmax(280px, 1fr))`
                  : sets.length <= 6
                    ? 'repeat(3, minmax(250px, 1fr))'
                    : 'repeat(auto-fit, minmax(280px, 1fr))',
              }}
            >
              {sets.map((set, idx) => {
                const isFlipped = flippedCards.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => handleFlip(idx)}
                    className="relative cursor-pointer group"
                    style={{ 
                      perspective: "1200px",
                      minHeight: sets.length <= 4 ? "280px" : sets.length <= 6 ? "220px" : "180px"
                    }}
                  >
                    <motion.div
                      className="relative w-full h-full"
                      initial={false}
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {/* Front - Answer */}
                      <div
                        className="absolute inset-0 glass-card p-4 md:p-6 flex flex-col items-center justify-center text-center group-hover:scale-[1.02] transition-transform overflow-hidden"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <span className="text-xs text-cyan-500 uppercase tracking-widest mb-2 font-semibold shrink-0">Answer</span>
                        <span 
                          className="font-black text-[var(--text-primary)] leading-tight break-words overflow-hidden flex-1 flex items-center"
                          style={{ 
                            fontSize: set.answer.length > 100 ? '0.875rem' : set.answer.length > 50 ? '1.125rem' : '1.5rem',
                            wordBreak: 'break-word'
                          }}
                        >
                          {set.answer}
                        </span>
                        <span className="mt-2 text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          Tap to reveal
                        </span>
                      </div>

                      {/* Back - Question */}
                      <div
                        className="absolute inset-0 glass-card p-4 md:p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10 overflow-hidden"
                        style={{ 
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)"
                        }}
                      >
                        <span className="text-xs text-blue-400 uppercase tracking-widest mb-2 font-semibold shrink-0">Question</span>
                        <span 
                          className="font-bold text-[var(--text-primary)] leading-tight break-words overflow-hidden flex-1 flex items-center"
                          style={{ 
                            fontSize: set.question.length > 80 ? '0.875rem' : set.question.length > 40 ? '1rem' : '1.25rem',
                            wordBreak: 'break-word'
                          }}
                        >
                          {set.question}
                        </span>
                        <span className="mt-2 text-xs text-[var(--text-muted)] opacity-60 shrink-0">
                          Tap to flip back
                        </span>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </main>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--glass-border)] flex justify-center">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-cyan-500/25"
            >
              <Home size={20} /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============ ONE AT A TIME VIEW ============
  const currentSet = sets[current];
  const isCurrentFlipped = flippedCards.has(current);

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
      <AnimatedPaths isDark={isDark} />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
              title="Back to home"
            >
              <Home size={20} />
            </Link>
            <Link
              href="/activities/whats-the-question"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
              title="Settings"
            >
              <Settings size={20} />
            </Link>
          </div>
          
          <span className="px-4 py-2 rounded-full glass-card text-[var(--text-secondary)] font-medium text-sm">
            {current + 1} / {sets.length}
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={restart}
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
            >
              <RotateCcw size={20} />
            </button>
            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 py-20">
          {/* Timer */}
          {timerEnabled && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div
                className={`
                  text-8xl md:text-9xl font-black tabular-nums tracking-tight
                  transition-colors duration-300
                  ${timeLeft <= 5 && timeLeft > 0 
                    ? "text-red-500 animate-pulse" 
                    : timeLeft === 0 
                      ? "text-red-500"
                      : "text-[var(--text-primary)]"
                  }
                `}
              >
                {formatTime(timeLeft)}
              </div>
            </motion.div>
          )}

          {/* Flip Card */}
          <div className="relative w-full max-w-4xl min-h-[400px] md:min-h-[500px]">
            <AnimatePresence initial={false}>
              <motion.div
                key={current}
                initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <div
                  onClick={() => handleFlip(current)}
                  className="w-full h-full cursor-pointer"
                  style={{ perspective: "1200px" }}
                >
                  <motion.div
                    className="relative w-full h-full"
                    initial={false}
                    animate={{ rotateY: isCurrentFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Front - Answer */}
                    <div
                      className="absolute inset-0 glass-card p-6 md:p-10 flex flex-col items-center justify-center text-center overflow-hidden"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <span className="text-sm text-cyan-500 uppercase tracking-widest mb-4 font-semibold shrink-0">
                        The Answer Is...
                      </span>
                      <span 
                        className="font-black text-[var(--text-primary)] leading-tight break-words max-w-full overflow-hidden flex-1 flex items-center px-4"
                        style={{ 
                          fontSize: currentSet.answer.length > 150 ? '1.25rem' : currentSet.answer.length > 80 ? '1.75rem' : currentSet.answer.length > 40 ? '2.5rem' : '3rem',
                          wordBreak: 'break-word'
                        }}
                      >
                        {currentSet.answer}
                      </span>
                      <span className="mt-6 text-base text-[var(--text-muted)] flex items-center gap-2 shrink-0">
                        <RotateCw size={18} /> Tap to reveal question
                      </span>
                    </div>

                    {/* Back - Question */}
                    <div
                      className="absolute inset-0 glass-card p-6 md:p-10 flex flex-col items-center justify-center text-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10 overflow-hidden"
                      style={{ 
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)"
                      }}
                    >
                      <span className="text-sm text-blue-500 uppercase tracking-widest mb-4 font-semibold shrink-0">
                        The Question Is...
                      </span>
                      <span 
                        className="font-black text-[var(--text-primary)] leading-tight break-words max-w-full overflow-hidden flex-1 flex items-center px-4"
                        style={{ 
                          fontSize: currentSet.question.length > 100 ? '1.25rem' : currentSet.question.length > 60 ? '1.5rem' : currentSet.question.length > 30 ? '2rem' : '2.25rem',
                          wordBreak: 'break-word'
                        }}
                      >
                        {currentSet.question}
                      </span>
                      <span className="mt-6 text-base text-[var(--text-muted)] flex items-center gap-2 shrink-0">
                        <RotateCw size={18} /> Tap to hide
                      </span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center justify-center gap-4">
            {/* Previous Button */}
            <button
              onClick={prevCard}
              disabled={isFirst}
              className={`
                p-4 rounded-2xl transition-all flex items-center justify-center
                ${isFirst
                  ? "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50"
                  : "glass-card text-[var(--text-primary)] hover:text-cyan-500 hover:scale-105"
                }
              `}
            >
              <ChevronLeft size={28} />
            </button>

            {/* Timer Controls */}
            {timerEnabled && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTimer}
                  className={`
                    p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all
                    ${timerActive
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:scale-105"
                      : "glass-card text-[var(--text-primary)] hover:text-cyan-500 hover:scale-105"
                    }
                  `}
                >
                  {timerActive ? <Pause size={28} /> : <Play size={28} />}
                </button>

                <div className="p-3 rounded-xl glass-card text-[var(--text-muted)]" title="Sound will play when timer ends">
                  <Volume2 size={20} />
                </div>
              </div>
            )}

            {/* Next Button */}
            <button
              onClick={nextCard}
              disabled={isLast}
              className={`
                p-4 rounded-2xl transition-all flex items-center justify-center
                ${isLast
                  ? "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50"
                  : "glass-card text-[var(--text-primary)] hover:text-cyan-500 hover:scale-105"
                }
              `}
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${((current + 1) / sets.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

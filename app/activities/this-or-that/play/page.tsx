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
  BarChart3,
  Trophy,
  RotateCw
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface GameData {
  sets: { options: string[] }[];
  displayMode: "set-by-set" | "all-at-once";
  timerEnabled: boolean;
  timerSeconds: number;
}

interface VoteData {
  [setIndex: number]: {
    [optionIndex: number]: number;
  };
}

// Crossfade animation - no gap between transitions
const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
    scale: 0.98,
  }),
};


export default function ThisOrThatPlay() {
  const router = useRouter();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [votes, setVotes] = useState<VoteData>({});
  const [showResults, setShowResults] = useState(false);
  const [direction, setDirection] = useState(0); // -1 for prev, 1 for next
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Play vote sound
  const playVoteSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 600;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch {
      // Silent fail
    }
  }, []);

  // Load game data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("thisOrThatData");
    if (stored) {
      const data = JSON.parse(stored) as GameData;
      setGameData(data);
      setTimeLeft(data.timerSeconds);
      // Initialize votes structure
      const initialVotes: VoteData = {};
      data.sets.forEach((_, idx) => {
        initialVotes[idx] = {};
        data.sets[idx].options.forEach((_, optIdx) => {
          initialVotes[idx][optIdx] = 0;
        });
      });
      setVotes(initialVotes);
    } else {
      router.push("/activities/this-or-that");
    }
  }, [router]);

  // Timer logic with auto-advance
  useEffect(() => {
    if (gameData?.timerEnabled && timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && timerActive && gameData) {
      playTimerEndSound();
      setTimerActive(false);
      
      if (current < gameData.sets.length - 1) {
        setTimeout(() => {
          setDirection(1);
          setCurrent((c) => c + 1);
          setTimeLeft(gameData.timerSeconds);
          setTimerActive(true);
        }, 1000);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameData, timerActive, timeLeft, current, playTimerEndSound]);

  // Vote handler
  const handleVote = (setIndex: number, optionIndex: number) => {
    playVoteSound();
    setVotes(prev => ({
      ...prev,
      [setIndex]: {
        ...prev[setIndex],
        [optionIndex]: (prev[setIndex]?.[optionIndex] || 0) + 1
      }
    }));
  };

  // Get vote count for an option
  const getVotes = (setIndex: number, optionIndex: number) => {
    return votes[setIndex]?.[optionIndex] || 0;
  };

  // Get total votes for a set
  const getTotalVotesForSet = (setIndex: number) => {
    return Object.values(votes[setIndex] || {}).reduce((sum, v) => sum + v, 0);
  };

  // Get percentage for an option
  const getPercentage = (setIndex: number, optionIndex: number) => {
    const total = getTotalVotesForSet(setIndex);
    if (total === 0) return 0;
    return Math.round((getVotes(setIndex, optionIndex) / total) * 100);
  };

  // Reset all votes
  const resetVotes = () => {
    if (gameData) {
      const initialVotes: VoteData = {};
      gameData.sets.forEach((_, idx) => {
        initialVotes[idx] = {};
        gameData.sets[idx].options.forEach((_, optIdx) => {
          initialVotes[idx][optIdx] = 0;
        });
      });
      setVotes(initialVotes);
    }
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

  const nextSet = () => {
    if (current < sets.length - 1) {
      setDirection(1);
      setCurrent((c) => c + 1);
      resetTimer();
    }
  };

  const prevSet = () => {
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
    setShowResults(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}`;
  };

  // ============ RESULTS SCREEN ============
  if (showResults) {
    const totalVotes = Object.keys(votes).reduce((sum, setIdx) => 
      sum + getTotalVotesForSet(parseInt(setIdx)), 0
    );

    return (
      <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
        {/* Animated Background */}
        <AnimatedPaths isDark={isDark} />

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 flex justify-between items-center border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>
              <button
                onClick={() => setShowResults(false)}
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="Back to game"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Trophy className="text-yellow-500" size={24} />
              Results
            </h1>
            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </header>

          {/* Results Content */}
          <main className="flex-1 p-4 overflow-auto">
            <div className="max-w-4xl mx-auto">
              {/* Total Stats */}
              <div className="glass-card p-6 mb-6 text-center animate-waterfall animate-waterfall-1">
                <p className="text-[var(--text-muted)] text-sm uppercase tracking-wide mb-2">Total Votes Recorded</p>
                <p className="text-5xl font-black text-[var(--text-primary)]">
                  {totalVotes}
                </p>
              </div>

              {/* Per-Set Results */}
              <div className="space-y-4">
                {sets.map((set, setIdx) => {
                  const setTotal = getTotalVotesForSet(setIdx);
                  const maxVotes = Math.max(...set.options.map((_, oi) => getVotes(setIdx, oi)));
                  // CSS animation delay class based on index
                  const delayClass = `animate-waterfall-${Math.min(setIdx + 2, 10)}`;
                  
                  return (
                    <div
                      key={setIdx}
                      className={`glass-card p-5 animate-waterfall ${delayClass}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-[var(--text-muted)]">
                          Question {setIdx + 1}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] bg-[var(--glass-bg)] px-2 py-1 rounded-full border border-[var(--glass-border)]">
                          {setTotal} votes
                        </span>
                      </div>

                      <div className="space-y-3">
                        {set.options.map((option, optIdx) => {
                          const voteCount = getVotes(setIdx, optIdx);
                          const percentage = getPercentage(setIdx, optIdx);
                          const isWinner = voteCount === maxVotes && voteCount > 0;

                          return (
                            <div key={optIdx} className="relative">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-semibold ${isWinner ? "text-pink-400" : "text-[var(--text-primary)]"}`}>
                                  {isWinner && <span className="mr-2">👑</span>}
                                  {option}
                                </span>
                                <span className="text-sm text-[var(--text-secondary)]">
                                  {voteCount} ({percentage}%)
                                </span>
                              </div>
                              <div className="h-3 rounded-full bg-[var(--glass-bg)] overflow-hidden">
                                <div
                                  style={{ 
                                    width: `${percentage}%`,
                                    transition: 'width 0.6s ease-out 0.4s'
                                  }}
                                  className={`h-full rounded-full ${
                                    isWinner 
                                      ? "bg-gradient-to-r from-pink-500 to-orange-400" 
                                      : "bg-[var(--text-muted)]"
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="mt-8 flex justify-center gap-4 animate-waterfall animate-waterfall-6">
                <button
                  onClick={() => { resetVotes(); setShowResults(false); restart(); }}
                  className="px-6 py-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 font-semibold flex items-center gap-2 transition-all"
                >
                  <RotateCw size={20} /> Play Again
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-violet-500/25"
                >
                  <Home size={20} /> Home
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============ ALL AT ONCE VIEW ============
  if (displayMode === "all-at-once") {
    return (
      <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
        {/* Animated Background */}
        <AnimatedPaths isDark={isDark} />

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 flex justify-between items-center border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>
              <Link
                href="/activities/this-or-that"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="Settings"
              >
                <Settings size={20} />
              </Link>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">⚖️ This or That</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResults(true)}
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="View Results"
              >
                <BarChart3 size={20} />
              </button>
              <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
            </div>
          </header>

          {/* All Sets */}
          <main className="flex-1 p-4 overflow-auto">
            <div className="max-w-5xl mx-auto space-y-4">
              {sets.map((set, setIdx) => (
                <motion.div
                  key={setIdx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: setIdx * 0.1 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    {set.options.map((option, optIdx) => {
                      const voteCount = getVotes(setIdx, optIdx);
                      return (
                        <div key={optIdx} className="contents">
                          <button
                            onClick={() => handleVote(setIdx, optIdx)}
                            className="flex-1 min-w-[150px] p-6 rounded-xl bg-[var(--glass-bg)] text-center hover:scale-105 hover:bg-pink-500/20 transition-all cursor-pointer border border-[var(--glass-border)] group relative"
                          >
                            <span className="text-xl md:text-2xl font-bold text-[var(--text-primary)] group-hover:text-pink-400 transition-colors">
                              {option}
                            </span>
                            {voteCount > 0 && (
                              <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white text-sm font-bold flex items-center justify-center shadow-lg">
                                {voteCount}
                              </span>
                            )}
                          </button>
                          {optIdx < set.options.length - 1 && (
                            <span className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold shadow-lg">
                              OR
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </main>

          {/* View Results Button */}
          <div className="p-4 border-t border-[var(--glass-border)]">
            <button
              onClick={() => setShowResults(true)}
              className="w-full max-w-md mx-auto block px-6 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-violet-500/25"
            >
              <BarChart3 size={20} /> View Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ SET BY SET VIEW (FULLSCREEN) ============
  const currentSet = sets[current];

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
      {/* Animated Background */}
      <AnimatedPaths isDark={isDark} />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Minimal Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
              title="Back to home"
            >
              <Home size={20} />
            </Link>
            <Link
              href="/activities/this-or-that"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
              title="Settings"
            >
              <Settings size={20} />
            </Link>
          </div>
          
          {/* Progress indicator */}
          <span className="px-4 py-2 rounded-full glass-card text-[var(--text-secondary)] font-medium text-sm">
            {current + 1} / {sets.length}
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResults(true)}
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
              title="View Results"
            >
              <BarChart3 size={20} />
            </button>
            <button
              onClick={restart}
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
            >
              <RotateCcw size={20} />
            </button>
            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </header>

        {/* Main Content - Full Screen */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 py-20">
          {/* Timer Display */}
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

          {/* Options - Large and Centered with Smooth Crossfade */}
          <div className="relative w-full max-w-6xl min-h-[300px] md:min-h-[350px]">
            <AnimatePresence initial={false}>
              <motion.div
                key={current}
                initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                transition={{ 
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 flex items-center justify-center gap-6 md:gap-12"
              >
                {currentSet.options.map((option, optIdx) => {
                  const voteCount = getVotes(current, optIdx);
                  return (
                    <div key={optIdx} className="contents">
                      <button
                        onClick={() => handleVote(current, optIdx)}
                        className="glass-card glass-card-hover flex-1 min-h-[200px] md:min-h-[280px] p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer group relative"
                      >
                        <span className="text-3xl md:text-5xl lg:text-6xl font-black text-[var(--text-primary)] group-hover:text-pink-400 transition-colors leading-tight">
                          {option}
                        </span>
                        
                        {/* Vote counter */}
                        {voteCount > 0 && (
                          <motion.div
                            key={voteCount}
                            initial={{ scale: 1.3 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-4 -right-4 w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white text-xl font-black flex items-center justify-center shadow-lg shadow-pink-500/30"
                          >
                            {voteCount}
                          </motion.div>
                        )}
                        
                        {/* Tap hint */}
                        <span className="mt-4 text-sm text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                          Tap to vote
                        </span>
                      </button>
                      {optIdx < currentSet.options.length - 1 && (
                        <div className="px-6 py-4 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-black shadow-lg text-2xl md:text-3xl">
                          OR
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center justify-center gap-4">
            {/* Previous Button */}
            <button
              onClick={prevSet}
              disabled={isFirst}
              className={`
                p-4 rounded-2xl transition-all flex items-center justify-center
                ${isFirst
                  ? "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50"
                  : "glass-card text-[var(--text-primary)] hover:text-teal-500 hover:scale-105"
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
                      ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/25 hover:scale-105"
                      : "glass-card text-[var(--text-primary)] hover:text-teal-500 hover:scale-105"
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

            {/* Next/Results Button */}
            {!isLast ? (
              <button
                onClick={nextSet}
                className="p-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-teal-500 hover:scale-105 transition-all flex items-center justify-center"
              >
                <ChevronRight size={28} />
              </button>
            ) : (
              <button
                onClick={() => setShowResults(true)}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-violet-500/25"
              >
                <BarChart3 size={24} /> Results
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-orange-400"
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

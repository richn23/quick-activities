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
  Shuffle,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface SetData {
  words: string[];
  oddOneOut: number;
}

interface GameData {
  sets: SetData[];
  displayMode: "one-at-a-time" | "all-at-once";
  timerEnabled: boolean;
  timerSeconds: number;
}

interface VoteData {
  [setIndex: number]: {
    [wordIndex: number]: number;
  };
}

export default function OddOneOutPlay() {
  const router = useRouter();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [votes, setVotes] = useState<VoteData>({});
  const [shuffledSets, setShuffledSets] = useState<SetData[]>([]);
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

  // Play sounds
  const playTimerEndSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

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


  // Load game data
  useEffect(() => {
    const stored = sessionStorage.getItem("oddOneOutData");
    if (stored) {
      const data = JSON.parse(stored) as GameData;
      setGameData(data);
      setShuffledSets(data.sets.map(set => ({ ...set, words: [...set.words] })));
      setTimeLeft(data.timerSeconds);
      // Initialize votes
      const initialVotes: VoteData = {};
      data.sets.forEach((_, idx) => {
        initialVotes[idx] = {};
      });
      setVotes(initialVotes);
    } else {
      router.push("/activities/odd-one-out");
    }
  }, [router]);

  // Timer logic
  useEffect(() => {
    if (gameData?.timerEnabled && timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      playTimerEndSound();
      setTimerActive(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameData, timerActive, timeLeft, playTimerEndSound]);

  // Shuffle a set's words while tracking the odd one out
  const shuffleSet = (setIndex: number) => {
    setShuffledSets(prev => {
      const newSets = [...prev];
      const set = newSets[setIndex];
      const originalOddOneOut = gameData!.sets[setIndex].oddOneOut;
      const oddWord = set.words[originalOddOneOut];
      
      // Shuffle array
      const shuffled = [...set.words].sort(() => Math.random() - 0.5);
      const newOddIndex = shuffled.indexOf(oddWord);
      
      newSets[setIndex] = { words: shuffled, oddOneOut: newOddIndex };
      return newSets;
    });
  };

  // Vote handler
  const handleVote = (setIndex: number, wordIndex: number) => {
    playVoteSound();
    setVotes(prev => ({
      ...prev,
      [setIndex]: {
        ...prev[setIndex],
        [wordIndex]: (prev[setIndex]?.[wordIndex] || 0) + 1
      }
    }));
  };

  // Get votes for a word
  const getVotes = (setIndex: number, wordIndex: number) => votes[setIndex]?.[wordIndex] || 0;

  // Get total votes for a set
  const getTotalVotes = (setIndex: number) => 
    Object.values(votes[setIndex] || {}).reduce((sum, v) => sum + v, 0);

  if (!gameData) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--text-primary)] text-xl">Loading...</div>
      </div>
    );
  }

  const { displayMode, timerEnabled, timerSeconds } = gameData;
  const sets = shuffledSets;
  const isLast = current === sets.length - 1;
  const isFirst = current === 0;

  const resetTimer = () => {
    setTimeLeft(timerSeconds);
    setTimerActive(false);
  };

  const toggleTimer = () => {
    if (timeLeft === 0) setTimeLeft(timerSeconds);
    setTimerActive(!timerActive);
  };

  const nextSet = () => {
    if (current < sets.length - 1) {
      setDirection(1);
      setCurrent(c => c + 1);
      resetTimer();
    }
  };

  const prevSet = () => {
    if (current > 0) {
      setDirection(-1);
      setCurrent(c => c - 1);
      resetTimer();
    }
  };

  const restart = () => {
    setDirection(-1);
    setCurrent(0);
    resetTimer();
    setVotes({});
    setShuffledSets(gameData.sets.map(set => ({ ...set, words: [...set.words] })));
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
              <Link href="/" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-orange-500 transition-all" title="Back to home">
                <Home size={20} />
              </Link>
              <Link href="/activities/odd-one-out" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-orange-500 transition-all" title="Settings">
                <Settings size={20} />
              </Link>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">🎯 Odd One Out</h1>
            <div className="flex items-center gap-2">
              <button onClick={restart} className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-orange-500 transition-all" title="Restart">
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
                      : "bg-orange-500 text-white"
                    : "glass-card text-[var(--text-primary)]"
                }`}
              >
                {timerActive ? <Pause size={20} /> : <Play size={20} />}
                <span className="text-2xl font-black tabular-nums">{formatTime(timeLeft)}</span>
                <Volume2 size={16} className="opacity-50" />
              </button>
            </div>
          )}

          {/* All Sets Grid */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {sets.map((set, setIdx) => {
                const totalVotes = getTotalVotes(setIdx);
                
                return (
                  <div key={setIdx} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-orange-500">Set {setIdx + 1}</span>
                      <button
                        onClick={() => shuffleSet(setIdx)}
                        className="p-2 rounded-lg glass-card text-[var(--text-muted)] hover:text-orange-500 transition-all"
                        title="Shuffle"
                      >
                        <Shuffle size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {set.words.map((word, wordIdx) => {
                        const voteCount = getVotes(setIdx, wordIdx);
                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                        return (
                          <button
                            key={wordIdx}
                            onClick={() => handleVote(setIdx, wordIdx)}
                            className="relative p-4 rounded-xl text-center font-semibold transition-all glass-card text-[var(--text-primary)] hover:scale-105"
                          >
                            <span className="text-lg">{word}</span>
                            {voteCount > 0 && (
                              <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                                {voteCount}
                              </span>
                            )}
                            {totalVotes > 0 && (
                              <div className="mt-2 text-xs text-[var(--text-muted)]">{percentage}%</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--glass-border)] flex justify-center">
            <Link href="/" className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-orange-500/25">
              <Home size={20} /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============ ONE AT A TIME VIEW ============
  const currentSet = sets[current];
  const currentTotalVotes = getTotalVotes(current);

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
      <AnimatedPaths isDark={isDark} />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-orange-500 transition-all" title="Back to home">
              <Home size={20} />
            </Link>
            <Link href="/activities/odd-one-out" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-orange-500 transition-all" title="Settings">
              <Settings size={20} />
            </Link>
          </div>
          
          <span className="px-4 py-2 rounded-full glass-card text-[var(--text-secondary)] font-medium text-sm">
            {current + 1} / {sets.length}
          </span>
          
          <div className="flex items-center gap-2">
            <button onClick={restart} className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-orange-500 transition-all">
              <RotateCcw size={20} />
            </button>
            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 py-20">
          {/* Timer */}
          {timerEnabled && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className={`text-7xl md:text-8xl font-black tabular-nums tracking-tight transition-colors duration-300 ${
                timeLeft <= 5 && timeLeft > 0 ? "text-red-500 animate-pulse" : timeLeft === 0 ? "text-red-500" : "text-[var(--text-primary)]"
              }`}>
                {formatTime(timeLeft)}
              </div>
            </motion.div>
          )}

          {/* Question prompt */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-6"
          >
            Which one doesn&apos;t belong?
          </motion.h2>

          {/* Shuffle button */}
          <button
            onClick={() => shuffleSet(current)}
            className="mb-6 px-4 py-2 rounded-xl glass-card text-[var(--text-secondary)] hover:text-orange-500 flex items-center gap-2 transition-all"
          >
            <Shuffle size={18} /> Shuffle Order
          </button>

          {/* Words Grid */}
          <div className="relative w-full max-w-4xl">
            <AnimatePresence initial={false}>
              <motion.div
                key={current}
                initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                {currentSet.words.map((word, wordIdx) => {
                  const voteCount = getVotes(current, wordIdx);
                  const percentage = currentTotalVotes > 0 ? Math.round((voteCount / currentTotalVotes) * 100) : 0;

                  return (
                    <motion.button
                      key={wordIdx}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleVote(current, wordIdx)}
                      className="relative p-6 md:p-8 rounded-2xl text-center font-bold transition-all glass-card text-[var(--text-primary)] hover:shadow-lg"
                    >
                      <span className="text-xl md:text-2xl">{word}</span>
                      
                      {/* Vote count badge */}
                      {voteCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-bold flex items-center justify-center shadow-lg"
                        >
                          {voteCount}
                        </motion.span>
                      )}

                      {/* Percentage when votes exist */}
                      {currentTotalVotes > 0 && (
                        <div className="mt-2 text-sm text-[var(--text-muted)]">{percentage}%</div>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Hint for open-ended discussion */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center text-[var(--text-muted)] text-sm"
          >
            Tap to vote • Discuss why each could be the odd one out
          </motion.p>
        </main>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={prevSet}
              disabled={isFirst}
              className={`p-4 rounded-2xl transition-all flex items-center justify-center ${
                isFirst ? "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50" : "glass-card text-[var(--text-primary)] hover:text-orange-500 hover:scale-105"
              }`}
            >
              <ChevronLeft size={28} />
            </button>

            {timerEnabled && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTimer}
                  className={`p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    timerActive ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 hover:scale-105" : "glass-card text-[var(--text-primary)] hover:text-orange-500 hover:scale-105"
                  }`}
                >
                  {timerActive ? <Pause size={28} /> : <Play size={28} />}
                </button>
                <div className="p-3 rounded-xl glass-card text-[var(--text-muted)]" title="Sound will play when timer ends">
                  <Volume2 size={20} />
                </div>
              </div>
            )}

            <button
              onClick={nextSet}
              disabled={isLast}
              className={`p-4 rounded-2xl transition-all flex items-center justify-center ${
                isLast ? "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50" : "glass-card text-[var(--text-primary)] hover:text-orange-500 hover:scale-105"
              }`}
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-rose-500"
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

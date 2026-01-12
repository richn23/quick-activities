"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Home,
  Settings,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface TabooItem {
  word: string;
  tabooWords: string[];
}

interface GameState {
  items: TabooItem[];
  timerMode: "off" | "per-item" | "total";
  timerSeconds: number;
  perItemSeconds: number;
}

// Sound generation
const playSound = (type: 'correct' | 'wrong' | 'timeup') => {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  switch (type) {
    case 'correct':
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      oscillator.start();
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
      oscillator.stop(audioContext.currentTime + 0.4);
      break;
    case 'wrong':
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
    case 'timeup':
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      oscillator.start();
      oscillator.frequency.setValueAtTime(330, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
      oscillator.stop(audioContext.currentTime + 0.6);
      break;
  }
};

export default function BackToBoardTabooPlay() {
  const router = useRouter();
  
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

  // Game state
  const [gameData, setGameData] = useState<GameState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<('correct' | 'wrong' | 'skipped')[]>([]);
  
  // Ref for timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load game data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("backToBoardTabooData");
      if (stored) {
        try {
          const data = JSON.parse(stored) as GameState;
          setGameData(data);
          setResults(new Array(data.items.length).fill('skipped'));
          
          // Set initial timer
          if (data.timerMode === "per-item") {
            setTimeLeft(data.perItemSeconds);
          } else if (data.timerMode === "total") {
            setTimeLeft(data.timerSeconds);
          }
        } catch {
          router.push("/activities/back-to-board-taboo");
        }
      } else {
        router.push("/activities/back-to-board-taboo");
      }
    }
  }, [router]);

  // Apply dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Timer logic
  useEffect(() => {
    if (!gameData || gameData.timerMode === "off" || isComplete) return;
    
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            if (gameData.timerMode === "per-item") {
              // Time up for this item - mark as wrong and move on
              playSound('timeup');
              handleWrong();
            } else {
              // Total time up - end game
              playSound('timeup');
              setIsComplete(true);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current!);
    }
  }, [gameData, timeLeft, isComplete, currentIndex]);

  // Handle correct answer
  const handleCorrect = useCallback(() => {
    if (!gameData || isComplete) return;
    
    playSound('correct');
    setScore(s => ({ ...s, correct: s.correct + 1 }));
    setResults(prev => {
      const newResults = [...prev];
      newResults[currentIndex] = 'correct';
      return newResults;
    });
    
    // Move to next or complete
    if (currentIndex < gameData.items.length - 1) {
      setCurrentIndex(i => i + 1);
      if (gameData.timerMode === "per-item") {
        setTimeLeft(gameData.perItemSeconds);
      }
    } else {
      setIsComplete(true);
    }
  }, [gameData, currentIndex, isComplete]);

  // Handle wrong/skip
  const handleWrong = useCallback(() => {
    if (!gameData || isComplete) return;
    
    playSound('wrong');
    setScore(s => ({ ...s, wrong: s.wrong + 1 }));
    setResults(prev => {
      const newResults = [...prev];
      newResults[currentIndex] = 'wrong';
      return newResults;
    });
    
    // Move to next or complete
    if (currentIndex < gameData.items.length - 1) {
      setCurrentIndex(i => i + 1);
      if (gameData.timerMode === "per-item") {
        setTimeLeft(gameData.perItemSeconds);
      }
    } else {
      setIsComplete(true);
    }
  }, [gameData, currentIndex, isComplete]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset game
  const resetGame = () => {
    if (!gameData) return;
    setCurrentIndex(0);
    setScore({ correct: 0, wrong: 0 });
    setIsComplete(false);
    setResults(new Array(gameData.items.length).fill('skipped'));
    if (gameData.timerMode === "per-item") {
      setTimeLeft(gameData.perItemSeconds);
    } else if (gameData.timerMode === "total") {
      setTimeLeft(gameData.timerSeconds);
    }
  };

  if (!gameData) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // End screen
  if (isComplete) {
    const percentage = Math.round((score.correct / gameData.items.length) * 100);

    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-[var(--glass-border)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href="/activities/back-to-board-taboo"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-red-500 transition-all flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Back to Setup
            </Link>
            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-8 md:p-12 text-center max-w-md w-full"
          >
            <div className="text-6xl mb-6">
              {percentage >= 70 ? "🎉" : percentage >= 50 ? "👏" : "💪"}
            </div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Game Over!
            </h2>
            
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-4xl font-black text-green-500">{score.correct}</div>
                <div className="text-sm text-[var(--text-muted)]">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-red-500">{score.wrong}</div>
                <div className="text-sm text-[var(--text-muted)]">Wrong</div>
              </div>
            </div>
            
            <div className="text-5xl font-black text-[var(--text-primary)] mb-2">
              {percentage}%
            </div>
            <p className="text-[var(--text-muted)] mb-8">
              {score.correct} of {gameData.items.length} items
            </p>

            {/* Results list */}
            <div className="mb-8 max-h-40 overflow-y-auto">
              <div className="space-y-2">
                {gameData.items.map((item, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      results[index] === 'correct'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    <span className="font-medium">{item.word}</span>
                    <span>{results[index] === 'correct' ? '✓' : '✗'}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={resetGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Play Again
              </button>
              <Link
                href="/activities/back-to-board-taboo"
                className="px-6 py-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-red-500 transition-all"
              >
                New Game
              </Link>
              <Link
                href="/"
                className="px-6 py-3 rounded-xl glass-card text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center gap-2 transition-all"
              >
                <Home size={18} />
                Home
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  const currentItem = gameData.items[currentIndex];

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
      <AnimatedPaths isDark={isDark} />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-red-500 transition-all" title="Back to home">
              <Home size={20} />
            </Link>
            <Link href="/activities/back-to-board-taboo" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-red-500 transition-all" title="Settings">
              <Settings size={20} />
            </Link>
          </div>
          
          <span className="px-4 py-2 rounded-full glass-card text-[var(--text-secondary)] font-medium text-sm">
            {currentIndex + 1} / {gameData.items.length}
          </span>
          
          <div className="flex items-center gap-2">
            <button onClick={resetGame} className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-red-500 transition-all">
              <RotateCcw size={20} />
            </button>
            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 py-24">
          {/* Timer */}
          {gameData.timerMode !== "off" && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className={`text-7xl md:text-8xl font-black tabular-nums tracking-tight transition-colors duration-300 ${
                timeLeft <= 10 && timeLeft > 0 ? "text-red-500 animate-pulse" : timeLeft === 0 ? "text-red-500" : "text-[var(--text-primary)]"
              }`}>
                {formatTime(timeLeft)}
              </div>
            </motion.div>
          )}

          {/* Score */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex items-center gap-6 mb-6"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-green-500">{score.correct}</div>
              <div className="text-xs text-[var(--text-muted)]">Correct</div>
            </div>
            <div className="text-2xl text-[var(--text-muted)]">-</div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-red-500">{score.wrong}</div>
              <div className="text-xs text-[var(--text-muted)]">Wrong</div>
            </div>
          </motion.div>

          {/* Main Card */}
          <div className="w-full max-w-6xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95, x: 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -50 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="glass-card p-12 md:p-20 text-center"
              >
                {/* Main word */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-10"
                >
                  <h2 className="text-6xl md:text-8xl lg:text-9xl font-black text-[var(--text-primary)] mb-3">
                    {currentItem.word}
                  </h2>
                  <p className="text-lg text-[var(--text-muted)]">
                    Describe this word without saying...
                  </p>
                </motion.div>

                {/* Taboo words */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="inline-block p-6 md:p-8 rounded-2xl bg-red-500/10 border-2 border-red-500/30">
                    <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
                      {currentItem.tabooWords.map((taboo, index) => (
                        <span
                          key={index}
                          className="px-5 py-3 rounded-xl bg-red-500/20 text-red-500 font-bold text-xl md:text-2xl border border-red-500/30"
                        >
                          {taboo}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center justify-center gap-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleWrong}
              className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-red-500/20 border-3 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-lg hover:shadow-red-500/30"
            >
              <X size={48} />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCorrect}
              className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-green-500/20 border-3 border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center shadow-lg hover:shadow-green-500/30"
            >
              <Check size={48} />
            </motion.button>
          </div>

          {/* Progress bar */}
          <div className="mt-6 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-500 to-rose-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / gameData.items.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

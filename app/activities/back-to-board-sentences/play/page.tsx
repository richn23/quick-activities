"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  SkipForward,
  Check,
  Home,
  Settings,
  RotateCcw,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface SentenceItem {
  sentence: string;
  words: string[];
}

interface GameState {
  sentences: SentenceItem[];
  timerMode: "off" | "per-sentence" | "total";
  timerSeconds: number;
  perSentenceSeconds: number;
}

// Sound generation
const playSound = (type: 'tap' | 'correct' | 'skip' | 'timeup') => {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  switch (type) {
    case 'tap':
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    case 'correct':
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      oscillator.start();
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
      oscillator.stop(audioContext.currentTime + 0.4);
      break;
    case 'skip':
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
      oscillator.stop(audioContext.currentTime + 0.2);
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

export default function BackToBoardSentencesPlay() {
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
  const [score, setScore] = useState({ correct: 0, skipped: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<('correct' | 'skipped' | 'pending')[]>([]);
  const [usedWords, setUsedWords] = useState<Set<number>>(new Set());
  
  // Ref for timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load game data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("backToBoardSentencesData");
      if (stored) {
        try {
          const data = JSON.parse(stored) as GameState;
          setGameData(data);
          setResults(new Array(data.sentences.length).fill('pending'));
          
          // Set initial timer
          if (data.timerMode === "per-sentence") {
            setTimeLeft(data.perSentenceSeconds);
          } else if (data.timerMode === "total") {
            setTimeLeft(data.timerSeconds);
          }
        } catch {
          router.push("/activities/back-to-board-sentences");
        }
      } else {
        router.push("/activities/back-to-board-sentences");
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
            if (gameData.timerMode === "per-sentence") {
              // Time up for this sentence - skip
              playSound('timeup');
              handleSkip();
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

  // Toggle word usage
  const toggleWord = useCallback((wordIndex: number) => {
    playSound('tap');
    setUsedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordIndex)) {
        newSet.delete(wordIndex);
      } else {
        newSet.add(wordIndex);
      }
      return newSet;
    });
  }, []);

  // Handle correct answer (guessed the sentence)
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
    if (currentIndex < gameData.sentences.length - 1) {
      setCurrentIndex(i => i + 1);
      setUsedWords(new Set());
      if (gameData.timerMode === "per-sentence") {
        setTimeLeft(gameData.perSentenceSeconds);
      }
    } else {
      setIsComplete(true);
    }
  }, [gameData, currentIndex, isComplete]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (!gameData || isComplete) return;
    
    playSound('skip');
    setScore(s => ({ ...s, skipped: s.skipped + 1 }));
    setResults(prev => {
      const newResults = [...prev];
      newResults[currentIndex] = 'skipped';
      return newResults;
    });
    
    // Move to next or complete
    if (currentIndex < gameData.sentences.length - 1) {
      setCurrentIndex(i => i + 1);
      setUsedWords(new Set());
      if (gameData.timerMode === "per-sentence") {
        setTimeLeft(gameData.perSentenceSeconds);
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
    setScore({ correct: 0, skipped: 0 });
    setIsComplete(false);
    setResults(new Array(gameData.sentences.length).fill('pending'));
    setUsedWords(new Set());
    if (gameData.timerMode === "per-sentence") {
      setTimeLeft(gameData.perSentenceSeconds);
    } else if (gameData.timerMode === "total") {
      setTimeLeft(gameData.timerSeconds);
    }
  };

  if (!gameData) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // End screen
  if (isComplete) {
    const percentage = Math.round((score.correct / gameData.sentences.length) * 100);

    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-[var(--glass-border)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href="/activities/back-to-board-sentences"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-amber-500 transition-all flex items-center gap-2"
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
                <div className="text-4xl font-black text-amber-500">{score.skipped}</div>
                <div className="text-sm text-[var(--text-muted)]">Skipped</div>
              </div>
            </div>
            
            <div className="text-5xl font-black text-[var(--text-primary)] mb-2">
              {percentage}%
            </div>
            <p className="text-[var(--text-muted)] mb-8">
              {score.correct} of {gameData.sentences.length} sentences
            </p>

            {/* Results list */}
            <div className="mb-8 max-h-40 overflow-y-auto">
              <div className="space-y-2">
                {gameData.sentences.map((item, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-left ${
                      results[index] === 'correct'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-amber-500/20 text-amber-500'
                    }`}
                  >
                    <span className="font-medium text-sm truncate flex-1 mr-2">
                      {item.sentence}
                    </span>
                    <span>{results[index] === 'correct' ? '✓' : '○'}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={resetGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Play Again
              </button>
              <Link
                href="/activities/back-to-board-sentences"
                className="px-6 py-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-amber-500 transition-all"
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

  const currentSentence = gameData.sentences[currentIndex];

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
      <AnimatedPaths isDark={isDark} />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-amber-500 transition-all" title="Back to home">
              <Home size={20} />
            </Link>
            <Link href="/activities/back-to-board-sentences" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-amber-500 transition-all" title="Settings">
              <Settings size={20} />
            </Link>
          </div>
          
          <span className="px-4 py-2 rounded-full glass-card text-[var(--text-secondary)] font-medium text-sm">
            {currentIndex + 1} / {gameData.sentences.length}
          </span>
          
          <div className="flex items-center gap-2">
            <button onClick={resetGame} className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-amber-500 transition-all">
              <RotateCcw size={20} />
            </button>
            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 py-24">
          {/* Timer */}
          {gameData.timerMode !== "off" && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
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
              <div className="text-3xl md:text-4xl font-black text-amber-500">{score.skipped}</div>
              <div className="text-xs text-[var(--text-muted)]">Skipped</div>
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
                className="glass-card p-10 md:p-14 lg:p-20"
              >
                {/* Hint */}
                <p className="text-sm text-[var(--text-muted)] text-center mb-6">
                  Tap words as you describe them to your team
                </p>

                {/* Word cloud - tappable words */}
                <div className="flex flex-wrap gap-5 md:gap-6 justify-center mb-10">
                  {currentSentence.words.map((word, wordIndex) => (
                    <motion.button
                      key={wordIndex}
                      onClick={() => toggleWord(wordIndex)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-8 py-5 md:px-10 md:py-6 rounded-2xl text-3xl md:text-4xl lg:text-5xl font-bold transition-all ${
                        usedWords.has(wordIndex)
                          ? 'bg-amber-500/30 text-amber-600 dark:text-amber-400 border-2 border-amber-500/50 line-through opacity-60'
                          : 'bg-[var(--glass-bg)] text-[var(--text-primary)] border-2 border-[var(--glass-border)] hover:border-amber-500/50 hover:bg-amber-500/10'
                      }`}
                    >
                      {word}
                    </motion.button>
                  ))}
                </div>

                {/* Word count */}
                <div className="text-center">
                  <span className="px-4 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-muted)] text-sm">
                    {usedWords.size} / {currentSentence.words.length} words described
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center justify-center gap-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              className="px-8 py-4 rounded-2xl glass-card text-amber-500 hover:bg-amber-500/10 flex items-center gap-3 transition-all text-lg font-semibold"
            >
              <SkipForward size={24} />
              Skip
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCorrect}
              className="px-10 py-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold flex items-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-green-500/25 text-xl"
            >
              <Check size={28} />
              Correct!
            </motion.button>
          </div>

          {/* Progress bar */}
          <div className="mt-6 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / gameData.sentences.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

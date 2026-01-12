"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Shuffle,
  Eye,
  Check,
  Home,
  Settings,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface SentenceData {
  original: string;
  words: string[];
  jumbled: string[];
}

interface GameState {
  sentences: SentenceData[];
  displayMode: "one-by-one" | "all-at-once";
  timerEnabled: boolean;
  timerSeconds: number;
}

// Sound generation
const playSound = (type: 'place' | 'remove' | 'correct' | 'wrong') => {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  switch (type) {
    case 'place':
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    case 'remove':
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
      oscillator.stop(audioContext.currentTime + 0.08);
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
    case 'wrong':
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
  }
};

export default function SentenceJumblesPlay() {
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
  const [timeLeft, setTimeLeft] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  // Per-sentence state: placed words in order and available words
  const [placedWords, setPlacedWords] = useState<string[][]>([]);
  const [availableWords, setAvailableWords] = useState<string[][]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean[]>([]);
  
  // Ref for timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load game data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("sentenceJumblesData");
      if (stored) {
        try {
          const data = JSON.parse(stored) as GameState;
          setGameData(data);
          setTimeLeft(data.timerEnabled ? data.timerSeconds : 0);
          
          // Initialize per-sentence state
          setPlacedWords(data.sentences.map(() => []));
          setAvailableWords(data.sentences.map(s => [...s.jumbled]));
          setRevealed(data.sentences.map(() => false));
          setChecked(data.sentences.map(() => false));
          setIsCorrect(data.sentences.map(() => false));
        } catch {
          router.push("/activities/sentence-jumbles");
        }
      } else {
        router.push("/activities/sentence-jumbles");
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
    if (gameData?.timerEnabled && timeLeft > 0 && !isComplete) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current!);
    }
  }, [gameData?.timerEnabled, isComplete, timeLeft]);

  // Place a word
  const placeWord = useCallback((sentenceIndex: number, word: string, wordIndex: number) => {
    if (revealed[sentenceIndex] || checked[sentenceIndex]) return;
    
    playSound('place');
    
    setPlacedWords(prev => {
      const newPlaced = [...prev];
      newPlaced[sentenceIndex] = [...newPlaced[sentenceIndex], word];
      return newPlaced;
    });
    
    setAvailableWords(prev => {
      const newAvailable = [...prev];
      newAvailable[sentenceIndex] = newAvailable[sentenceIndex].filter((_, i) => i !== wordIndex);
      return newAvailable;
    });
  }, [revealed, checked]);

  // Remove a placed word
  const removeWord = useCallback((sentenceIndex: number, placedIndex: number) => {
    if (revealed[sentenceIndex] || checked[sentenceIndex]) return;
    
    playSound('remove');
    
    const word = placedWords[sentenceIndex][placedIndex];
    
    setPlacedWords(prev => {
      const newPlaced = [...prev];
      newPlaced[sentenceIndex] = newPlaced[sentenceIndex].filter((_, i) => i !== placedIndex);
      return newPlaced;
    });
    
    setAvailableWords(prev => {
      const newAvailable = [...prev];
      newAvailable[sentenceIndex] = [...newAvailable[sentenceIndex], word];
      return newAvailable;
    });
  }, [placedWords, revealed, checked]);

  // Shuffle available words
  const shuffleAvailable = useCallback((sentenceIndex: number) => {
    setAvailableWords(prev => {
      const newAvailable = [...prev];
      const shuffled = [...newAvailable[sentenceIndex]];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      newAvailable[sentenceIndex] = shuffled;
      return newAvailable;
    });
  }, []);

  // Reset sentence
  const resetSentence = useCallback((sentenceIndex: number) => {
    if (!gameData) return;
    
    setPlacedWords(prev => {
      const newPlaced = [...prev];
      newPlaced[sentenceIndex] = [];
      return newPlaced;
    });
    
    setAvailableWords(prev => {
      const newAvailable = [...prev];
      newAvailable[sentenceIndex] = [...gameData.sentences[sentenceIndex].jumbled];
      return newAvailable;
    });
    
    setChecked(prev => {
      const newChecked = [...prev];
      newChecked[sentenceIndex] = false;
      return newChecked;
    });
    
    setIsCorrect(prev => {
      const newCorrect = [...prev];
      newCorrect[sentenceIndex] = false;
      return newCorrect;
    });
  }, [gameData]);

  // Check answer
  const checkAnswer = useCallback((sentenceIndex: number) => {
    if (!gameData) return;
    
    const sentence = gameData.sentences[sentenceIndex];
    const userAnswer = placedWords[sentenceIndex].join(' ');
    const correctAnswer = sentence.words.join(' ');
    const correct = userAnswer === correctAnswer;
    
    playSound(correct ? 'correct' : 'wrong');
    
    setChecked(prev => {
      const newChecked = [...prev];
      newChecked[sentenceIndex] = true;
      return newChecked;
    });
    
    setIsCorrect(prev => {
      const newCorrect = [...prev];
      newCorrect[sentenceIndex] = correct;
      return newCorrect;
    });
  }, [gameData, placedWords]);

  // Reveal answer
  const revealAnswer = useCallback((sentenceIndex: number) => {
    if (!gameData) return;
    
    setRevealed(prev => {
      const newRevealed = [...prev];
      newRevealed[sentenceIndex] = true;
      return newRevealed;
    });
    
    setPlacedWords(prev => {
      const newPlaced = [...prev];
      newPlaced[sentenceIndex] = [...gameData.sentences[sentenceIndex].words];
      return newPlaced;
    });
    
    setAvailableWords(prev => {
      const newAvailable = [...prev];
      newAvailable[sentenceIndex] = [];
      return newAvailable;
    });
  }, [gameData]);

  // Navigation
  const goToNext = () => {
    if (gameData && currentIndex < gameData.sentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsComplete(true);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!gameData) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render a single sentence
  const renderSentence = (sentenceIndex: number, isActive: boolean = true) => {
    const placed = placedWords[sentenceIndex] || [];
    const available = availableWords[sentenceIndex] || [];
    const isRevealed = revealed[sentenceIndex];
    const isChecked = checked[sentenceIndex];
    const correct = isCorrect[sentenceIndex];
    const allPlaced = available.length === 0;

    return (
      <motion.div
        key={sentenceIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`glass-card p-10 md:p-14 lg:p-16 ${isActive ? '' : 'mb-4'}`}
      >
        {/* Sentence number */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-base font-semibold text-teal-500">
            Sentence {sentenceIndex + 1}
          </span>
          {isChecked && (
            <span className={`px-4 py-2 rounded-full text-base font-semibold ${
              correct
                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                : 'bg-red-500/20 text-red-500 border border-red-500/30'
            }`}>
              {correct ? '✓ Correct!' : '✗ Try again'}
            </span>
          )}
          {isRevealed && (
            <span className="px-4 py-2 rounded-full text-base font-semibold bg-amber-500/20 text-amber-500 border border-amber-500/30">
              Answer Revealed
            </span>
          )}
        </div>

        {/* Drop zone / Answer area */}
        <div 
          className={`min-h-[100px] md:min-h-[120px] p-6 rounded-2xl mb-8 border-2 border-dashed transition-all ${
            isChecked && correct
              ? 'border-green-500/50 bg-green-500/10'
              : isChecked && !correct
              ? 'border-red-500/50 bg-red-500/10'
              : isRevealed
              ? 'border-amber-500/50 bg-amber-500/10'
              : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
          }`}
        >
          {placed.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center italic text-lg">
              Tap words below to build the sentence...
            </p>
          ) : (
            <div className="flex flex-wrap gap-4 md:gap-5 justify-center">
              {placed.map((word, idx) => (
                <motion.button
                  key={`placed-${idx}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => !isRevealed && !isChecked && removeWord(sentenceIndex, idx)}
                  disabled={isRevealed || isChecked}
                  className={`px-6 py-4 md:px-8 md:py-5 rounded-2xl text-2xl md:text-3xl lg:text-4xl font-bold shadow-lg transition-all ${
                    isRevealed
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-2 border-amber-500/30 cursor-default'
                      : isChecked && correct
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-2 border-green-500/30 cursor-default'
                      : isChecked && !correct
                      ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-2 border-red-500/30 cursor-default'
                      : 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-2 border-teal-500/30 hover:bg-teal-500/30 cursor-pointer'
                  }`}
                >
                  {word}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Available words */}
        {available.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm text-[var(--text-muted)] uppercase tracking-wide">
                Available Words
              </label>
              <button
                onClick={() => shuffleAvailable(sentenceIndex)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-teal-500 hover:bg-teal-500/10 transition-all"
                title="Shuffle"
              >
                <Shuffle size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-4 md:gap-5 justify-center">
              {available.map((word, idx) => (
                <motion.button
                  key={`available-${idx}-${word}`}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => placeWord(sentenceIndex, word, idx)}
                  className="px-6 py-4 md:px-8 md:py-5 rounded-2xl text-2xl md:text-3xl lg:text-4xl font-bold bg-[var(--surface)] border-2 border-[var(--glass-border)] text-[var(--text-primary)] hover:border-teal-500/50 hover:bg-teal-500/10 shadow-md transition-all"
                >
                  {word}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
          <button
            onClick={() => resetSentence(sentenceIndex)}
            disabled={isRevealed}
            className="px-5 py-3 rounded-xl glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-all disabled:opacity-50 text-lg"
          >
            <RotateCcw size={20} />
            Reset
          </button>
          
          {!isRevealed && !isChecked && allPlaced && (
            <button
              onClick={() => checkAnswer(sentenceIndex)}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg text-lg"
            >
              <Check size={22} />
              Check
            </button>
          )}
          
          {!isRevealed && (isChecked && !correct || !allPlaced) && (
            <button
              onClick={() => revealAnswer(sentenceIndex)}
              className="px-5 py-3 rounded-xl glass-card text-amber-500 hover:bg-amber-500/10 flex items-center gap-2 transition-all text-lg"
            >
              <Eye size={20} />
              Reveal
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // Victory screen
  if (isComplete) {
    const correctCount = isCorrect.filter(Boolean).length;
    const totalCount = gameData.sentences.length;
    const percentage = Math.round((correctCount / totalCount) * 100);

    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-[var(--glass-border)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href="/activities/sentence-jumbles"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all flex items-center gap-2"
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
            className="glass-card p-8 md:p-12 text-center max-w-md"
          >
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Activity Complete!
            </h2>
            <div className="text-6xl font-black text-teal-500 mb-2">
              {percentage}%
            </div>
            <p className="text-[var(--text-muted)] mb-8">
              {correctCount} of {totalCount} sentences correct
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsComplete(false);
                  // Reset all states
                  setPlacedWords(gameData.sentences.map(() => []));
                  setAvailableWords(gameData.sentences.map(s => [...s.jumbled]));
                  setRevealed(gameData.sentences.map(() => false));
                  setChecked(gameData.sentences.map(() => false));
                  setIsCorrect(gameData.sentences.map(() => false));
                  if (gameData.timerEnabled) {
                    setTimeLeft(gameData.timerSeconds);
                  }
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold hover:opacity-90 transition-all"
              >
                Try Again
              </button>
              <Link
                href="/activities/sentence-jumbles"
                className="px-6 py-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
              >
                New Activity
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

  // ============ ALL AT ONCE VIEW ============
  if (gameData.displayMode === "all-at-once") {
    return (
      <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
        <AnimatedPaths isDark={isDark} />

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 flex justify-between items-center border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <Link href="/" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all" title="Back to home">
                <Home size={20} />
              </Link>
              <Link href="/activities/sentence-jumbles" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all" title="Settings">
                <Settings size={20} />
              </Link>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">🔀 Sentence Jumbles</h1>
            <div className="flex items-center gap-2">
              {gameData.timerEnabled && (
                <div className={`px-4 py-2 rounded-xl glass-card font-mono font-bold ${
                  timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-[var(--text-primary)]'
                }`}>
                  {formatTime(timeLeft)}
                </div>
              )}
              <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
            </div>
          </header>

          {/* Progress bar */}
          <div className="p-4">
            <div className="flex items-center justify-between glass-card p-4">
              <span className="text-[var(--text-muted)]">Progress</span>
              <span className="text-teal-500 font-bold">
                {isCorrect.filter(Boolean).length} / {gameData.sentences.length} correct
              </span>
            </div>
          </div>

          {/* All Sets Grid */}
          <main className="flex-1 p-6 sm:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {gameData.sentences.map((_, index) => renderSentence(index, true))}

              {/* Complete button */}
              <button
                onClick={() => setIsComplete(true)}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold hover:opacity-90 transition-all shadow-lg"
              >
                Finish Activity
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============ ONE BY ONE VIEW ============
  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
      <AnimatedPaths isDark={isDark} />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all" title="Back to home">
              <Home size={20} />
            </Link>
            <Link href="/activities/sentence-jumbles" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all" title="Settings">
              <Settings size={20} />
            </Link>
          </div>
          
          <span className="px-4 py-2 rounded-full glass-card text-[var(--text-secondary)] font-medium text-sm">
            {currentIndex + 1} / {gameData.sentences.length}
          </span>
          
          <div className="flex items-center gap-2">
            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
          {/* Timer */}
          {gameData.timerEnabled && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className={`text-6xl md:text-7xl font-black tabular-nums tracking-tight transition-colors duration-300 ${
                timeLeft <= 10 && timeLeft > 0 ? "text-red-500 animate-pulse" : timeLeft === 0 ? "text-red-500" : "text-[var(--text-primary)]"
              }`}>
                {formatTime(timeLeft)}
              </div>
            </motion.div>
          )}

          {/* Main Card */}
          <div className="w-full max-w-6xl">
            <AnimatePresence mode="wait">
              {renderSentence(currentIndex, true)}
            </AnimatePresence>
          </div>
        </main>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className={`p-4 rounded-2xl transition-all flex items-center justify-center ${
                currentIndex === 0 ? "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50" : "glass-card text-[var(--text-primary)] hover:text-teal-500 hover:scale-105"
              }`}
            >
              <ArrowLeft size={28} />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {gameData.sentences.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? 'w-8 bg-gradient-to-r from-teal-500 to-cyan-500'
                      : isCorrect[i]
                      ? 'w-2 bg-green-500'
                      : revealed[i]
                      ? 'w-2 bg-amber-500'
                      : checked[i]
                      ? 'w-2 bg-red-500'
                      : 'w-2 bg-[var(--glass-border)]'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="p-4 rounded-2xl glass-card text-[var(--text-primary)] hover:text-teal-500 hover:scale-105 transition-all flex items-center justify-center"
            >
              {currentIndex === gameData.sentences.length - 1 ? (
                <Check size={28} />
              ) : (
                <ArrowRight size={28} />
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
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

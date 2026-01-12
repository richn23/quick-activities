"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface ClozeGameData {
  text: string;
  words: string[];
  gapIndices: number[];
  answers: string[];
  mode: "open" | "wordbank";
  distractors: string[];
  timerEnabled: boolean;
  timerSeconds: number;
}

export default function ClozePlay() {
  const router = useRouter();

  // Dark mode state
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      if (document.documentElement.classList.contains("dark")) return true;
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  // Game state
  const [gameData, setGameData] = useState<ClozeGameData | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [wordBankWords, setWordBankWords] = useState<string[]>([]);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  // Results
  const [showResults, setShowResults] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  // Load game data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("clozeData");
      if (stored) {
        try {
          const data = JSON.parse(stored) as ClozeGameData;
          setGameData(data);
          setUserAnswers(new Array(data.gapIndices.length).fill(""));
          
          // Setup word bank
          if (data.mode === "wordbank") {
            const bankWords = [...data.answers];
            if (data.distractors && data.distractors.length > 0) {
              bankWords.push(...data.distractors);
            }
            // Shuffle
            setWordBankWords(shuffleArray(bankWords));
          }
          
          // Timer
          if (data.timerEnabled) {
            setTimeLeft(data.timerSeconds);
          }
        } catch {
          router.push("/activities/cloze");
        }
      } else {
        router.push("/activities/cloze");
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
    if (!gameData?.timerEnabled || !isTimerRunning || timeLeft <= 0 || showResults) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          handleCheckAnswers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameData?.timerEnabled, isTimerRunning, timeLeft, showResults]);

  // Shuffle function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle input change (open cloze)
  const handleInputChange = (gapIndex: number, value: string) => {
    if (!isTimerRunning && gameData?.timerEnabled) {
      setIsTimerRunning(true);
    }
    setUserAnswers(prev => {
      const next = [...prev];
      next[gapIndex] = value;
      return next;
    });
  };

  // Handle drag start (word bank)
  const handleDragStart = (word: string) => {
    if (!isTimerRunning && gameData?.timerEnabled) {
      setIsTimerRunning(true);
    }
    setDraggedWord(word);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, gapIndex: number) => {
    e.preventDefault();
    setDragOverIndex(gapIndex);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Handle drop
  const handleDrop = (gapIndex: number) => {
    if (draggedWord) {
      // If there was already a word in this gap, return it to the bank
      const previousWord = userAnswers[gapIndex];
      if (previousWord) {
        setUsedWords(prev => {
          const next = new Set(prev);
          next.delete(previousWord);
          return next;
        });
      }

      // Place the new word
      setUserAnswers(prev => {
        const next = [...prev];
        next[gapIndex] = draggedWord;
        return next;
      });
      setUsedWords(prev => new Set(prev).add(draggedWord));
    }
    setDraggedWord(null);
    setDragOverIndex(null);
  };

  // Handle click on gap to remove word (word bank mode)
  const handleGapClick = (gapIndex: number) => {
    if (gameData?.mode !== "wordbank" || showResults) return;
    
    const word = userAnswers[gapIndex];
    if (word) {
      setUserAnswers(prev => {
        const next = [...prev];
        next[gapIndex] = "";
        return next;
      });
      setUsedWords(prev => {
        const next = new Set(prev);
        next.delete(word);
        return next;
      });
    }
  };

  // Handle word click from bank (alternative to drag)
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const handleWordClick = (word: string) => {
    if (usedWords.has(word)) return;
    if (!isTimerRunning && gameData?.timerEnabled) {
      setIsTimerRunning(true);
    }
    
    if (selectedWord === word) {
      setSelectedWord(null);
    } else {
      setSelectedWord(word);
    }
  };

  const handleGapClickToPlace = (gapIndex: number) => {
    if (gameData?.mode !== "wordbank" || showResults) return;
    
    if (selectedWord) {
      // Remove previous word if any
      const previousWord = userAnswers[gapIndex];
      if (previousWord) {
        setUsedWords(prev => {
          const next = new Set(prev);
          next.delete(previousWord);
          return next;
        });
      }
      
      // Place selected word
      setUserAnswers(prev => {
        const next = [...prev];
        next[gapIndex] = selectedWord;
        return next;
      });
      setUsedWords(prev => new Set(prev).add(selectedWord));
      setSelectedWord(null);
    } else {
      // Remove word from gap
      handleGapClick(gapIndex);
    }
  };

  // Check answers
  const handleCheckAnswers = useCallback(() => {
    if (!gameData) return;
    
    const newResults = userAnswers.map((answer, index) => {
      const correctAnswer = gameData.answers[index];
      // Case-insensitive comparison, trim whitespace
      return answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    });
    
    setResults(newResults);
    setShowResults(true);
    setIsTimerRunning(false);
    
    // Play sound
    const correctCount = newResults.filter(Boolean).length;
    if (correctCount === newResults.length) {
      playSound("victory");
    } else if (correctCount >= newResults.length / 2) {
      playSound("success");
    }
  }, [gameData, userAnswers]);

  // Play sound
  const playSound = (type: "success" | "victory") => {
    if (typeof window === "undefined") return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === "victory") {
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.45);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.6);
      } else {
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch {
      // Ignore audio errors
    }
  };

  // Reset game
  const handleReset = () => {
    if (gameData) {
      setUserAnswers(new Array(gameData.gapIndices.length).fill(""));
      setUsedWords(new Set());
      setSelectedWord(null);
      setShowResults(false);
      setShowAnswers(false);
      setResults([]);
      if (gameData.timerEnabled) {
        setTimeLeft(gameData.timerSeconds);
        setIsTimerRunning(false);
      }
      if (gameData.mode === "wordbank") {
        setWordBankWords(shuffleArray([...gameData.answers, ...(gameData.distractors || [])]));
      }
    }
  };

  if (!gameData) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate score
  const correctCount = results.filter(Boolean).length;
  const totalGaps = gameData.gapIndices.length;
  const percentage = Math.round((correctCount / totalGaps) * 100);

  // Render the text with gaps
  const renderText = () => {
    let gapCounter = 0;
    
    return gameData.words.map((word, index) => {
      const gapIndex = gameData.gapIndices.indexOf(index);
      const isGap = gapIndex !== -1;
      
      if (isGap) {
        const currentGapIndex = gapCounter;
        gapCounter++;
        
        const userAnswer = userAnswers[currentGapIndex] || "";
        const isCorrect = showResults ? results[currentGapIndex] : null;
        const correctAnswer = gameData.answers[currentGapIndex];
        
        if (gameData.mode === "open") {
          // Open cloze - text input
          return (
            <span key={index} className="inline-block mx-1">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => handleInputChange(currentGapIndex, e.target.value)}
                disabled={showResults}
                className={`w-28 sm:w-36 lg:w-40 px-3 py-2 rounded-lg border-2 text-center text-lg font-medium outline-none transition-all ${
                  showResults
                    ? isCorrect
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : "border-red-500 bg-red-500/10 text-red-400"
                    : "border-emerald-500/50 bg-[var(--glass-bg)] text-[var(--text-primary)] focus:border-emerald-500"
                }`}
                placeholder="..."
              />
              {showAnswers && !isCorrect && (
                <span className="text-xs text-green-400 ml-1">({correctAnswer})</span>
              )}
            </span>
          );
        } else {
          // Word bank - drop zone
          return (
            <span
              key={index}
              className={`inline-flex items-center justify-center mx-1 min-w-[100px] sm:min-w-[120px] lg:min-w-[140px] h-10 sm:h-12 px-3 rounded-lg border-2 border-dashed text-lg transition-all cursor-pointer ${
                showResults
                  ? isCorrect
                    ? "border-green-500 bg-green-500/10"
                    : "border-red-500 bg-red-500/10"
                  : dragOverIndex === currentGapIndex
                  ? "border-emerald-400 bg-emerald-500/20 scale-105"
                  : selectedWord
                  ? "border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : userAnswer
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-[var(--glass-border)] hover:border-emerald-500/50"
              }`}
              onDragOver={(e) => handleDragOver(e, currentGapIndex)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(currentGapIndex)}
              onClick={() => handleGapClickToPlace(currentGapIndex)}
            >
              {userAnswer ? (
                <span className={`font-medium ${
                  showResults
                    ? isCorrect ? "text-green-400" : "text-red-400"
                    : "text-emerald-400"
                }`}>
                  {userAnswer}
                </span>
              ) : (
                <span className="text-[var(--text-muted)] text-sm">____</span>
              )}
              {showAnswers && !isCorrect && (
                <span className="text-xs text-green-400 ml-1">({correctAnswer})</span>
              )}
            </span>
          );
        }
      }
      
      return <span key={index}>{word} </span>;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative transition-colors duration-300">
      <AnimatedPaths isDark={isDark} />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-[var(--glass-border)] bg-[var(--background)]/80 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-emerald-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>

              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>📝</span> Simple Cloze
                </h1>
                <p className="text-[var(--text-muted)] text-sm">
                  {gameData.mode === "open" ? "Type your answers" : "Drag words to fill gaps"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {gameData.timerEnabled && (
                <div
                  className={`px-4 py-2 rounded-xl glass-card flex items-center gap-2 font-mono font-bold ${
                    timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-[var(--text-primary)]"
                  }`}
                >
                  <Clock size={18} />
                  {formatTime(timeLeft)}
                </div>
              )}

              <button
                onClick={handleReset}
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-emerald-500 transition-all"
                title="Reset"
              >
                <RotateCcw size={20} />
              </button>

              <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-4 sm:p-6">
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
            {/* Text with gaps */}
            <div className="glass-card p-8 sm:p-12 flex-1 mb-4">
              <p className="text-2xl sm:text-3xl lg:text-4xl leading-relaxed text-[var(--text-primary)]">
                {renderText()}
              </p>
            </div>

            {/* Word Bank (if applicable) */}
            {gameData.mode === "wordbank" && !showResults && (
              <div className="glass-card p-5 sm:p-8 mb-4">
                <label className="text-base sm:text-lg text-[var(--text-muted)] mb-4 block font-medium">
                  Word Bank {selectedWord && <span className="text-emerald-400">(tap a gap to place)</span>}
                </label>
                <div className="flex flex-wrap gap-4">
                  {wordBankWords.map((word, index) => {
                    const isUsed = usedWords.has(word);
                    const isSelected = selectedWord === word;
                    
                    return (
                      <motion.button
                        key={`${word}-${index}`}
                        draggable={!isUsed}
                        onDragStart={() => handleDragStart(word)}
                        onDragEnd={() => setDraggedWord(null)}
                        onClick={() => handleWordClick(word)}
                        className={`px-6 py-4 rounded-xl text-xl md:text-2xl font-medium transition-all ${
                          isUsed
                            ? "bg-[var(--glass-bg)] text-[var(--text-muted)] opacity-40 cursor-not-allowed"
                            : isSelected
                            ? "bg-emerald-500 text-white scale-105 shadow-lg shadow-emerald-500/30"
                            : "glass-card text-[var(--text-primary)] hover:bg-emerald-500/10 hover:text-emerald-400 cursor-grab active:cursor-grabbing"
                        }`}
                        whileHover={!isUsed ? { scale: 1.05 } : {}}
                        whileTap={!isUsed ? { scale: 0.95 } : {}}
                      >
                        {word}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-4">
                  Tap a word to select, then tap a gap • Or drag and drop
                </p>
              </div>
            )}

            {/* Results */}
            <AnimatePresence>
              {showResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 text-center"
                >
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {percentage === 100 ? (
                      <Trophy size={48} className="text-yellow-500" />
                    ) : percentage >= 50 ? (
                      <CheckCircle size={48} className="text-green-500" />
                    ) : (
                      <XCircle size={48} className="text-red-500" />
                    )}
                  </div>
                  
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    {percentage === 100 ? "Perfect!" : percentage >= 70 ? "Great job!" : percentage >= 50 ? "Good effort!" : "Keep practicing!"}
                  </h2>
                  
                  <div className="text-4xl font-bold text-emerald-500 mb-4">
                    {correctCount} / {totalGaps}
                    <span className="text-lg text-[var(--text-muted)] ml-2">({percentage}%)</span>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center">
                    {!showAnswers && (
                      <button
                        onClick={() => setShowAnswers(true)}
                        className="px-6 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 font-semibold transition-all flex items-center gap-2"
                      >
                        Reveal Answers
                      </button>
                    )}
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-emerald-500 font-semibold transition-all flex items-center gap-2"
                    >
                      <RotateCcw size={18} />
                      Try Again
                    </button>
                    <Link
                      href="/activities/cloze"
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold transition-all hover:opacity-90"
                    >
                      New Text
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Check Answers Button */}
            {!showResults && (
              <button
                onClick={handleCheckAnswers}
                className="w-full max-w-md mx-auto px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-emerald-500/25"
              >
                <CheckCircle size={20} />
                Check Answers
              </button>
            )}
          </div>
        </main>

        {/* Progress indicator */}
        {!showResults && (
          <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--background)]/80 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-muted)]">Progress</span>
                <span className="text-sm text-[var(--text-muted)]">
                  {userAnswers.filter(a => a.trim()).length} / {totalGaps} filled
                </span>
              </div>
              <div className="h-2 bg-[var(--glass-bg)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(userAnswers.filter(a => a.trim()).length / totalGaps) * 100}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  RotateCcw,
  Clock,
  Shuffle,
  Trophy,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

// Difficulty colors - gradient from light to dark teal
const difficultyColors = [
  { bg: "bg-teal-300", text: "text-teal-900", border: "border-teal-400" },
  { bg: "bg-teal-400", text: "text-teal-900", border: "border-teal-500" },
  { bg: "bg-teal-500", text: "text-white", border: "border-teal-600" },
  { bg: "bg-teal-600", text: "text-white", border: "border-teal-700" },
  { bg: "bg-teal-700", text: "text-white", border: "border-teal-800" },
];

interface SetData {
  category: string;
  words: string[];
  difficulty: number;
}

interface WordItem {
  word: string;
  setIndex: number;
}

type FeedbackType = "correct" | "one-away" | "two-away" | "wrong" | null;

export default function ConnectionsPlay() {
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
  const [sets, setSets] = useState<SetData[]>([]);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Game progress
  const [solvedSets, setSolvedSets] = useState<number[]>([]); // Indices of solved sets
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [shuffledWords, setShuffledWords] = useState<WordItem[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  // Load game data from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("connectionsData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.sets) {
            setSets(data.sets);
            // Create shuffled word list
            const words: WordItem[] = data.sets.flatMap(
              (set: SetData, setIndex: number) =>
                set.words.map((word: string) => ({ word, setIndex }))
            );
            setShuffledWords(shuffleArray(words));
          }
          if (data.timerEnabled !== undefined) {
            setTimerEnabled(data.timerEnabled);
            if (data.timerEnabled) {
              setTimerSeconds(data.timerSeconds || 60);
              setTimeLeft(data.timerSeconds || 60);
            }
          }
        } catch {
          router.push("/activities/connections");
        }
      } else {
        router.push("/activities/connections");
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
    if (!timerEnabled || !isTimerRunning || timeLeft <= 0 || gameComplete) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerEnabled, isTimerRunning, timeLeft, gameComplete]);

  // Shuffle function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Get unsolved words
  const unsolvedWords = useMemo(() => {
    return shuffledWords.filter((item) => !solvedSets.includes(item.setIndex));
  }, [shuffledWords, solvedSets]);

  // Handle word selection
  const handleWordClick = (word: string) => {
    if (feedback) return; // Don't allow selection during feedback

    setSelectedWords((prev) => {
      if (prev.includes(word)) {
        return prev.filter((w) => w !== word);
      }
      if (prev.length < 4) {
        const newSelection = [...prev, word];
        // Auto-check when 4 words are selected
        if (newSelection.length === 4) {
          setTimeout(() => checkSelection(newSelection), 300);
        }
        return newSelection;
      }
      return prev;
    });

    // Start timer on first interaction
    if (timerEnabled && !isTimerRunning && !gameComplete) {
      setIsTimerRunning(true);
    }
  };

  // Check selection
  const checkSelection = useCallback(
    (selection: string[]) => {
      setAttempts((prev) => prev + 1);

      // Find which set each word belongs to
      const setMatches: { [key: number]: number } = {};
      selection.forEach((word) => {
        const item = shuffledWords.find((w) => w.word === word);
        if (item) {
          setMatches[item.setIndex] = (setMatches[item.setIndex] || 0) + 1;
        }
      });

      // Check for correct match (all 4 from same set)
      const matchCounts = Object.values(setMatches);
      const maxMatch = Math.max(...matchCounts);

      if (maxMatch === 4) {
        // Correct!
        const matchedSetIndex = parseInt(
          Object.keys(setMatches).find((key) => setMatches[parseInt(key)] === 4) || "0"
        );
        setFeedback("correct");
        setFeedbackMessage(`${sets[matchedSetIndex].category}`);

        // Play success sound
        playSound("success");

        setTimeout(() => {
          setSolvedSets((prev) => [...prev, matchedSetIndex]);
          setSelectedWords([]);
          setFeedback(null);

          // Check if game is complete
          if (solvedSets.length + 1 === sets.length) {
            setGameComplete(true);
            setIsTimerRunning(false);
            playSound("victory");
          }
        }, 1500);
      } else if (maxMatch === 3) {
        // One away!
        setFeedback("one-away");
        setFeedbackMessage("One away!");
        playSound("close");
        setTimeout(() => {
          setSelectedWords([]);
          setFeedback(null);
        }, 1500);
      } else if (maxMatch === 2 && matchCounts.filter((c) => c === 2).length === 2) {
        // Two away (2+2 split)
        setFeedback("two-away");
        setFeedbackMessage("Two away!");
        playSound("close");
        setTimeout(() => {
          setSelectedWords([]);
          setFeedback(null);
        }, 1500);
      } else {
        // Wrong
        setFeedback("wrong");
        setFeedbackMessage("Try again");
        playSound("wrong");
        setTimeout(() => {
          setSelectedWords([]);
          setFeedback(null);
        }, 1000);
      }
    },
    [shuffledWords, sets, solvedSets.length]
  );

  // Play sound
  const playSound = (type: "success" | "close" | "wrong" | "victory") => {
    if (typeof window === "undefined") return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case "success":
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo && gainNode.gain.exponentialDecayTo(0.01, audioContext.currentTime + 0.4);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.4);
          break;
        case "close":
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(494, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case "wrong":
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
        case "victory":
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.6);
          break;
      }
    } catch {
      // Ignore audio errors
    }
  };

  // Shuffle remaining words
  const handleShuffle = () => {
    setShuffledWords((prev) => {
      const solved = prev.filter((item) => solvedSets.includes(item.setIndex));
      const unsolved = prev.filter((item) => !solvedSets.includes(item.setIndex));
      return [...solved, ...shuffleArray(unsolved)];
    });
    setSelectedWords([]);
  };

  // Reset game
  const handleReset = () => {
    setSolvedSets([]);
    setSelectedWords([]);
    setFeedback(null);
    setAttempts(0);
    setGameComplete(false);
    setTimeLeft(timerSeconds);
    setIsTimerRunning(false);
    // Reshuffle all words
    const words: WordItem[] = sets.flatMap((set, setIndex) =>
      set.words.map((word) => ({ word, setIndex }))
    );
    setShuffledWords(shuffleArray(words));
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get grid columns based on number of unsolved words
  const getGridCols = () => {
    const count = unsolvedWords.length;
    if (count <= 8) return "grid-cols-4";
    if (count <= 12) return "grid-cols-4";
    return "grid-cols-4";
  };

  const getDifficultyColor = (index: number) => {
    return difficultyColors[Math.min(index, difficultyColors.length - 1)];
  };

  if (sets.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

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
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>

              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>🔗</span> Connections
                </h1>
                <p className="text-[var(--text-muted)] text-sm">
                  Find {sets.length} groups of 4
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {timerEnabled && (
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
                onClick={handleShuffle}
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="Shuffle words"
              >
                <Shuffle size={20} />
              </button>

              <button
                onClick={handleReset}
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="Reset game"
              >
                <RotateCcw size={20} />
              </button>

              <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
            </div>
          </div>
        </header>

        {/* Main Game Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            {/* Solved Sets */}
            <AnimatePresence>
              {solvedSets.length > 0 && (
                <div className="mb-4 space-y-2">
                  {solvedSets
                    .sort((a, b) => a - b) // Sort by difficulty
                    .map((setIndex) => {
                      const set = sets[setIndex];
                      const color = getDifficultyColor(setIndex);
                      return (
                        <motion.div
                          key={setIndex}
                          initial={{ opacity: 0, y: -20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={`p-4 rounded-2xl ${color.bg} ${color.text} text-center`}
                        >
                          <div className="font-bold text-lg mb-1">{set.category}</div>
                          <div className="text-sm opacity-90">
                            {set.words.join(" • ")}
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              )}
            </AnimatePresence>

            {/* Feedback Message */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`mb-4 p-4 rounded-2xl text-center font-bold text-lg flex items-center justify-center gap-2 ${
                    feedback === "correct"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : feedback === "one-away"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : feedback === "two-away"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {feedback === "correct" && <Trophy size={24} />}
                  {(feedback === "one-away" || feedback === "two-away") && (
                    <AlertCircle size={24} />
                  )}
                  {feedbackMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Word Grid */}
            {!gameComplete && unsolvedWords.length > 0 && (
              <div className={`grid ${getGridCols()} gap-3`}>
                <AnimatePresence mode="popLayout">
                  {unsolvedWords.map((item) => {
                    const isSelected = selectedWords.includes(item.word);
                    return (
                      <motion.button
                        key={item.word}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          x: feedback === "wrong" && isSelected ? [0, -5, 5, -5, 5, 0] : 0,
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ 
                          layout: { duration: 0.3 },
                          x: { duration: 0.3 }
                        }}
                        onClick={() => handleWordClick(item.word)}
                        disabled={feedback !== null}
                        className={`p-4 rounded-2xl font-bold text-center transition-all uppercase tracking-wide ${
                          isSelected
                            ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30 scale-[1.02]"
                            : "glass-card text-[var(--text-primary)] hover:bg-[var(--surface-light)] hover:scale-[1.02]"
                        } ${feedback !== null ? "cursor-not-allowed" : "cursor-pointer"}`}
                        style={{
                          aspectRatio: "1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: item.word.length > 10 ? "0.75rem" : item.word.length > 7 ? "0.875rem" : "1rem",
                        }}
                      >
                        {item.word}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Selection Counter */}
            {!gameComplete && unsolvedWords.length > 0 && (
              <div className="mt-4 text-center">
                <span className="text-[var(--text-muted)] text-sm">
                  Selected: {selectedWords.length} / 4
                </span>
                {selectedWords.length > 0 && (
                  <button
                    onClick={() => setSelectedWords([])}
                    className="ml-3 text-teal-500 hover:text-teal-400 text-sm underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Victory Screen */}
            <AnimatePresence>
              {gameComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center mt-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="text-8xl mb-6"
                  >
                    🎉
                  </motion.div>
                  <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
                    All Connections Found!
                  </h2>
                  <div className="glass-card p-6 rounded-2xl inline-block">
                    <div className="text-[var(--text-muted)] mb-2">Game Stats</div>
                    <div className="flex gap-8 text-center">
                      <div>
                        <div className="text-3xl font-bold text-teal-500">{attempts}</div>
                        <div className="text-sm text-[var(--text-muted)]">Attempts</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-teal-500">{sets.length}</div>
                        <div className="text-sm text-[var(--text-muted)]">Groups Found</div>
                      </div>
                      {timerEnabled && (
                        <div>
                          <div className="text-3xl font-bold text-teal-500">
                            {formatTime(timerSeconds - timeLeft)}
                          </div>
                          <div className="text-sm text-[var(--text-muted)]">Time Taken</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex gap-4 justify-center">
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 font-semibold transition-all flex items-center gap-2"
                    >
                      <RotateCcw size={18} />
                      Play Again
                    </button>
                    <Link
                      href="/activities/connections"
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold transition-all hover:opacity-90 flex items-center gap-2"
                    >
                      New Game
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Progress indicator */}
        {!gameComplete && (
          <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--background)]/80 backdrop-blur-xl">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-muted)]">Progress</span>
                <span className="text-sm text-[var(--text-muted)]">
                  {solvedSets.length} / {sets.length} groups
                </span>
              </div>
              <div className="h-2 bg-[var(--glass-bg)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(solvedSets.length / sets.length) * 100}%` }}
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

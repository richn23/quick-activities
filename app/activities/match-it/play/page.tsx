"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Settings,
  RotateCcw,
  Shuffle,
  Undo2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";

interface Card {
  id: string;
  content: string;
  set: "A" | "B";
  pairId: string;
  paired: boolean;
}

interface PairedCards {
  cardA: Card;
  cardB: Card;
}

interface Position {
  x: number;
  y: number;
}

interface GameData {
  pairs: {
    id: string;
    itemA: string;
    itemB: string;
  }[];
}

// Sound effects
const playSound = (type: "select" | "pair" | "correct" | "wrong") => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case "select":
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case "pair":
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case "correct":
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        oscillator.start();
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
        oscillator.stop(audioContext.currentTime + 0.4);
        break;
      case "wrong":
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
    }
  } catch {
    // Silent fail
  }
};

export default function MatchItPlay() {
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
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [positions, setPositions] = useState<{ [cardId: string]: Position }>({});
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [pairedCards, setPairedCards] = useState<PairedCards[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Apply dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Generate random positions for cards
  const generatePositions = useCallback((cardList: Card[]) => {
    const newPositions: { [cardId: string]: Position } = {};
    const cardWidth = 220;
    const cardHeight = 90;
    const padding = 30;
    const headerHeight = 80;
    const matchedAreaHeight = 160;
    
    // Available area - use more of the screen
    const areaWidth = Math.min(window.innerWidth - cardWidth - padding * 2, 1600);
    const areaHeight = window.innerHeight - headerHeight - matchedAreaHeight - padding * 2;
    const startX = (window.innerWidth - areaWidth) / 2;
    
    const placedCards: { x: number; y: number; width: number; height: number }[] = [];
    
    const overlaps = (x: number, y: number) => {
      return placedCards.some(
        (card) =>
          x < card.x + card.width + 10 &&
          x + cardWidth + 10 > card.x &&
          y < card.y + card.height + 10 &&
          y + cardHeight + 10 > card.y
      );
    };
    
    cardList.forEach((card) => {
      let attempts = 0;
      let x: number, y: number;
      
      do {
        x = startX + Math.random() * (areaWidth - cardWidth);
        y = headerHeight + padding + Math.random() * (areaHeight - cardHeight);
        attempts++;
      } while (overlaps(x, y) && attempts < 100);
      
      newPositions[card.id] = { x, y };
      placedCards.push({ x, y, width: cardWidth, height: cardHeight });
    });
    
    return newPositions;
  }, []);

  // Load game data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("matchItData");
      if (stored) {
        try {
          const data = JSON.parse(stored) as GameData;
          setGameData(data);
          
          // Create cards from pairs
          const newCards: Card[] = [];
          data.pairs.forEach((pair) => {
            newCards.push({
              id: `${pair.id}-A`,
              content: pair.itemA,
              set: "A",
              pairId: pair.id,
              paired: false,
            });
            newCards.push({
              id: `${pair.id}-B`,
              content: pair.itemB,
              set: "B",
              pairId: pair.id,
              paired: false,
            });
          });
          
          // Shuffle cards
          const shuffled = [...newCards].sort(() => Math.random() - 0.5);
          setCards(shuffled);
          
          // Generate positions after a short delay to ensure DOM is ready
          setTimeout(() => {
            setPositions(generatePositions(shuffled));
          }, 100);
        } catch {
          router.push("/activities/match-it");
        }
      } else {
        router.push("/activities/match-it");
      }
    }
  }, [router, generatePositions]);

  // Handle card tap
  const handleCardTap = useCallback((card: Card) => {
    if (card.paired) return;
    
    if (!selectedCard) {
      // First selection
      playSound("select");
      setSelectedCard(card);
    } else if (selectedCard.id === card.id) {
      // Tapped same card - deselect
      setSelectedCard(null);
    } else {
      // Second selection - create pair
      playSound("pair");
      const newPair: PairedCards = { cardA: selectedCard, cardB: card };
      setPairedCards((prev) => [...prev, newPair]);
      
      // Mark both as paired
      setCards((prev) =>
        prev.map((c) =>
          c.id === selectedCard.id || c.id === card.id
            ? { ...c, paired: true }
            : c
        )
      );
      
      setSelectedCard(null);
    }
  }, [selectedCard]);

  // Undo last pair
  const handleUndo = useCallback(() => {
    if (pairedCards.length === 0) return;
    
    const lastPair = pairedCards[pairedCards.length - 1];
    setPairedCards((prev) => prev.slice(0, -1));
    
    // Unmark cards
    setCards((prev) =>
      prev.map((c) =>
        c.id === lastPair.cardA.id || c.id === lastPair.cardB.id
          ? { ...c, paired: false }
          : c
      )
    );
  }, [pairedCards]);

  // Shuffle remaining cards
  const handleShuffle = useCallback(() => {
    const unpairedCards = cards.filter((c) => !c.paired);
    const newPositions = generatePositions(unpairedCards);
    setPositions((prev) => ({ ...prev, ...newPositions }));
  }, [cards, generatePositions]);

  // Reset game
  const handleReset = useCallback(() => {
    if (!gameData) return;
    
    setSelectedCard(null);
    setPairedCards([]);
    
    // Reset cards
    const newCards: Card[] = [];
    gameData.pairs.forEach((pair) => {
      newCards.push({
        id: `${pair.id}-A`,
        content: pair.itemA,
        set: "A",
        pairId: pair.id,
        paired: false,
      });
      newCards.push({
        id: `${pair.id}-B`,
        content: pair.itemB,
        set: "B",
        pairId: pair.id,
        paired: false,
      });
    });
    
    const shuffled = [...newCards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setPositions(generatePositions(shuffled));
    setShowResults(false);
  }, [gameData, generatePositions]);

  // Check if all paired
  const allPaired = useMemo(() => {
    return gameData ? pairedCards.length === gameData.pairs.length : false;
  }, [gameData, pairedCards]);

  // Check answers
  const handleCheckAnswers = useCallback(() => {
    setShowResults(true);
  }, []);

  // Calculate results
  const results = useMemo(() => {
    return pairedCards.map((pair) => {
      const isCorrect = pair.cardA.pairId === pair.cardB.pairId;
      let correctMatch: string | null = null;
      
      if (!isCorrect && gameData) {
        // Find the correct match for cardA
        const correctPair = gameData.pairs.find((p) => p.id === pair.cardA.pairId);
        if (correctPair) {
          correctMatch = pair.cardA.set === "A" ? correctPair.itemB : correctPair.itemA;
        }
      }
      
      return { ...pair, isCorrect, correctMatch };
    });
  }, [pairedCards, gameData]);

  const correctCount = results.filter((r) => r.isCorrect).length;

  if (!gameData) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative">
      <AnimatedPaths isDark={isDark} />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-blue-500 transition-all" title="Back to home">
              <Home size={20} />
            </Link>
            <Link href="/activities/match-it" className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-blue-500 transition-all" title="Settings">
              <Settings size={20} />
            </Link>
          </div>
          
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>🧩</span> Match It
          </h1>
          
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 rounded-full glass-card text-[var(--text-secondary)] font-medium text-sm">
              {pairedCards.length} / {gameData.pairs.length} paired
            </span>
            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </header>

        {/* Cards Area */}
        <div className="flex-1 relative">
          {cards.map((card) => {
            const pos = positions[card.id];
            if (!pos || card.paired) return null;
            
            const isSelected = selectedCard?.id === card.id;
            
            return (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: isSelected ? 1.05 : 1,
                  x: pos.x,
                  y: pos.y,
                }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                onClick={() => handleCardTap(card)}
                className={`absolute px-6 py-5 rounded-2xl cursor-pointer transition-all duration-200 min-w-[180px] max-w-[280px] text-center ${
                  isSelected ? "ring-4 ring-yellow-400 z-20 scale-105" : "z-10"
                } ${
                  card.set === "A"
                    ? "bg-teal-500/20 border-2 border-teal-500/50 hover:bg-teal-500/30"
                    : "bg-amber-500/20 border-2 border-amber-500/50 hover:bg-amber-500/30"
                } text-[var(--text-primary)] font-bold text-xl md:text-2xl shadow-lg`}
                style={{ left: 0, top: 0 }}
              >
                {card.content}
              </motion.button>
            );
          })}
        </div>

        {/* Matched Area */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--glass-bg)] border-t border-[var(--glass-border)] backdrop-blur-sm z-20">
          {/* Control Buttons */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={pairedCards.length === 0}
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-blue-500 transition-all disabled:opacity-30"
                title="Undo"
              >
                <Undo2 size={20} />
              </button>
              <button
                onClick={handleShuffle}
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-blue-500 transition-all"
                title="Shuffle"
              >
                <Shuffle size={20} />
              </button>
              <button
                onClick={handleReset}
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-blue-500 transition-all"
                title="Reset"
              >
                <RotateCcw size={20} />
              </button>
            </div>
            
            {allPaired && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleCheckAnswers}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg"
              >
                <Check size={20} />
                Check Answers
              </motion.button>
            )}
          </div>

          {/* Paired Cards Display */}
          <div className="flex flex-wrap gap-3 justify-center max-h-20 overflow-y-auto">
            {pairedCards.map((pair, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
              >
                <span className="text-teal-500 text-base font-semibold">{pair.cardA.content}</span>
                <span className="text-[var(--text-muted)]">↔</span>
                <span className="text-amber-500 text-base font-semibold">{pair.cardB.content}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Results Modal */}
        <AnimatePresence>
          {showResults && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => setShowResults(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="glass-card p-8 md:p-10 max-h-[85vh] overflow-auto w-full max-w-3xl">
                  <h2 className="text-3xl md:text-4xl font-bold text-center text-[var(--text-primary)] mb-8">
                    Results
                  </h2>
                  
                  <div className="space-y-4 mb-8">
                    {results.map((result, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`p-5 rounded-2xl border-2 ${
                          result.isCorrect
                            ? "bg-green-500/20 border-green-500"
                            : "bg-red-500/20 border-red-500"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 text-lg md:text-xl">
                            <span className="text-teal-500 font-semibold">{result.cardA.content}</span>
                            <span className="text-[var(--text-muted)]">↔</span>
                            <span className="text-amber-500 font-semibold">{result.cardB.content}</span>
                          </div>
                          {result.isCorrect ? (
                            <Check className="w-8 h-8 text-green-500 shrink-0" />
                          ) : (
                            <X className="w-8 h-8 text-red-500 shrink-0" />
                          )}
                        </div>
                        
                        {!result.isCorrect && result.correctMatch && (
                          <div className="mt-3 text-base text-[var(--text-secondary)]">
                            Correct: {result.cardA.content} ↔{" "}
                            <span className="text-amber-500 font-semibold">{result.correctMatch}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="text-center mb-8">
                    <div className={`text-6xl md:text-7xl font-black ${
                      correctCount === results.length
                        ? "text-green-500"
                        : correctCount >= results.length / 2
                        ? "text-amber-500"
                        : "text-red-500"
                    }`}>
                      {correctCount} / {results.length}
                    </div>
                    <p className="text-[var(--text-muted)] mt-2 text-lg">
                      {correctCount === results.length
                        ? "Perfect! 🎉"
                        : correctCount >= results.length / 2
                        ? "Good job! 👏"
                        : "Keep practicing! 💪"}
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => {
                        setShowResults(false);
                        handleReset();
                      }}
                      className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={22} />
                      Play Again
                    </button>
                    <Link
                      href="/activities/match-it"
                      className="px-8 py-4 rounded-xl glass-card text-[var(--text-primary)] hover:text-blue-500 transition-all text-center text-lg font-semibold"
                    >
                      New Setup
                    </Link>
                    <Link
                      href="/"
                      className="px-8 py-4 rounded-xl glass-card text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center gap-2 transition-all text-lg"
                    >
                      <Home size={22} />
                      Home
                    </Link>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

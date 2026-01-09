"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Info,
  X,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { LabeledToggle } from "@/components/ui/labeled-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";
import { supabase } from "@/lib/supabase";

// Activity info content
const activityInfo = {
  title: "Connections",
  description: "A word grouping game where students find sets of connected words from a mixed grid. Inspired by NYT Connections - great for vocabulary categorization and critical thinking.",
  primaryFunction: "Vocabulary Categorization & Critical Thinking",
  skills: ["Categorization", "Vocabulary", "Pattern recognition", "Team collaboration"],
  suggestedLevels: "A2 and above",
  howToPlay: [
    "All words are displayed in a shuffled grid",
    "Teacher (or students) select 4 words that belong together",
    "If correct, the set locks at the top with its category revealed",
    "Continue until all sets are found",
    "Hints show 'One away!' or 'Two away!' for near-misses",
  ],
  tips: [
    "Start with easier, more obvious categories",
    "Encourage discussion before committing to a guess",
    "The harder categories may have misleading connections",
    "Great for reviewing themed vocabulary units",
  ],
};

// Difficulty colors - gradient from light to dark teal
const difficultyColors = [
  { bg: "bg-teal-300", text: "text-teal-900", border: "border-teal-400", label: "Easiest" },
  { bg: "bg-teal-400", text: "text-teal-900", border: "border-teal-500", label: "Easy" },
  { bg: "bg-teal-500", text: "text-white", border: "border-teal-600", label: "Medium" },
  { bg: "bg-teal-600", text: "text-white", border: "border-teal-700", label: "Hard" },
  { bg: "bg-teal-700", text: "text-white", border: "border-teal-800", label: "Hardest" },
];

interface SetData {
  category: string;
  words: string[];
  difficulty: number; // 0 = easiest, increases with index
}

export default function ConnectionsSetup() {
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

  // Info panel state
  const [showInfo, setShowInfo] = useState(false);

  // Mode: 'manual' or 'ai'
  const [mode, setMode] = useState<"manual" | "ai">("manual");

  // Parameters
  const [numSets, setNumSets] = useState(4);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);

  // AI specific
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Sets data - restore from sessionStorage if returning from whiteboard
  const [sets, setSets] = useState<SetData[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("connectionsData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.sets && Array.isArray(data.sets) && data.sets.length > 0) {
            return data.sets;
          }
        } catch {
          // Fall through to defaults
        }
      }
    }
    return [
      { category: "Fruits", words: ["Apple", "Banana", "Orange", "Grape"], difficulty: 0 },
      { category: "Countries", words: ["France", "Japan", "Brazil", "Egypt"], difficulty: 1 },
      { category: "Colors", words: ["Red", "Blue", "Green", "Yellow"], difficulty: 2 },
      { category: "Animals", words: ["Dog", "Cat", "Bird", "Fish"], difficulty: 3 },
    ];
  });

  // Restore other settings from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("connectionsData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.timerEnabled !== undefined) setTimerEnabled(data.timerEnabled);
          if (data.timerSeconds) setTimerSeconds(data.timerSeconds);
          if (data.sets?.length) {
            setNumSets(data.sets.length);
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }, []);

  // Apply dark mode class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Update sets when numSets changes
  useEffect(() => {
    setSets((prev) => {
      const newSets = [...prev];
      // Adjust number of sets
      while (newSets.length < numSets) {
        newSets.push({ 
          category: "", 
          words: ["", "", "", ""], 
          difficulty: newSets.length 
        });
      }
      while (newSets.length > numSets) {
        newSets.pop();
      }
      // Update difficulty indices
      return newSets.map((set, index) => ({
        ...set,
        difficulty: index,
      }));
    });
  }, [numSets]);

  const updateCategory = (setIndex: number, value: string) => {
    setSets((prev) =>
      prev.map((set, i) =>
        i === setIndex ? { ...set, category: value } : set
      )
    );
  };

  const updateWord = (setIndex: number, wordIndex: number, value: string) => {
    setSets((prev) =>
      prev.map((set, i) =>
        i === setIndex
          ? { ...set, words: set.words.map((w, wi) => (wi === wordIndex ? value : w)) }
          : set
      )
    );
  };

  const addSet = () => {
    if (numSets < 5) {
      setSets((prev) => [...prev, { category: "", words: ["", "", "", ""], difficulty: prev.length }]);
      setNumSets((n) => n + 1);
    }
  };

  const removeSet = (index: number) => {
    if (numSets > 3) {
      setSets((prev) => prev.filter((_, i) => i !== index).map((set, i) => ({ ...set, difficulty: i })));
      setNumSets((n) => n - 1);
    }
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-connections', {
        body: {
          cefr_level: cefrLevel,
          num_sets: numSets,
          topic: aiPrompt,
        }
      });

      if (error) throw error;

      if (data?.sets) {
        sessionStorage.removeItem("connectionsData");
        setSets(data.sets.map((set: { category: string; words: string[] }, index: number) => ({
          ...set,
          difficulty: index,
        })));
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStart = () => {
    const gameData = {
      sets,
      timerEnabled,
      timerSeconds,
    };
    sessionStorage.setItem("connectionsData", JSON.stringify(gameData));
    router.push("/activities/connections/play");
  };

  // Validation - all categories and words filled
  const isValid = sets.every(
    (set) => set.category.trim() && set.words.every((w) => w.trim())
  );

  const getDifficultyColor = (index: number) => {
    return difficultyColors[Math.min(index, difficultyColors.length - 1)];
  };

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative transition-colors duration-300">
      <AnimatedPaths isDark={isDark} />

      {/* Info Panel Overlay */}
      <AnimatePresence>
        {showInfo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowInfo(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="fixed left-0 top-0 bottom-0 w-full max-w-md bg-[var(--surface)] border-r border-[var(--glass-border)] z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {activityInfo.title}
                  </h2>
                  <button
                    onClick={() => setShowInfo(false)}
                    className="p-2 rounded-lg hover:bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <p className="text-[var(--text-secondary)] mb-6">
                  {activityInfo.description}
                </p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-teal-500 uppercase tracking-wide mb-2">
                      Primary Function
                    </h3>
                    <p className="text-[var(--text-primary)]">{activityInfo.primaryFunction}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-teal-500 uppercase tracking-wide mb-2">
                      Skills Developed
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {activityInfo.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-sm border border-teal-500/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-teal-500 uppercase tracking-wide mb-2">
                      Suggested Levels
                    </h3>
                    <p className="text-[var(--text-primary)]">{activityInfo.suggestedLevels}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-teal-500 uppercase tracking-wide mb-3">
                      How to Play
                    </h3>
                    <ol className="space-y-2">
                      {activityInfo.howToPlay.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                          <span className="text-teal-400 font-bold">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-teal-500 uppercase tracking-wide mb-2">
                      Difficulty Colors
                    </h3>
                    <div className="space-y-2">
                      {difficultyColors.slice(0, numSets).map((color, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded ${color.bg}`} />
                          <span className="text-[var(--text-secondary)] text-sm">{color.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-teal-500 uppercase tracking-wide mb-2">
                      Teaching Tips
                    </h3>
                    <ul className="space-y-2">
                      {activityInfo.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                          <span className="text-teal-400 mt-1">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 min-h-screen pb-24">
        {/* Header */}
        <header className="p-4 border-b border-[var(--glass-border)] sticky top-0 bg-[var(--background)]/80 backdrop-blur-xl z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>

              <button
                onClick={() => setShowInfo(true)}
                className="p-3 rounded-xl glass-card text-teal-500 hover:text-teal-400 hover:scale-105 transition-all"
                title="Activity information"
              >
                <Info size={20} />
              </button>

              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>🔗</span> Connections
                </h1>
                <p className="text-[var(--text-muted)] text-sm">Setup your activity</p>
              </div>
            </div>

            <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto p-4">
          <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="glass-card p-5 animate-waterfall animate-waterfall-1">
              <label className="text-sm text-[var(--text-muted)] mb-4 block font-medium">
                Setup Mode
              </label>
              <div className="flex items-center justify-center">
                <LabeledToggle
                  leftLabel="✏️ Manual"
                  rightLabel="✨ AI"
                  isRight={mode === "ai"}
                  onToggle={() => setMode(mode === "manual" ? "ai" : "manual")}
                />
              </div>
            </div>

            {/* AI Options */}
            <div 
              className="grid transition-all duration-300 ease-out"
              style={{ 
                gridTemplateRows: mode === "ai" ? "1fr" : "0fr",
                opacity: mode === "ai" ? 1 : 0,
              }}
            >
              <div className="overflow-hidden">
                <div className="glass-card p-5">
                  <label className="text-sm text-[var(--text-muted)] mb-3 block font-medium">
                    AI Settings
                  </label>

                  <div className="mb-4">
                    <label className="text-xs text-[var(--text-muted)] mb-2 block">
                      CEFR Level
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                        <button
                          key={level}
                          onClick={() => setCefrLevel(level)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            cefrLevel === level
                              ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                              : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-2 block">
                      Topic / Theme
                    </label>
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., travel, hotels, food, transport..."
                      className="w-full p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-teal-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
                      Generated words will be 1-2 words each
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Parameters */}
            <div className="glass-card p-5 animate-waterfall animate-waterfall-2">
              <label className="text-sm text-[var(--text-muted)] mb-4 block font-medium">
                Parameters
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* Number of Sets */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-2 block">
                    Number of Sets (3-5)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNumSets(Math.max(3, numSets - 1))}
                      disabled={numSets <= 3}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={numSets}
                      readOnly
                      className="flex-1 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold outline-none"
                    />
                    <button
                      onClick={() => setNumSets(Math.min(5, numSets + 1))}
                      disabled={numSets >= 5}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Words per Set - Fixed at 4 */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-2 block">
                    Words per Set
                  </label>
                  <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold">
                    4 (fixed)
                  </div>
                </div>
              </div>

              {/* Timer */}
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
                  <Clock size={14} /> Timer
                </label>
                <div className="flex items-center gap-3">
                  <LabeledToggle
                    leftLabel="Off"
                    rightLabel="On"
                    isRight={timerEnabled}
                    onToggle={() => setTimerEnabled(!timerEnabled)}
                    size="sm"
                  />
                  {timerEnabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={timerSeconds}
                        onChange={(e) => setTimerSeconds(Math.max(10, parseInt(e.target.value) || 60))}
                        className="w-20 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center outline-none focus:border-teal-500 transition-all text-sm"
                      />
                      <span className="text-[var(--text-muted)] text-sm">sec</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Generate Button */}
            {mode === "ai" && (
              <button
                onClick={generateWithAI}
                disabled={isGenerating}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/25"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate with AI
                  </>
                )}
              </button>
            )}

            {/* AI Note */}
            {mode === "ai" && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <Lightbulb size={20} className="text-teal-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">
                    AI will generate connected word sets
                  </p>
                  <p className="text-xs text-teal-600/80 dark:text-teal-400/80 mt-1">
                    Each set will have 4 related words and a category. Sets are ordered by difficulty (lighter = easier).
                  </p>
                </div>
              </div>
            )}

            {/* Sets Editor */}
            <div className="glass-card p-5 animate-waterfall animate-waterfall-3">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm text-[var(--text-muted)] font-medium">
                  Your Sets
                </label>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--glass-bg)] px-2 py-1 rounded-full border border-[var(--glass-border)]">
                  {numSets * 4} words total
                </span>
              </div>

              <p className="text-xs text-[var(--text-muted)] mb-4">
                Order sets from easiest (top) to hardest (bottom). Each set needs a category and 4 related words.
              </p>

              <div className="space-y-4">
                {sets.map((set, setIndex) => {
                  const color = getDifficultyColor(setIndex);
                  return (
                    <div
                      key={setIndex}
                      className={`p-4 rounded-xl border-2 ${color.border} bg-[var(--glass-bg)]`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1 rounded-lg ${color.bg} ${color.text} text-xs font-bold`}>
                            {color.label}
                          </div>
                          <span className="text-sm font-semibold text-[var(--text-secondary)]">
                            Set {setIndex + 1}
                          </span>
                        </div>
                        {numSets > 3 && (
                          <button
                            onClick={() => removeSet(setIndex)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {/* Category input */}
                      <div className="mb-3">
                        <input
                          value={set.category}
                          onChange={(e) => updateCategory(setIndex, e.target.value)}
                          placeholder="Category (e.g., Types of fruit)"
                          className={`w-full p-3 rounded-xl border-2 ${color.border} bg-[var(--surface)] text-[var(--text-primary)] font-semibold placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-teal-500/50 transition-all`}
                        />
                      </div>

                      {/* Words grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {set.words.map((word, wordIndex) => (
                          <input
                            key={wordIndex}
                            value={word}
                            onChange={(e) => updateWord(setIndex, wordIndex, e.target.value)}
                            placeholder={`Word ${wordIndex + 1}`}
                            className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] focus:border-teal-500 text-[var(--text-primary)] text-center font-medium placeholder-[var(--text-muted)] outline-none transition-all"
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {numSets < 5 && (
                <button
                  onClick={addSet}
                  className="w-full mt-4 p-3 rounded-xl border-2 border-dashed border-[var(--glass-border)] hover:border-teal-500/50 hover:bg-teal-500/5 flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-teal-500 transition-all"
                >
                  <Plus size={18} /> Add Set (max 5)
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Floating Start Button */}
        <div className="fixed bottom-6 left-6 z-30 animate-waterfall animate-waterfall-4">
          <button
            onClick={handleStart}
            disabled={!isValid}
            className={`px-6 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl transition-all ${
              isValid
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:scale-105 hover:shadow-teal-500/30"
                : "bg-[var(--glass-bg)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--glass-border)]"
            }`}
          >
            <span className="text-xl">🎮</span>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Plus,
  Trash2,
  Clock,
  Layout,
  Monitor,
  Sparkles,
  Info,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { LabeledToggle } from "@/components/ui/labeled-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";
import { supabase } from "@/lib/supabase";

// Activity info content
const activityInfo = {
  title: "Odd One Out",
  description: "A critical thinking activity where students identify which item doesn't belong in a group and explain why. Great for vocabulary review and categorization skills.",
  primaryFunction: "Vocabulary & Critical Thinking",
  skills: ["Categorization", "Vocabulary review", "Justifying opinions", "Critical thinking"],
  suggestedLevels: "A2 and above",
  usage: {
    oneAtATime: {
      title: "One at a Time",
      best: "Best for focused discussions",
      description: "Show one set at a time. Students discuss and vote before revealing the answer. Allows for deeper analysis.",
    },
    allAtOnce: {
      title: "All at Once",
      best: "Best for quick reviews",
      description: "Show all sets together. Great for team competitions or quick vocabulary review sessions.",
    },
  },
  tips: [
    "Accept multiple valid answers with good reasoning",
    "Ask students to explain WHY it's the odd one out",
    "Use vocabulary from recent lessons",
    "Mix obvious and challenging sets",
  ],
};

interface SetData {
  words: string[];
  oddOneOut: number; // index of the odd one out (-1 = not selected, open-ended)
  aiReasoningExamples?: string[]; // AI-generated reasoning examples for teachers
}

export default function OddOneOutSetup() {
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
  const [wordsPerSet, setWordsPerSet] = useState(4);
  const [displayMode, setDisplayMode] = useState<"one-at-a-time" | "all-at-once">("one-at-a-time");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);

  // AI specific
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Set<number>>(new Set());

  // Sets data - restore from sessionStorage if returning from whiteboard
  const [sets, setSets] = useState<SetData[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("oddOneOutData");
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
      { words: ["Dog", "Cat", "Bird", "Table"], oddOneOut: 3 },
      { words: ["Apple", "Banana", "Orange", "Carrot"], oddOneOut: 3 },
      { words: ["Run", "Walk", "Jump", "Book"], oddOneOut: 3 },
      { words: ["Happy", "Sad", "Angry", "Blue"], oddOneOut: 3 },
    ];
  });

  // Restore other settings from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("oddOneOutData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.displayMode) setDisplayMode(data.displayMode);
          if (data.timerEnabled !== undefined) setTimerEnabled(data.timerEnabled);
          if (data.timerSeconds) setTimerSeconds(data.timerSeconds);
          if (data.sets?.length) {
            setNumSets(data.sets.length);
            if (data.sets[0]?.words?.length) {
              setWordsPerSet(data.sets[0].words.length);
            }
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

  // Update sets when numSets or wordsPerSet changes
  useEffect(() => {
    setSets((prev) => {
      const newSets = [...prev];
      // Adjust number of sets
      while (newSets.length < numSets) {
        newSets.push({ words: Array(wordsPerSet).fill(""), oddOneOut: -1 });
      }
      while (newSets.length > numSets) {
        newSets.pop();
      }
      // Adjust words per set
      return newSets.map((set) => {
        const newWords = [...set.words];
        while (newWords.length < wordsPerSet) {
          newWords.push("");
        }
        while (newWords.length > wordsPerSet) {
          newWords.pop();
        }
        return {
          ...set, // Preserve aiReasoningExamples and other properties
          words: newWords,
          oddOneOut: set.oddOneOut === -1 ? -1 : Math.min(set.oddOneOut, wordsPerSet - 1),
        };
      });
    });
  }, [numSets, wordsPerSet]);

  const updateWord = (setIndex: number, wordIndex: number, value: string) => {
    setSets((prev) =>
      prev.map((set, i) =>
        i === setIndex
          ? { ...set, words: set.words.map((w, wi) => (wi === wordIndex ? value : w)) }
          : set
      )
    );
  };

  const setOddOneOut = (setIndex: number, wordIndex: number) => {
    setSets((prev) =>
      prev.map((set, i) => {
        if (i !== setIndex) return set;
        // Toggle: if already selected, deselect (return to neutral -1)
        const newOddOneOut = set.oddOneOut === wordIndex ? -1 : wordIndex;
        return { ...set, oddOneOut: newOddOneOut };
      })
    );
  };

  const addSet = () => {
    setSets((prev) => [...prev, { words: Array(wordsPerSet).fill(""), oddOneOut: 0 }]);
    setNumSets((n) => n + 1);
  };

  const removeSet = (index: number) => {
    setSets((prev) => prev.filter((_, i) => i !== index));
    setNumSets((n) => Math.max(1, n - 1));
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-odd-one-out', {
        body: {
          cefr_level: cefrLevel,
          num_sets: numSets,
          items_per_set: wordsPerSet,
          topic: aiPrompt,
        }
      });

      if (error) throw error;

      if (data?.sets) {
        // Clear cached data to prevent old selections from mixing with new AI data
        sessionStorage.removeItem("oddOneOutData");
        setSets(data.sets);
        setExpandedReasoning(new Set()); // Reset expanded state
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleReasoning = (index: number) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleStart = () => {
    const gameData = {
      sets,
      displayMode,
      timerEnabled,
      timerSeconds,
    };
    sessionStorage.setItem("oddOneOutData", JSON.stringify(gameData));
    router.push("/activities/odd-one-out/play");
  };

  // Validation - all words filled (odd one out selection is optional for open-ended discussion)
  const isValid = sets.every(
    (set) => set.words.every((w) => w.trim())
  );

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
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
                      Primary Function
                    </h3>
                    <p className="text-[var(--text-primary)]">{activityInfo.primaryFunction}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
                      Skills Developed
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {activityInfo.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-sm border border-orange-500/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
                      Suggested Levels
                    </h3>
                    <p className="text-[var(--text-primary)]">{activityInfo.suggestedLevels}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-3">
                      Display Modes
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                          {activityInfo.usage.oneAtATime.title}
                        </h4>
                        <p className="text-xs text-orange-400 mb-2">{activityInfo.usage.oneAtATime.best}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {activityInfo.usage.oneAtATime.description}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                          {activityInfo.usage.allAtOnce.title}
                        </h4>
                        <p className="text-xs text-orange-400 mb-2">{activityInfo.usage.allAtOnce.best}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {activityInfo.usage.allAtOnce.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
                      Teaching Tips
                    </h3>
                    <ul className="space-y-2">
                      {activityInfo.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                          <span className="text-orange-400 mt-1">•</span>
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
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-orange-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>

              <button
                onClick={() => setShowInfo(true)}
                className="p-3 rounded-xl glass-card text-orange-500 hover:text-orange-400 hover:scale-105 transition-all"
                title="Activity information"
              >
                <Info size={20} />
              </button>

              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>🎯</span> Odd One Out
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
                  onToggle={() => {
                    if (mode === "ai") {
                      // Switching to manual - reset AI state
                      setExpandedReasoning(new Set());
                    }
                    setMode(mode === "manual" ? "ai" : "manual");
                  }}
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
                              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
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
                      Topic / Category
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., animals, food, professions, countries, household items..."
                      className="w-full p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-orange-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none h-24 transition-all"
                    />
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
                    Number of Sets
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNumSets(Math.max(1, numSets - 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-orange-500 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={numSets}
                      onChange={(e) => setNumSets(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold outline-none focus:border-orange-500 transition-all"
                    />
                    <button
                      onClick={() => setNumSets(numSets + 1)}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-orange-500 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Words per Set */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-2 block">
                    Words per Set
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWordsPerSet(Math.max(3, wordsPerSet - 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-orange-500 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={wordsPerSet}
                      onChange={(e) => setWordsPerSet(Math.max(3, parseInt(e.target.value) || 3))}
                      className="flex-1 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold outline-none focus:border-orange-500 transition-all"
                    />
                    <button
                      onClick={() => setWordsPerSet(wordsPerSet + 1)}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-orange-500 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Display Mode */}
              <div className="mb-5">
                <label className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
                  <Layout size={14} /> Display Mode
                </label>
                <LabeledToggle
                  leftLabel="One by One"
                  rightLabel="All at Once"
                  isRight={displayMode === "all-at-once"}
                  onToggle={() => setDisplayMode(displayMode === "one-at-a-time" ? "all-at-once" : "one-at-a-time")}
                  size="sm"
                />
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
                        onChange={(e) => setTimerSeconds(Math.max(5, parseInt(e.target.value) || 30))}
                        className="w-20 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center outline-none focus:border-orange-500 transition-all text-sm"
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
                className="w-full p-4 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25"
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

            {/* AI Disclaimer */}
            {mode === "ai" && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Lightbulb size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                    AI Note: Open-ended activity
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                    These sets are designed for discussion. More than one answer can be correct if the reasoning is clear. 
                    Marking an odd one out is optional — encourage students to justify any choice.
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
                  {sets.length} {sets.length === 1 ? "set" : "sets"}
                </span>
              </div>

              <p className="text-xs text-[var(--text-muted)] mb-4">
                Click a word to optionally mark it as the odd one out (shown with ✓). 
                {mode === "ai" && " For discussion-based activities, you can leave this open."}
              </p>

              <div className="space-y-4">
                {sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-orange-500">
                          Set {setIndex + 1}
                        </span>
                        {set.oddOneOut === -1 && set.aiReasoningExamples && set.aiReasoningExamples.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Open-ended
                          </span>
                        )}
                      </div>
                      {sets.length > 1 && (
                        <button
                          onClick={() => removeSet(setIndex)}
                          className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {set.words.map((word, wordIndex) => (
                        <div key={wordIndex} className="relative">
                          <input
                            value={word}
                            onChange={(e) => updateWord(setIndex, wordIndex, e.target.value)}
                            placeholder={`Word ${wordIndex + 1}`}
                            className={`w-full p-3 pr-10 rounded-xl border text-center font-medium outline-none transition-all placeholder-[var(--text-muted)] ${
                              set.oddOneOut === wordIndex
                                ? "bg-orange-500/20 border-orange-500 text-[var(--text-primary)]"
                                : "bg-[var(--surface)] border-[var(--glass-border)] focus:border-orange-500 text-[var(--text-primary)]"
                            }`}
                          />
                          <button
                            onClick={() => setOddOneOut(setIndex, wordIndex)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              set.oddOneOut === wordIndex
                                ? "bg-orange-500 text-white"
                                : "bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-orange-500/20 hover:text-orange-500"
                            }`}
                            title={set.oddOneOut === wordIndex ? "Click to deselect" : "Mark as odd one out (optional)"}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Reasoning Examples (AI-generated, teacher-only) */}
                    {set.aiReasoningExamples && set.aiReasoningExamples.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleReasoning(setIndex)}
                          className="flex items-center gap-2 text-xs text-amber-500 hover:text-amber-400 transition-all"
                        >
                          {expandedReasoning.has(setIndex) ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                          <Lightbulb size={12} />
                          <span>
                            {expandedReasoning.has(setIndex) ? "Hide" : "Show"} reasoning examples
                          </span>
                        </button>
                        
                        <AnimatePresence>
                          {expandedReasoning.has(setIndex) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                <p className="text-[10px] uppercase tracking-wider text-amber-500/70 mb-2 font-semibold">
                                  Example justifications (for teacher reference)
                                </p>
                                <ul className="space-y-1.5">
                                  {set.aiReasoningExamples.map((example, i) => (
                                    <li 
                                      key={i} 
                                      className="text-xs text-[var(--text-secondary)] flex items-start gap-2"
                                    >
                                      <span className="text-amber-500 mt-0.5">•</span>
                                      <span>{example}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addSet}
                className="w-full mt-4 p-3 rounded-xl border-2 border-dashed border-[var(--glass-border)] hover:border-orange-500/50 hover:bg-orange-500/5 flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-orange-500 transition-all"
              >
                <Plus size={18} /> Add Set
              </button>
            </div>
          </div>
        </main>

        {/* Floating Whiteboard Button */}
        <div className="fixed bottom-6 left-6 z-30 animate-waterfall animate-waterfall-4">
          <button
            onClick={handleStart}
            disabled={!isValid}
            className={`px-6 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl transition-all ${
              isValid
                ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:scale-105 hover:shadow-orange-500/30"
                : "bg-[var(--glass-bg)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--glass-border)]"
            }`}
          >
            <Monitor size={22} />
            Whiteboard Mode
          </button>
        </div>
      </div>
    </div>
  );
}

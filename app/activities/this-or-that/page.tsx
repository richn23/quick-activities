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
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { LabeledToggle } from "@/components/ui/labeled-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";
import { supabase } from "@/lib/supabase";

// Type for a set with options
interface SetData {
  options: string[];
}

// Activity info content
const activityInfo = {
  title: "This or That",
  description: "A quick-fire discussion activity where students choose between two options and explain their reasoning.",
  primaryFunction: "Speaking & Giving Opinions",
  skills: ["Speaking fluency", "Justifying opinions", "Agreeing/disagreeing", "Discussion vocabulary"],
  suggestedLevels: "A2 and above",
  usage: {
    setBySet: {
      title: "Set by Set",
      best: "Best for focused discussions",
      description: "Show one pair at a time. Give students 30-60 seconds to discuss with a partner, then share with the class before moving to the next.",
    },
    allAtOnce: {
      title: "All at Once",
      best: "Best for quick warm-ups",
      description: "Show all pairs together. Students can mingle and find others with the same/different opinions, or use as a quick ice-breaker.",
    },
  },
  tips: [
    "Encourage students to explain WHY, not just choose",
    "Use 'Both' or 'Neither' as follow-up prompts",
    "Pair controversial topics with safer ones",
    "Great for practising: I prefer... because..., I'd rather..., If I had to choose...",
  ],
};

export default function ThisOrThatSetup() {
  const router = useRouter();

  // Dark mode state - check document class synchronously to prevent flash
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      // First check if document already has dark class (preserves state during navigation)
      if (document.documentElement.classList.contains('dark')) return true;
      // Then check localStorage
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      // Finally check system preference
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true; // SSR default
  });

  // Info panel state
  const [showInfo, setShowInfo] = useState(false);

  // Mode: 'manual' or 'ai'
  const [mode, setMode] = useState<"manual" | "ai">("manual");

  // Parameters
  const [numSets, setNumSets] = useState(3);
  const [optionsPerSet, setOptionsPerSet] = useState(2);
  const [displayMode, setDisplayMode] = useState<"set-by-set" | "all-at-once">("set-by-set");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);

  // AI specific
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Sets data - restore from sessionStorage if returning from whiteboard
  const [sets, setSets] = useState<SetData[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("thisOrThatData");
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
      { options: ["Summer", "Winter"] },
      { options: ["Coffee", "Tea"] },
      { options: ["Books", "Movies"] },
    ];
  });

  // Restore other settings from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("thisOrThatData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.displayMode) setDisplayMode(data.displayMode);
          if (data.timerEnabled !== undefined) setTimerEnabled(data.timerEnabled);
          if (data.timerSeconds) setTimerSeconds(data.timerSeconds);
          if (data.sets?.length) {
            setNumSets(data.sets.length);
            if (data.sets[0]?.options?.length) {
              setOptionsPerSet(data.sets[0].options.length);
            }
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }, []);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Update sets when numSets or optionsPerSet changes
  useEffect(() => {
    setSets((prev) => {
      const newSets = [...prev];
      while (newSets.length < numSets) {
        newSets.push({ options: Array(optionsPerSet).fill("") });
      }
      while (newSets.length > numSets) {
        newSets.pop();
      }
      return newSets.map((set) => ({
        options: Array(optionsPerSet)
          .fill("")
          .map((_, i) => set.options[i] || ""),
      }));
    });
  }, [numSets, optionsPerSet]);

  const updateOption = (setIndex: number, optionIndex: number, value: string) => {
    const newSets = [...sets];
    newSets[setIndex].options[optionIndex] = value;
    setSets(newSets);
  };

  const addSet = () => {
    setSets([...sets, { options: Array(optionsPerSet).fill("") }]);
    setNumSets(numSets + 1);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
      setNumSets(numSets - 1);
    }
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-this-or-that', {
        body: {
          cefr_level: cefrLevel,
          num_sets: numSets,
          options_per_set: optionsPerSet,
          topic: aiPrompt,
        }
      });

      if (error) throw error;

      if (data?.sets) {
        setSets(data.sets);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      // Optionally show error to user
    } finally {
      setIsGenerating(false);
    }
  };

  const isValid = sets.every((set) => set.options.every((opt) => opt.trim()));

  const handleStart = () => {
    const gameData = {
      sets,
      displayMode,
      timerEnabled,
      timerSeconds,
    };
    sessionStorage.setItem("thisOrThatData", JSON.stringify(gameData));
    router.push("/activities/this-or-that/play");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative transition-colors duration-300">
      {/* Animated background paths */}
      <AnimatedPaths isDark={isDark} />

      {/* Info Panel Overlay */}
      <AnimatePresence>
        {showInfo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfo(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="fixed top-0 left-0 h-full w-full max-w-md bg-[var(--surface)] border-r border-[var(--glass-border)] z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span>⚖️</span> {activityInfo.title}
                    </h2>
                    <p className="text-teal-500 text-sm font-medium mt-1">
                      {activityInfo.primaryFunction}
                    </p>
                  </div>
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

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                    Suggested Levels
                  </h3>
                  <span className="inline-block px-3 py-1 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 text-sm font-medium border border-teal-500/30">
                    {activityInfo.suggestedLevels}
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                    Skills Practised
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activityInfo.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] text-sm border border-[var(--glass-border)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                    Display Mode Guide
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-[var(--text-primary)]">
                          {activityInfo.usage.setBySet.title}
                        </h4>
                        <span className="text-xs text-teal-500">
                          {activityInfo.usage.setBySet.best}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)]">
                        {activityInfo.usage.setBySet.description}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-[var(--text-primary)]">
                          {activityInfo.usage.allAtOnce.title}
                        </h4>
                        <span className="text-xs text-teal-500">
                          {activityInfo.usage.allAtOnce.best}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)]">
                        {activityInfo.usage.allAtOnce.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                    Teaching Tips
                  </h3>
                  <ul className="space-y-2">
                    {activityInfo.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <span className="text-pink-500 mt-0.5">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
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
              {/* Home Button */}
              <Link
                href="/"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-teal-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>

              {/* Info Button */}
              <button
                onClick={() => setShowInfo(true)}
                className="p-3 rounded-xl glass-card text-teal-500 hover:text-teal-400 hover:scale-105 transition-all"
                title="Activity information"
              >
                <Info size={20} />
              </button>

              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>⚖️</span> This or That
                </h1>
                <p className="text-[var(--text-muted)] text-sm">Setup your activity</p>
              </div>
            </div>

            {/* Dark mode toggle */}
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

            {/* AI Options - using CSS grid for smooth height animation */}
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
                              ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
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
                      Topic / Ideas (guide the AI)
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., lifestyle choices, food preferences, work vs leisure, travel destinations..."
                      className="w-full p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-violet-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none h-24 transition-all"
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
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-teal-500 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={numSets}
                      onChange={(e) =>
                        setNumSets(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="flex-1 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold outline-none focus:border-teal-500 transition-all"
                    />
                    <button
                      onClick={() => setNumSets(numSets + 1)}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-teal-500 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Options per Set */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-2 block">
                    Options per Set
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setOptionsPerSet(Math.max(2, optionsPerSet - 1))
                      }
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-teal-500 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={optionsPerSet}
                      onChange={(e) =>
                        setOptionsPerSet(
                          Math.max(2, parseInt(e.target.value) || 2)
                        )
                      }
                      className="flex-1 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold outline-none focus:border-teal-500 transition-all"
                    />
                    <button
                      onClick={() => setOptionsPerSet(optionsPerSet + 1)}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-teal-500 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Display Mode */}
              <div className="mb-5">
                <label className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <Layout size={14} /> Display Mode
                </label>
                <LabeledToggle
                  leftLabel="Set by Set"
                  rightLabel="All at Once"
                  isRight={displayMode === "all-at-once"}
                  onToggle={() => setDisplayMode(displayMode === "set-by-set" ? "all-at-once" : "set-by-set")}
                  size="sm"
                />
              </div>

              {/* Timer */}
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <Clock size={14} /> Timer
                </label>
                <div className="flex items-center gap-4 flex-wrap">
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
                        onChange={(e) =>
                          setTimerSeconds(
                            Math.max(5, parseInt(e.target.value) || 30)
                          )
                        }
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
                className="w-full p-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25"
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

              <div className="space-y-3">
                {sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-pink-500">
                        Set {setIndex + 1}
                      </span>
                      {sets.length > 1 && (
                        <button
                          onClick={() => removeSet(setIndex)}
                          className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {set.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="contents">
                          <input
                            value={option}
                            onChange={(e) =>
                              updateOption(setIndex, optionIndex, e.target.value)
                            }
                            placeholder={`Option ${optionIndex + 1}`}
                            className="flex-1 min-w-[120px] p-3 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] focus:border-pink-500 text-[var(--text-primary)] text-center font-medium outline-none transition-all placeholder-[var(--text-muted)]"
                          />
                          {optionIndex < set.options.length - 1 && (
                            <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white text-xs font-bold shadow-lg">
                              VS
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addSet}
                className="w-full mt-4 p-3 rounded-xl border-2 border-dashed border-[var(--glass-border)] hover:border-pink-500/50 hover:bg-pink-500/5 flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-pink-500 transition-all"
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
                ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:scale-105 hover:shadow-pink-500/30"
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

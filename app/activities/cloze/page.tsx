"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Clock,
  Sparkles,
  Info,
  X,
  Lightbulb,
  Type,
  Shuffle,
  MousePointer,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { LabeledToggle } from "@/components/ui/labeled-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";
import { supabase } from "@/lib/supabase";

// Activity info content
const activityInfo = {
  title: "Simple Cloze",
  description: "A gap-fill activity where students complete a text with missing words. Great for vocabulary practice, grammar review, and reading comprehension.",
  primaryFunction: "Vocabulary & Grammar Practice",
  skills: ["Reading comprehension", "Vocabulary in context", "Grammar structures", "Spelling"],
  suggestedLevels: "A1 and above",
  usage: {
    openCloze: {
      title: "Open Cloze",
      best: "Best for production practice",
      description: "Students type their answers. Multiple correct answers may be possible. Encourages active recall.",
    },
    wordBank: {
      title: "Word Bank",
      best: "Best for recognition practice",
      description: "Students drag and drop words from a bank. Can include distractors for added challenge.",
    },
  },
  tips: [
    "~100 words works best for screen display",
    "For beginners, use word bank mode",
    "Open cloze allows for creative answers",
    "Include distractors for more challenge",
  ],
};

type GapMode = "nth" | "manual" | "random";
type ClozeType = "open" | "wordbank";

interface ClozeData {
  text: string;
  words: string[];
  gapIndices: number[];
  mode: ClozeType;
  distractors: string[];
}

export default function ClozeSetup() {
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

  // Text content
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog. This is a sample text that you can edit or replace with your own content. Students will practice filling in the missing words.");

  // Gap selection mode
  const [gapMode, setGapMode] = useState<GapMode>("nth");
  const [nthWord, setNthWord] = useState(7);
  const [randomCount, setRandomCount] = useState(5);
  const [manualGaps, setManualGaps] = useState<Set<number>>(new Set());

  // Cloze type
  const [clozeType, setClozeType] = useState<ClozeType>("wordbank");
  const [includeDistractors, setIncludeDistractors] = useState(false);
  const [distractors, setDistractors] = useState<string[]>([]);

  // Timer
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(120);

  // AI specific
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiWordCount, setAiWordCount] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const [excludedThemes, setExcludedThemes] = useState<string[]>([]);

  // Parse text into words
  const words = useMemo(() => {
    return text.split(/(\s+)/).filter(w => w.trim());
  }, [text]);

  const wordCount = words.length;

  // Calculate gap indices based on mode
  const gapIndices = useMemo(() => {
    if (gapMode === "nth") {
      const indices: number[] = [];
      for (let i = nthWord - 1; i < words.length; i += nthWord) {
        indices.push(i);
      }
      return indices;
    } else if (gapMode === "manual") {
      return Array.from(manualGaps).sort((a, b) => a - b);
    } else if (gapMode === "random") {
      // Generate random indices
      const count = Math.min(randomCount, words.length);
      const available = words.map((_, i) => i);
      const selected: number[] = [];
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * available.length);
        selected.push(available[randomIndex]);
        available.splice(randomIndex, 1);
      }
      return selected.sort((a, b) => a - b);
    }
    return [];
  }, [gapMode, nthWord, words.length, manualGaps, randomCount]);

  // Restore from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("clozeData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.text) setText(data.text);
          if (data.mode) setClozeType(data.mode);
          if (data.timerEnabled !== undefined) setTimerEnabled(data.timerEnabled);
          if (data.timerSeconds) setTimerSeconds(data.timerSeconds);
          if (data.distractors) setDistractors(data.distractors);
        } catch {
          // Ignore
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

  // Toggle manual gap
  const toggleManualGap = (index: number) => {
    if (gapMode !== "manual") return;
    setManualGaps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Generate with AI
  const generateWithAI = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-cloze', {
        body: {
          cefr_level: cefrLevel,
          word_count: aiWordCount,
          topic: aiPrompt,
          include_distractors: includeDistractors,
          exclude_themes: excludedThemes,
        }
      });

      if (error) throw error;

      if (data?.text) {
        setText(data.text);
        setManualGaps(new Set());
        if (data.suggested_gaps) {
          // AI can suggest which words to remove
          setGapMode("manual");
          setManualGaps(new Set(data.suggested_gaps));
        }
        if (data.distractors) {
          setDistractors(data.distractors);
        }
        // Track generated theme to avoid repetition on regenerate
        // Extract a brief theme description from the first ~20 words of generated text
        const themeHint = data.text.split(/\s+/).slice(0, 20).join(" ") + "...";
        setExcludedThemes(prev => [...prev, themeHint]);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle start
  const handleStart = () => {
    const answers = gapIndices.map(i => words[i]);
    
    const gameData: ClozeData = {
      text,
      words,
      gapIndices,
      mode: clozeType,
      distractors: includeDistractors ? distractors : [],
    };
    
    sessionStorage.setItem("clozeData", JSON.stringify({
      ...gameData,
      answers,
      timerEnabled,
      timerSeconds,
    }));
    
    router.push("/activities/cloze/play");
  };

  // Validation
  const isValid = text.trim().length > 0 && gapIndices.length > 0;

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
                    <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wide mb-2">
                      Primary Function
                    </h3>
                    <p className="text-[var(--text-primary)]">{activityInfo.primaryFunction}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wide mb-2">
                      Skills Developed
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {activityInfo.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wide mb-2">
                      Suggested Levels
                    </h3>
                    <p className="text-[var(--text-primary)]">{activityInfo.suggestedLevels}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wide mb-3">
                      Cloze Types
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                          {activityInfo.usage.openCloze.title}
                        </h4>
                        <p className="text-xs text-emerald-400 mb-2">{activityInfo.usage.openCloze.best}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {activityInfo.usage.openCloze.description}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                          {activityInfo.usage.wordBank.title}
                        </h4>
                        <p className="text-xs text-emerald-400 mb-2">{activityInfo.usage.wordBank.best}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {activityInfo.usage.wordBank.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wide mb-2">
                      Teaching Tips
                    </h3>
                    <ul className="space-y-2">
                      {activityInfo.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                          <span className="text-emerald-400 mt-1">•</span>
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
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-emerald-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>

              <button
                onClick={() => setShowInfo(true)}
                className="p-3 rounded-xl glass-card text-emerald-500 hover:text-emerald-400 hover:scale-105 transition-all"
                title="Activity information"
              >
                <Info size={20} />
              </button>

              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>📝</span> Simple Cloze
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
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                              : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-[var(--text-muted)] mb-2 block">
                        Approximate Word Count
                      </label>
                      <input
                        type="number"
                        value={aiWordCount}
                        onChange={(e) => setAiWordCount(Math.max(50, Math.min(200, parseInt(e.target.value) || 100)))}
                        className="w-full p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-emerald-500 text-[var(--text-primary)] outline-none transition-all"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
                        ~100 words recommended for display
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-2 block">
                      Topic / Guidance
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., a story about a trip to the beach, daily routines, describing a city..."
                      className="w-full p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-emerald-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none h-24 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Input (Manual Mode) */}
            {mode === "manual" && (
              <div className="glass-card p-5 animate-waterfall animate-waterfall-2">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-[var(--text-muted)] font-medium">
                    Your Text
                  </label>
                  <span className="text-xs text-[var(--text-muted)] bg-[var(--glass-bg)] px-2 py-1 rounded-full border border-[var(--glass-border)]">
                    {wordCount} words
                  </span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setManualGaps(new Set()); // Reset manual gaps when text changes
                  }}
                  placeholder="Enter or paste your text here..."
                  className="w-full p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-emerald-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none h-40 transition-all"
                />
              </div>
            )}

            {/* AI Generate Button */}
            {mode === "ai" && (
              <button
                onClick={generateWithAI}
                disabled={isGenerating}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate Text with AI
                  </>
                )}
              </button>
            )}

            {/* Gap Selection Mode */}
            <div className="glass-card p-5 animate-waterfall animate-waterfall-3">
              <label className="text-sm text-[var(--text-muted)] mb-4 block font-medium">
                Gap Selection
              </label>

              <div className="space-y-3">
                {/* Nth Word */}
                <label 
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    gapMode === "nth" 
                      ? "border-emerald-500 bg-emerald-500/10" 
                      : "border-[var(--glass-border)] hover:border-emerald-500/50"
                  }`}
                  onClick={() => setGapMode("nth")}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    gapMode === "nth" ? "border-emerald-500" : "border-[var(--text-muted)]"
                  }`}>
                    {gapMode === "nth" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                  <Hash size={18} className="text-emerald-500" />
                  <div className="flex-1">
                    <span className="text-[var(--text-primary)] font-medium">Remove every Nth word</span>
                  </div>
                  {gapMode === "nth" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setNthWord(Math.max(3, nthWord - 1)); }}
                        className="w-8 h-8 rounded-lg glass-card text-[var(--text-primary)] font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-[var(--text-primary)]">{nthWord}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setNthWord(nthWord + 1); }}
                        className="w-8 h-8 rounded-lg glass-card text-[var(--text-primary)] font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}
                </label>

                {/* Manual Selection */}
                <label 
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    gapMode === "manual" 
                      ? "border-emerald-500 bg-emerald-500/10" 
                      : "border-[var(--glass-border)] hover:border-emerald-500/50"
                  }`}
                  onClick={() => setGapMode("manual")}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    gapMode === "manual" ? "border-emerald-500" : "border-[var(--text-muted)]"
                  }`}>
                    {gapMode === "manual" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                  <MousePointer size={18} className="text-emerald-500" />
                  <div className="flex-1">
                    <span className="text-[var(--text-primary)] font-medium">Manually select words</span>
                    <span className="text-xs text-[var(--text-muted)] block">Click words in preview below</span>
                  </div>
                  {gapMode === "manual" && (
                    <span className="text-sm text-emerald-500 font-medium">
                      {manualGaps.size} selected
                    </span>
                  )}
                </label>

                {/* Random */}
                <label 
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    gapMode === "random" 
                      ? "border-emerald-500 bg-emerald-500/10" 
                      : "border-[var(--glass-border)] hover:border-emerald-500/50"
                  }`}
                  onClick={() => setGapMode("random")}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    gapMode === "random" ? "border-emerald-500" : "border-[var(--text-muted)]"
                  }`}>
                    {gapMode === "random" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                  <Shuffle size={18} className="text-emerald-500" />
                  <div className="flex-1">
                    <span className="text-[var(--text-primary)] font-medium">Remove random words</span>
                  </div>
                  {gapMode === "random" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setRandomCount(Math.max(1, randomCount - 1)); }}
                        className="w-8 h-8 rounded-lg glass-card text-[var(--text-primary)] font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-[var(--text-primary)]">{randomCount}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRandomCount(Math.min(words.length, randomCount + 1)); }}
                        className="w-8 h-8 rounded-lg glass-card text-[var(--text-primary)] font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Cloze Type */}
            <div className="glass-card p-5 animate-waterfall animate-waterfall-4">
              <label className="text-sm text-[var(--text-muted)] mb-4 block font-medium">
                Cloze Type
              </label>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <LabeledToggle
                    leftLabel="Open Cloze"
                    rightLabel="Word Bank"
                    isRight={clozeType === "wordbank"}
                    onToggle={() => setClozeType(clozeType === "open" ? "wordbank" : "open")}
                  />
                </div>

                {clozeType === "wordbank" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDistractors}
                      onChange={(e) => setIncludeDistractors(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--glass-border)] text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">Include distractors</span>
                  </label>
                )}
              </div>

              {clozeType === "open" && (
                <p className="text-xs text-amber-500 mt-3 flex items-center gap-2">
                  <Lightbulb size={14} />
                  Note: Multiple correct answers may be possible
                </p>
              )}
            </div>

            {/* Timer */}
            <div className="glass-card p-5 animate-waterfall animate-waterfall-5">
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
                      onChange={(e) => setTimerSeconds(Math.max(30, parseInt(e.target.value) || 120))}
                      className="w-20 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center outline-none focus:border-emerald-500 transition-all text-sm"
                    />
                    <span className="text-[var(--text-muted)] text-sm">sec</span>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm text-[var(--text-muted)] font-medium">
                  Preview
                </label>
                <span className="text-xs text-emerald-500 font-medium">
                  {gapIndices.length} gaps
                </span>
              </div>
              
              <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] min-h-[100px]">
                <p className="text-[var(--text-primary)] leading-relaxed">
                  {words.map((word, index) => {
                    const isGap = gapIndices.includes(index);
                    const isClickable = gapMode === "manual";
                    
                    if (isGap) {
                      return (
                        <span
                          key={index}
                          className={`inline-block mx-1 px-3 py-1 rounded bg-emerald-500/20 border-b-2 border-emerald-500 text-emerald-500 font-mono ${
                            isClickable ? "cursor-pointer hover:bg-emerald-500/30" : ""
                          }`}
                          onClick={() => isClickable && toggleManualGap(index)}
                        >
                          ____
                        </span>
                      );
                    }
                    
                    return (
                      <span
                        key={index}
                        className={`${
                          isClickable 
                            ? "cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-500 rounded px-0.5 transition-colors" 
                            : ""
                        }`}
                        onClick={() => isClickable && toggleManualGap(index)}
                      >
                        {word}{" "}
                      </span>
                    );
                  })}
                </p>
              </div>

              {gapMode === "manual" && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Click on words above to add/remove gaps
                </p>
              )}
            </div>
          </div>
        </main>

        {/* Floating Start Button */}
        <div className="fixed bottom-6 left-6 z-30">
          <button
            onClick={handleStart}
            disabled={!isValid}
            className={`px-6 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl transition-all ${
              isValid
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:scale-105 hover:shadow-emerald-500/30"
                : "bg-[var(--glass-bg)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--glass-border)]"
            }`}
          >
            <Type size={22} />
            Whiteboard Mode
          </button>
        </div>
      </div>
    </div>
  );
}


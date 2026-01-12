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
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { SkyToggle } from "@/components/ui/sky-toggle";
import { LabeledToggle } from "@/components/ui/labeled-toggle";
import { AnimatedPaths } from "@/components/ui/animated-paths";
import { supabase } from "@/lib/supabase";

// Type for a sentence
interface SentenceData {
  original: string;
  words: string[];
  jumbled: string[];
}

// Jumble a sentence using Fisher-Yates shuffle
const jumbleSentence = (sentence: string): string[] => {
  // Split into words, keeping punctuation attached
  const words = sentence.match(/[\w']+[.,!?]?|[.,!?]/g) || [];
  
  if (words.length <= 1) return words;
  
  // Shuffle using Fisher-Yates
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Ensure it's actually different from original
  if (shuffled.join(' ') === words.join(' ') && words.length > 1) {
    return jumbleSentence(sentence);
  }
  
  return shuffled;
};

// Activity info content
const activityInfo = {
  title: "Sentence Jumbles",
  description: "Students reorder jumbled words to form grammatically correct sentences.",
  primaryFunction: "Grammar & Syntax Awareness",
  skills: [
    "Word order",
    "Sentence structure",
    "Grammar patterns",
    "Reading comprehension",
  ],
  suggestedLevels: "A1 and above",
  usage: {
    oneByOne: {
      title: "One by One",
      best: "Best for focused practice",
      description: "Show one sentence at a time. Students work individually or in pairs, then reveal and discuss before moving on.",
    },
    allAtOnce: {
      title: "All at Once",
      best: "Best for races or group work",
      description: "Show all sentences. Students race to complete them all, or assign different sentences to different groups.",
    },
  },
  tips: [
    "Start with shorter sentences for lower levels",
    "Ask students to explain WHY that order is correct",
    "Use for targeted grammar practice (e.g., question formation)",
    "Great for highlighting word order differences between L1 and English",
  ],
};

export default function SentenceJumblesSetup() {
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
  const [numSentences, setNumSentences] = useState(5);
  const [displayMode, setDisplayMode] = useState<"one-by-one" | "all-at-once">("one-by-one");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);

  // AI specific
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [targetStructure, setTargetStructure] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [excludedSentences, setExcludedSentences] = useState<string[]>([]);

  // Sentences data
  const [sentences, setSentences] = useState<SentenceData[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("sentenceJumblesData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.sentences && Array.isArray(data.sentences) && data.sentences.length > 0) {
            return data.sentences;
          }
        } catch {
          // Fall through to defaults
        }
      }
    }
    // Default sentences
    const defaults = [
      "The cat sat on the mat.",
      "She is reading a book.",
      "We went to the park yesterday.",
      "Do you like ice cream?",
      "He has been working all day.",
    ];
    return defaults.map(s => ({
      original: s,
      words: s.match(/[\w']+[.,!?]?|[.,!?]/g) || [],
      jumbled: jumbleSentence(s),
    }));
  });

  // Restore settings from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("sentenceJumblesData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.displayMode) setDisplayMode(data.displayMode);
          if (data.timerEnabled !== undefined) setTimerEnabled(data.timerEnabled);
          if (data.timerSeconds) setTimerSeconds(data.timerSeconds);
          if (data.sentences?.length) {
            setNumSentences(data.sentences.length);
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Update sentences when numSentences changes
  useEffect(() => {
    setSentences((prev) => {
      const newSentences = [...prev];
      while (newSentences.length < numSentences) {
        newSentences.push({
          original: "",
          words: [],
          jumbled: [],
        });
      }
      while (newSentences.length > numSentences) {
        newSentences.pop();
      }
      return newSentences;
    });
  }, [numSentences]);

  const updateSentence = (index: number, value: string) => {
    const newSentences = [...sentences];
    const words = value.match(/[\w']+[.,!?]?|[.,!?]/g) || [];
    newSentences[index] = {
      original: value,
      words: words,
      jumbled: jumbleSentence(value),
    };
    setSentences(newSentences);
  };

  const reshuffleSentence = (index: number) => {
    const newSentences = [...sentences];
    newSentences[index] = {
      ...newSentences[index],
      jumbled: jumbleSentence(newSentences[index].original),
    };
    setSentences(newSentences);
  };

  const addSentence = () => {
    setSentences([...sentences, { original: "", words: [], jumbled: [] }]);
    setNumSentences(numSentences + 1);
  };

  const removeSentence = (index: number) => {
    if (sentences.length > 1) {
      setSentences(sentences.filter((_, i) => i !== index));
      setNumSentences(numSentences - 1);
    }
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-sentence-jumbles', {
        body: {
          cefr_level: cefrLevel,
          num_sentences: numSentences,
          target_structure: targetStructure || undefined,
          topic: topic || undefined,
          exclude_sentences: excludedSentences,
        }
      });

      if (error) throw error;

      if (data?.sentences) {
        sessionStorage.removeItem("sentenceJumblesData");
        const newSentences = data.sentences.map((s: { original: string; words: string[] }) => ({
          original: s.original,
          words: s.words,
          jumbled: jumbleSentence(s.original),
        }));
        setSentences(newSentences);
        // Track generated content to avoid repetition
        const newExclusions = data.sentences.map((s: { original: string }) => s.original);
        setExcludedSentences(prev => [...prev, ...newExclusions]);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isValid = sentences.every((s) => s.original.trim() && s.words.length > 1);

  const handleStart = () => {
    const gameData = {
      sentences,
      displayMode,
      timerEnabled,
      timerSeconds,
    };
    sessionStorage.setItem("sentenceJumblesData", JSON.stringify(gameData));
    router.push("/activities/sentence-jumbles/play");
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
                      <span>🔀</span> {activityInfo.title}
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
                          {activityInfo.usage.oneByOne.title}
                        </h4>
                        <span className="text-xs text-teal-500">
                          {activityInfo.usage.oneByOne.best}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)]">
                        {activityInfo.usage.oneByOne.description}
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
                        <span className="text-teal-500 mt-0.5">•</span>
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
                  <span>🔀</span> Sentence Jumbles
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

                  <div className="mb-4">
                    <label className="text-xs text-[var(--text-muted)] mb-2 block">
                      Target Grammar Structure (optional)
                    </label>
                    <input
                      type="text"
                      value={targetStructure}
                      onChange={(e) => setTargetStructure(e.target.value)}
                      placeholder="e.g., past simple questions, conditionals, relative clauses"
                      className="w-full p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-teal-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-2 block">
                      Topic (optional)
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., travel, food, daily routines"
                      className="w-full p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-teal-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
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
                {/* Number of Sentences */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-2 block">
                    Number of Sentences
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNumSentences(Math.max(1, numSentences - 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-teal-500 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={numSentences}
                      onChange={(e) =>
                        setNumSentences(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))
                      }
                      className="flex-1 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold outline-none focus:border-teal-500 transition-all"
                    />
                    <button
                      onClick={() => setNumSentences(Math.min(10, numSentences + 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-teal-500 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Display Mode */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-2 block flex items-center gap-2">
                    <Layout size={14} /> Display Mode
                  </label>
                  <LabeledToggle
                    leftLabel="One by One"
                    rightLabel="All at Once"
                    isRight={displayMode === "all-at-once"}
                    onToggle={() => setDisplayMode(displayMode === "one-by-one" ? "all-at-once" : "one-by-one")}
                    size="sm"
                  />
                </div>
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
                          setTimerSeconds(Math.max(10, parseInt(e.target.value) || 60))
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

            {/* Sentences Editor */}
            <div className="glass-card p-5 animate-waterfall animate-waterfall-3">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm text-[var(--text-muted)] font-medium">
                  Your Sentences
                </label>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--glass-bg)] px-2 py-1 rounded-full border border-[var(--glass-border)]">
                  {sentences.length} {sentences.length === 1 ? "sentence" : "sentences"}
                </span>
              </div>

              <div className="space-y-4">
                {sentences.map((sentence, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-teal-500">
                        Sentence {index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {sentence.original && (
                          <button
                            onClick={() => reshuffleSentence(index)}
                            className="p-2 text-[var(--text-muted)] hover:text-teal-500 hover:bg-teal-500/10 rounded-lg transition-all"
                            title="Re-shuffle"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        {sentences.length > 1 && (
                          <button
                            onClick={() => removeSentence(index)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Original sentence input */}
                    <input
                      value={sentence.original}
                      onChange={(e) => updateSentence(index, e.target.value)}
                      placeholder="Type your sentence here..."
                      className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] focus:border-teal-500 text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-muted)] mb-3"
                    />

                    {/* Preview of jumbled words */}
                    {sentence.jumbled.length > 0 && (
                      <div>
                        <label className="text-xs text-[var(--text-muted)] mb-2 block">
                          Preview (jumbled):
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {sentence.jumbled.map((word, wordIndex) => (
                            <span
                              key={wordIndex}
                              className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400 text-sm font-medium border border-teal-500/30"
                            >
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addSentence}
                className="w-full mt-4 p-3 rounded-xl border-2 border-dashed border-[var(--glass-border)] hover:border-teal-500/50 hover:bg-teal-500/5 flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-teal-500 transition-all"
              >
                <Plus size={18} /> Add Sentence
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
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:scale-105 hover:shadow-teal-500/30"
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

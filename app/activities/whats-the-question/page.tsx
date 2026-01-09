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

// Activity info content
const activityInfo = {
  title: "What's the Question?",
  description: "A reverse quiz activity where students see the answer and must guess the question. Great for reviewing content and developing question-forming skills.",
  primaryFunction: "Question Formation & Review",
  skills: ["Question structures", "Critical thinking", "Content review", "Speaking fluency"],
  suggestedLevels: "A2 and above",
  usage: {
    oneAtATime: {
      title: "One at a Time",
      best: "Best for focused practice",
      description: "Show one answer at a time. Students discuss possible questions, then flip to reveal. Great for deeper discussions.",
    },
    allAtOnce: {
      title: "All at Once",
      best: "Best for quick reviews",
      description: "Show all answers together. Students can work in teams to match or guess questions before flipping cards.",
    },
  },
  tips: [
    "Accept multiple valid questions for the same answer",
    "Encourage full question formation, not just keywords",
    "Use for grammar review (past tense questions, etc.)",
    "Great for exam/test preparation",
  ],
};

export default function WhatsTheQuestionSetup() {
  const router = useRouter();

  // Dark mode state - check document class synchronously to prevent flash
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
  const [numSets, setNumSets] = useState(5);
  const [displayMode, setDisplayMode] = useState<"one-at-a-time" | "all-at-once">("one-at-a-time");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);

  // AI specific
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Sets data - question/answer pairs
  const [sets, setSets] = useState(() => {
    // Try to load from sessionStorage first (when returning from whiteboard)
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("whatsTheQuestionData");
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
      { question: "What is the capital of France?", answer: "Paris" },
      { question: "Who wrote Romeo and Juliet?", answer: "William Shakespeare" },
      { question: "What year did World War II end?", answer: "1945" },
      { question: "What is the largest planet in our solar system?", answer: "Jupiter" },
      { question: "What is H2O commonly known as?", answer: "Water" },
    ];
  });

  // Also restore other settings from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("whatsTheQuestionData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.displayMode) setDisplayMode(data.displayMode);
          if (data.timerEnabled !== undefined) setTimerEnabled(data.timerEnabled);
          if (data.timerSeconds) setTimerSeconds(data.timerSeconds);
          if (data.sets?.length) setNumSets(data.sets.length);
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

  // Update sets when numSets changes
  useEffect(() => {
    setSets((prev) => {
      const newSets = [...prev];
      while (newSets.length < numSets) {
        newSets.push({ question: "", answer: "" });
      }
      while (newSets.length > numSets) {
        newSets.pop();
      }
      return newSets;
    });
  }, [numSets]);

  const updateSet = (index: number, field: "question" | "answer", value: string) => {
    setSets((prev) =>
      prev.map((set, i) => (i === index ? { ...set, [field]: value } : set))
    );
  };

  const addSet = () => {
    setSets((prev) => [...prev, { question: "", answer: "" }]);
    setNumSets((n) => n + 1);
  };

  const removeSet = (index: number) => {
    setSets((prev) => prev.filter((_, i) => i !== index));
    setNumSets((n) => Math.max(1, n - 1));
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-whats-the-question', {
        body: {
          cefr_level: cefrLevel,
          num_items: numSets,
          topic: aiPrompt,
        }
      });

      if (error) throw error;

      if (data?.sets) {
        setSets(data.sets);
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
      displayMode,
      timerEnabled,
      timerSeconds,
    };
    sessionStorage.setItem("whatsTheQuestionData", JSON.stringify(gameData));
    router.push("/activities/whats-the-question/play");
  };

  // Validation
  const isValid = sets.every((set) => set.question.trim() && set.answer.trim());

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden relative transition-colors duration-300">
      {/* Animated Background */}
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
                    <h3 className="text-sm font-semibold text-cyan-500 uppercase tracking-wide mb-2">
                      Primary Function
                    </h3>
                    <p className="text-[var(--text-primary)]">{activityInfo.primaryFunction}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 uppercase tracking-wide mb-2">
                      Skills Developed
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {activityInfo.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm border border-cyan-500/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 uppercase tracking-wide mb-2">
                      Suggested Levels
                    </h3>
                    <p className="text-[var(--text-primary)]">{activityInfo.suggestedLevels}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 uppercase tracking-wide mb-3">
                      Display Modes
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                          {activityInfo.usage.oneAtATime.title}
                        </h4>
                        <p className="text-xs text-cyan-400 mb-2">{activityInfo.usage.oneAtATime.best}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {activityInfo.usage.oneAtATime.description}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                          {activityInfo.usage.allAtOnce.title}
                        </h4>
                        <p className="text-xs text-cyan-400 mb-2">{activityInfo.usage.allAtOnce.best}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {activityInfo.usage.allAtOnce.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 uppercase tracking-wide mb-2">
                      Teaching Tips
                    </h3>
                    <ul className="space-y-2">
                      {activityInfo.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                          <span className="text-cyan-400 mt-1">•</span>
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
              {/* Home Button */}
              <Link
                href="/"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
                title="Back to home"
              >
                <Home size={20} />
              </Link>

              {/* Info Button */}
              <button
                onClick={() => setShowInfo(true)}
                className="p-3 rounded-xl glass-card text-cyan-500 hover:text-cyan-400 hover:scale-105 transition-all"
                title="Activity information"
              >
                <Info size={20} />
              </button>

              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>❓</span> What&apos;s the Question?
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
                              ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
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
                      Topic / Subject Area
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., history, science, grammar review, vocabulary from Unit 5..."
                      className="w-full p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-cyan-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none h-24 transition-all"
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

              <div className="space-y-5">
                {/* Number of Q&A Sets */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-2 block">
                    Number of Questions
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNumSets(Math.max(1, numSets - 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-cyan-500 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={numSets}
                      onChange={(e) =>
                        setNumSets(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="flex-1 max-w-[100px] p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold outline-none focus:border-cyan-500 transition-all"
                    />
                    <button
                      onClick={() => setNumSets(numSets + 1)}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-cyan-500 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Display Mode */}
                <div>
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
                          onChange={(e) =>
                            setTimerSeconds(
                              Math.max(5, parseInt(e.target.value) || 30)
                            )
                          }
                          className="w-20 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center outline-none focus:border-cyan-500 transition-all text-sm"
                        />
                        <span className="text-[var(--text-muted)] text-sm">sec</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Generate Button */}
            {mode === "ai" && (
              <button
                onClick={generateWithAI}
                disabled={isGenerating}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/25"
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

            {/* Q&A Editor */}
            <div className="glass-card p-5 animate-waterfall animate-waterfall-3">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm text-[var(--text-muted)] font-medium">
                  Your Questions & Answers
                </label>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--glass-bg)] px-2 py-1 rounded-full border border-[var(--glass-border)]">
                  {sets.length} {sets.length === 1 ? "card" : "cards"}
                </span>
              </div>

              <div className="space-y-3">
                {sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-cyan-500">
                        Card {setIndex + 1}
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

                    <div className="space-y-3">
                      {/* Answer (shown first - this is what students see) */}
                      <div>
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">
                          Answer (students see this first)
                        </label>
                        <input
                          value={set.answer}
                          onChange={(e) => updateSet(setIndex, "answer", e.target.value)}
                          placeholder="e.g., Paris"
                          className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] focus:border-cyan-500 text-[var(--text-primary)] font-medium outline-none transition-all placeholder-[var(--text-muted)]"
                        />
                      </div>
                      
                      {/* Question (revealed when flipped) */}
                      <div>
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">
                          Question (revealed on flip)
                        </label>
                        <input
                          value={set.question}
                          onChange={(e) => updateSet(setIndex, "question", e.target.value)}
                          placeholder="e.g., What is the capital of France?"
                          className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] focus:border-blue-500 text-[var(--text-primary)] font-medium outline-none transition-all placeholder-[var(--text-muted)]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addSet}
                className="w-full mt-4 p-3 rounded-xl border-2 border-dashed border-[var(--glass-border)] hover:border-cyan-500/50 hover:bg-cyan-500/5 flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-cyan-500 transition-all"
              >
                <Plus size={18} /> Add Card
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
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-105 hover:shadow-cyan-500/30"
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

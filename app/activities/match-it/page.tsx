"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Plus,
  Trash2,
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

// Type for a match pair
interface MatchPair {
  id: string;
  itemA: string;
  itemB: string;
}

// Match types
const matchTypes = [
  { value: "definition", label: "Word → Definition" },
  { value: "question-answer", label: "Question → Answer" },
  { value: "sentence-halves", label: "Sentence Halves" },
  { value: "collocations", label: "Collocations" },
  { value: "synonyms", label: "Synonyms" },
  { value: "antonyms", label: "Antonyms" },
];

// Activity info content
const activityInfo = {
  title: "Match It",
  description: "Students match pairs of cards scattered on screen. Great for vocabulary, collocations, sentence halves, and more. Class calls out matches, teacher pairs them, then check answers at the end.",
  primaryFunction: "Vocabulary & Connections",
  skills: [
    "Vocabulary recognition",
    "Collocation awareness",
    "Reading comprehension",
    "Pattern recognition",
  ],
  suggestedLevels: "A1 and above",
  matchTypeDescriptions: {
    definition: "Word → Definition: Match vocabulary to meanings",
    "question-answer": "Question → Answer: Match questions to responses",
    "sentence-halves": "Sentence halves: Complete split sentences",
    collocations: "Collocations: Match words that go together",
    synonyms: "Synonyms: Match words with similar meanings",
    antonyms: "Antonyms: Match opposites",
  },
  tips: [
    "Start with easier match types (synonyms/antonyms) for lower levels",
    "Use collocations to reinforce recently taught vocabulary",
    "Sentence halves work well for grammar focus (conditionals, conjunctions)",
    "Let students discuss before committing to a match",
    "Review wrong answers - great teaching moments!",
  ],
};

export default function MatchItSetup() {
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
  const [numPairs, setNumPairs] = useState(6);
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [matchType, setMatchType] = useState("definition");
  const [topic, setTopic] = useState("");

  // Pairs data
  const [pairs, setPairs] = useState<MatchPair[]>(() => {
    // Default pairs
    return [
      { id: "1", itemA: "happy", itemB: "feeling good" },
      { id: "2", itemA: "big", itemB: "large in size" },
      { id: "3", itemA: "fast", itemB: "quick, speedy" },
      { id: "4", itemA: "cold", itemB: "low temperature" },
      { id: "5", itemA: "begin", itemB: "to start" },
      { id: "6", itemA: "finish", itemB: "to end" },
    ];
  });

  // AI generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [excludedItems, setExcludedItems] = useState<string[]>([]);

  // Apply dark mode class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Update pairs when numPairs changes
  useEffect(() => {
    setPairs((prev) => {
      const newPairs = [...prev];
      while (newPairs.length < numPairs) {
        newPairs.push({
          id: `${Date.now()}-${newPairs.length}`,
          itemA: "",
          itemB: "",
        });
      }
      while (newPairs.length > numPairs) {
        newPairs.pop();
      }
      return newPairs;
    });
  }, [numPairs]);

  const updatePair = (index: number, field: "itemA" | "itemB", value: string) => {
    setPairs((prev) => {
      const newPairs = [...prev];
      newPairs[index] = { ...newPairs[index], [field]: value };
      return newPairs;
    });
  };

  const deletePair = (index: number) => {
    if (pairs.length <= 4) return;
    setPairs((prev) => prev.filter((_, i) => i !== index));
    setNumPairs((n) => Math.max(4, n - 1));
  };

  const addPair = () => {
    if (pairs.length >= 10) return;
    setPairs((prev) => [
      ...prev,
      { id: `${Date.now()}`, itemA: "", itemB: "" },
    ]);
    setNumPairs((n) => Math.min(10, n + 1));
  };

  const generateWithAI = async () => {
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-match-it", {
        body: {
          cefr_level: cefrLevel,
          num_pairs: numPairs,
          match_type: matchType,
          topic: topic || undefined,
          exclude_items: excludedItems.length > 0 ? excludedItems : undefined,
        },
      });

      if (error) throw error;

      if (data?.pairs) {
        sessionStorage.removeItem("matchItData");
        const newPairs = data.pairs.map((pair: { itemA: string; itemB: string }, i: number) => ({
          id: `${Date.now()}-${i}`,
          itemA: pair.itemA,
          itemB: pair.itemB,
        }));
        setPairs(newPairs);
        // Track generated content to avoid repetition
        const newExclusions = data.pairs.flatMap((pair: { itemA: string; itemB: string }) => [pair.itemA, pair.itemB]);
        setExcludedItems((prev) => [...prev, ...newExclusions]);
      }
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isValid = pairs.every((pair) => pair.itemA.trim() && pair.itemB.trim());

  const handleStart = () => {
    const gameData = {
      pairs: pairs.map((p) => ({
        id: p.id,
        itemA: p.itemA,
        itemB: p.itemB,
      })),
    };
    sessionStorage.setItem("matchItData", JSON.stringify(gameData));
    router.push("/activities/match-it/play");
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
                      <span>🧩</span> {activityInfo.title}
                    </h2>
                    <p className="text-blue-500 text-sm font-medium mt-1">
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
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium border border-blue-500/30">
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
                    Match Types
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(activityInfo.matchTypeDescriptions).map(([key, desc]) => (
                      <div key={key} className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <p className="text-[var(--text-secondary)] text-sm">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                    Tips for Teachers
                  </h3>
                  <ul className="space-y-2">
                    {activityInfo.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)] text-sm">
                        <span className="text-blue-500 mt-1">•</span>
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

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 flex items-center justify-between border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-blue-500 transition-all"
              title="Back to home"
            >
              <Home size={20} />
            </Link>
            <button
              onClick={() => setShowInfo(true)}
              className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-blue-500 transition-all"
              title="Activity info"
            >
              <Info size={20} />
            </button>
          </div>
          
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>🧩</span> Match It
          </h1>
          
          <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Mode Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Setup Mode
              </h2>
              <LabeledToggle
                isRight={mode === "ai"}
                onToggle={() => setMode(mode === "manual" ? "ai" : "manual")}
                leftLabel="Manual"
                rightLabel="AI Generate"
              />
            </motion.div>

            {/* AI Settings */}
            <AnimatePresence>
              {mode === "ai" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-6 space-y-5"
                >
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    AI Settings
                  </h2>

                  {/* CEFR Level */}
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                      CEFR Level
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                        <button
                          key={level}
                          onClick={() => setCefrLevel(level)}
                          className={`px-4 py-2 rounded-xl font-medium transition-all ${
                            cefrLevel === level
                              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                              : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Match Type */}
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                      Match Type
                    </label>
                    <select
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {matchTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Number of Pairs */}
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                      Number of Pairs
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setNumPairs(Math.max(4, numPairs - 1))}
                        className="w-10 h-10 rounded-xl glass-card flex items-center justify-center text-[var(--text-primary)] hover:text-blue-500 transition-all"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-2xl font-bold text-[var(--text-primary)]">
                        {numPairs}
                      </span>
                      <button
                        onClick={() => setNumPairs(Math.min(10, numPairs + 1))}
                        className="w-10 h-10 rounded-xl glass-card flex items-center justify-center text-[var(--text-primary)] hover:text-blue-500 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                      Topic (optional)
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., travel, food, health"
                      className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generateWithAI}
                    disabled={isGenerating}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        Generate with AI
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pairs Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Matching Pairs
                </h2>
                <span className="text-sm text-[var(--text-muted)]">
                  {pairs.length} pairs
                </span>
              </div>

              <div className="space-y-4">
                {pairs.map((pair, index) => (
                  <motion.div
                    key={pair.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center font-semibold text-sm shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={pair.itemA}
                      onChange={(e) => updatePair(index, "itemA", e.target.value)}
                      placeholder="Item A..."
                      className="flex-1 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                    <span className="text-[var(--text-muted)] font-bold">↔</span>
                    <input
                      type="text"
                      value={pair.itemB}
                      onChange={(e) => updatePair(index, "itemB", e.target.value)}
                      placeholder="Item B..."
                      className="flex-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <button
                      onClick={() => deletePair(index)}
                      disabled={pairs.length <= 4}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </div>

              {pairs.length < 10 && (
                <button
                  onClick={addPair}
                  className="mt-4 w-full py-3 rounded-xl glass-card text-[var(--text-secondary)] hover:text-blue-500 flex items-center justify-center gap-2 transition-all"
                >
                  <Plus size={18} />
                  Add Pair
                </button>
              )}
            </motion.div>

            {/* Start Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={handleStart}
              disabled={!isValid}
              className="w-full py-5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Monitor size={24} />
              Whiteboard Mode
            </motion.button>
          </div>
        </main>
      </div>
    </div>
  );
}

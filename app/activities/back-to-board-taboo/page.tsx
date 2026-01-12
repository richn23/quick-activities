"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Plus,
  Trash2,
  Clock,
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

// Type for a taboo item
interface TabooItem {
  word: string;
  tabooWords: string[];
}

// Activity info content
const activityInfo = {
  title: "Back to Board: Taboo",
  description: "A classic guessing game where one student faces away from the board while classmates describe words WITHOUT using forbidden 'taboo' words.",
  primaryFunction: "Speaking & Vocabulary",
  skills: [
    "Circumlocution",
    "Vocabulary activation",
    "Paraphrasing",
    "Listening comprehension",
  ],
  suggestedLevels: "A2 and above",
  howItWorks: [
    "One student sits with their back to the board",
    "A word appears on screen with taboo words",
    "Classmates describe it WITHOUT using taboo words",
    "Guesser tries to figure out the word",
    "Teacher marks correct/wrong and moves on",
  ],
  tips: [
    "Make sure the guesser can't see the screen",
    "Encourage creative descriptions",
    "Penalize use of taboo words for extra challenge",
    "Rotate guessers frequently for engagement",
  ],
};

export default function BackToBoardTabooSetup() {
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
  const [numItems, setNumItems] = useState(10);
  const [tabooWordsPerItem, setTabooWordsPerItem] = useState(3);
  const [timerMode, setTimerMode] = useState<"per-item" | "total" | "off">("per-item");
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [perItemSeconds, setPerItemSeconds] = useState(30);

  // AI specific
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [excludedWords, setExcludedWords] = useState<string[]>([]);

  // Items data
  const [items, setItems] = useState<TabooItem[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("backToBoardTabooData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            return data.items;
          }
        } catch {
          // Fall through to defaults
        }
      }
    }
    // Default items
    return [
      { word: "Beach", tabooWords: ["sand", "ocean", "swim"] },
      { word: "Computer", tabooWords: ["keyboard", "screen", "mouse"] },
      { word: "Birthday", tabooWords: ["cake", "candles", "party"] },
    ];
  });

  // Restore settings from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem("backToBoardTabooData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.timerMode) setTimerMode(data.timerMode);
          if (data.timerSeconds) setTimerSeconds(data.timerSeconds);
          if (data.perItemSeconds) setPerItemSeconds(data.perItemSeconds);
          if (data.items?.length) {
            setNumItems(data.items.length);
            if (data.items[0]?.tabooWords?.length) {
              setTabooWordsPerItem(data.items[0].tabooWords.length);
            }
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

  // Update items when numItems or tabooWordsPerItem changes
  useEffect(() => {
    setItems((prev) => {
      const newItems = [...prev];
      while (newItems.length < numItems) {
        newItems.push({ word: "", tabooWords: Array(tabooWordsPerItem).fill("") });
      }
      while (newItems.length > numItems) {
        newItems.pop();
      }
      return newItems.map((item) => ({
        word: item.word,
        tabooWords: Array(tabooWordsPerItem)
          .fill("")
          .map((_, i) => item.tabooWords[i] || ""),
      }));
    });
  }, [numItems, tabooWordsPerItem]);

  const updateWord = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].word = value;
    setItems(newItems);
  };

  const updateTabooWord = (itemIndex: number, tabooIndex: number, value: string) => {
    const newItems = [...items];
    newItems[itemIndex].tabooWords[tabooIndex] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { word: "", tabooWords: Array(tabooWordsPerItem).fill("") }]);
    setNumItems(numItems + 1);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      setNumItems(numItems - 1);
    }
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-taboo', {
        body: {
          cefr_level: cefrLevel,
          num_items: numItems,
          taboo_words_per_item: tabooWordsPerItem,
          topic: topic || undefined,
          exclude_words: excludedWords,
        }
      });

      if (error) throw error;

      if (data?.items) {
        sessionStorage.removeItem("backToBoardTabooData");
        setItems(data.items);
        // Track generated content to avoid repetition
        const newExclusions = data.items.map((item: TabooItem) => item.word);
        setExcludedWords(prev => [...prev, ...newExclusions]);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isValid = items.every((item) => 
    item.word.trim() && 
    item.tabooWords.every(tw => tw.trim())
  );

  const handleStart = () => {
    const gameData = {
      items,
      timerMode,
      timerSeconds,
      perItemSeconds,
    };
    sessionStorage.setItem("backToBoardTabooData", JSON.stringify(gameData));
    router.push("/activities/back-to-board-taboo/play");
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
                      <span>🗣️</span> {activityInfo.title}
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
                    How It Works
                  </h3>
                  <ol className="space-y-2">
                    {activityInfo.howItWorks.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                    Teaching Tips
                  </h3>
                  <ul className="space-y-2">
                    {activityInfo.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <span className="text-red-500 mt-0.5">•</span>
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
                className="p-3 rounded-xl glass-card text-red-500 hover:text-red-400 hover:scale-105 transition-all"
                title="Activity information"
              >
                <Info size={20} />
              </button>

              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>🗣️</span> Back to Board: Taboo
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
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
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
                      Topic (optional)
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., sports, food, technology, movies"
                      className="w-full p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:border-red-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
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
                {/* Number of Items */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-2 block">
                    Number of Items
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNumItems(Math.max(3, numItems - 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-red-500 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={numItems}
                      onChange={(e) =>
                        setNumItems(Math.max(3, Math.min(20, parseInt(e.target.value) || 3)))
                      }
                      className="flex-1 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold outline-none focus:border-red-500 transition-all"
                    />
                    <button
                      onClick={() => setNumItems(Math.min(20, numItems + 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-red-500 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Taboo Words per Item */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-2 block">
                    Taboo Words per Item
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTabooWordsPerItem(Math.max(2, tabooWordsPerItem - 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-red-500 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={tabooWordsPerItem}
                      onChange={(e) =>
                        setTabooWordsPerItem(Math.max(2, Math.min(5, parseInt(e.target.value) || 3)))
                      }
                      className="flex-1 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-semibold outline-none focus:border-red-500 transition-all"
                    />
                    <button
                      onClick={() => setTabooWordsPerItem(Math.min(5, tabooWordsPerItem + 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] font-bold hover:text-red-500 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Timer */}
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <Clock size={14} /> Timer Mode
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { id: "off", label: "Off" },
                    { id: "per-item", label: "Per Item" },
                    { id: "total", label: "Total Time" },
                  ].map((tm) => (
                    <button
                      key={tm.id}
                      onClick={() => setTimerMode(tm.id as "off" | "per-item" | "total")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        timerMode === tm.id
                          ? "bg-red-500/20 text-red-500 border border-red-500/30"
                          : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {tm.label}
                    </button>
                  ))}
                </div>
                
                {timerMode !== "off" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={timerMode === "per-item" ? perItemSeconds : timerSeconds}
                      onChange={(e) => {
                        const val = Math.max(10, parseInt(e.target.value) || 30);
                        if (timerMode === "per-item") {
                          setPerItemSeconds(val);
                        } else {
                          setTimerSeconds(val);
                        }
                      }}
                      className="w-24 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center outline-none focus:border-red-500 transition-all text-sm"
                    />
                    <span className="text-[var(--text-muted)] text-sm">
                      seconds {timerMode === "per-item" ? "per item" : "total"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Generate Button */}
            {mode === "ai" && (
              <button
                onClick={generateWithAI}
                disabled={isGenerating}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-red-500/25"
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

            {/* Items Editor */}
            <div className="glass-card p-5 animate-waterfall animate-waterfall-3">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm text-[var(--text-muted)] font-medium">
                  Your Items
                </label>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--glass-bg)] px-2 py-1 rounded-full border border-[var(--glass-border)]">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-red-500">
                        Item {index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Main word */}
                    <div className="mb-3">
                      <label className="text-xs text-[var(--text-muted)] mb-1 block">
                        Word to Guess
                      </label>
                      <input
                        value={item.word}
                        onChange={(e) => updateWord(index, e.target.value)}
                        placeholder="e.g., Birthday"
                        className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] focus:border-red-500 text-[var(--text-primary)] text-lg font-bold outline-none transition-all placeholder-[var(--text-muted)]"
                      />
                    </div>

                    {/* Taboo words */}
                    <div>
                      <label className="text-xs text-[var(--text-muted)] mb-2 block">
                        Taboo Words (can&apos;t be used)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {item.tabooWords.map((taboo, tabooIndex) => (
                          <input
                            key={tabooIndex}
                            value={taboo}
                            onChange={(e) => updateTabooWord(index, tabooIndex, e.target.value)}
                            placeholder={`Taboo ${tabooIndex + 1}`}
                            className="flex-1 min-w-[100px] p-2 rounded-lg bg-red-500/10 border border-red-500/30 focus:border-red-500 text-red-600 dark:text-red-400 text-sm font-medium outline-none transition-all placeholder-red-400/50 text-center"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addItem}
                className="w-full mt-4 p-3 rounded-xl border-2 border-dashed border-[var(--glass-border)] hover:border-red-500/50 hover:bg-red-500/5 flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-red-500 transition-all"
              >
                <Plus size={18} /> Add Item
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
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white hover:scale-105 hover:shadow-red-500/30"
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

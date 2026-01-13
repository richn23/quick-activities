"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Sparkles,
  RefreshCw,
  Play,
  Plus,
  Trash2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { SkyToggle } from "@/components/ui/sky-toggle";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";
type PromptSource = "manual" | "ai";

interface Card {
  id: string;
  prompt: string;
}

interface SessionData {
  cards: Card[];
  timerEnabled: boolean;
  timerMinutes: number;
  showFeedback: boolean;
}

export default function QuestionCardsSetup() {
  const router = useRouter();

  // Dark mode
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      if (document.documentElement.classList.contains("dark")) return true;
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Form state
  const [promptSource, setPromptSource] = useState<PromptSource>("manual");
  const [numCards, setNumCards] = useState(5);
  const [manualPrompts, setManualPrompts] = useState("");
  
  // AI state
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
  const [aiGuidance, setAiGuidance] = useState("");
  const [generatedCards, setGeneratedCards] = useState<Card[]>([]);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Shared settings
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(1);
  const [showFeedback, setShowFeedback] = useState(false);

  // Generate cards via AI
  const generateCards = async () => {
    setGenerating(true);
    setGeneratedCards([]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-speaking-cards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            cefr_level: cefrLevel,
            guidance: aiGuidance || undefined,
            num_cards: numCards,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate prompts");

      const data = await response.json();
      const prompts = data.prompts || [];
      
      setGeneratedCards(
        prompts.slice(0, numCards).map((prompt: string, index: number) => ({
          id: `card-${Date.now()}-${index}`,
          prompt,
        }))
      );
    } catch (error) {
      console.error("Error generating prompts:", error);
      // Fallback prompts for testing
      const fallback = [
        "What's something you've changed your mind about recently?",
        "If you could have dinner with anyone, who would it be and why?",
        "What's a skill everyone should learn?",
        "What's the best advice you've ever received?",
        "If you could live anywhere in the world, where would you choose?",
      ];
      setGeneratedCards(
        fallback.slice(0, numCards).map((prompt, index) => ({
          id: `card-${Date.now()}-${index}`,
          prompt,
        }))
      );
    } finally {
      setGenerating(false);
    }
  };

  // Regenerate single card
  const regenerateCard = async (cardId: string) => {
    setRegeneratingId(cardId);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-speaking-cards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            cefr_level: cefrLevel,
            guidance: aiGuidance || undefined,
            num_cards: 1,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to regenerate");

      const data = await response.json();
      const newPrompt = data.prompts?.[0];

      if (newPrompt) {
        setGeneratedCards((prev) =>
          prev.map((card) =>
            card.id === cardId ? { ...card, prompt: newPrompt } : card
          )
        );
      }
    } catch (error) {
      console.error("Error regenerating card:", error);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Update card text
  const updateCardPrompt = (cardId: string, newPrompt: string) => {
    setGeneratedCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, prompt: newPrompt } : card
      )
    );
  };

  // Delete card
  const deleteCard = (cardId: string) => {
    setGeneratedCards((prev) => prev.filter((card) => card.id !== cardId));
  };

  // Add empty card
  const addCard = () => {
    setGeneratedCards((prev) => [
      ...prev,
      { id: `card-${Date.now()}`, prompt: "" },
    ]);
  };

  // Parse manual prompts into cards
  const getManualCards = (): Card[] => {
    const lines = manualPrompts
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return [];

    // If fewer prompts than numCards, cycle through
    const cards: Card[] = [];
    for (let i = 0; i < numCards; i++) {
      cards.push({
        id: `card-${i}`,
        prompt: lines[i % lines.length],
      });
    }
    return cards;
  };

  // Get final cards
  const getFinalCards = (): Card[] => {
    if (promptSource === "manual") {
      return getManualCards();
    }
    return generatedCards.filter((card) => card.prompt.trim().length > 0);
  };

  // Check if ready to start
  const canStart = getFinalCards().length > 0;

  // Start activity
  const handleStart = () => {
    const sessionData: SessionData = {
      cards: getFinalCards(),
      timerEnabled,
      timerMinutes,
      showFeedback,
    };

    sessionStorage.setItem("questionCardsData", JSON.stringify(sessionData));
    router.push("/speaking/question-cards/present");
  };

  return (
    <BackgroundPaths isDark={isDark}>
      <div className="fixed top-6 right-6 z-50">
        <SkyToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
      </div>

      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="pt-8 pb-4 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
              <Link
                href="/speaking"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-cyan-500 transition-all"
              >
                <Home size={20} />
              </Link>
              <div>
                <h1
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Speaking Cards
                </h1>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Discussion prompts for pairs or groups
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 pb-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Prompt Source Selection */}
            <section className="glass-card p-6">
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Card Prompts
              </h2>

              {/* Radio Buttons */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="promptSource"
                    checked={promptSource === "manual"}
                    onChange={() => setPromptSource("manual")}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span style={{ color: "var(--text-primary)" }}>
                    Write my own prompts
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="promptSource"
                    checked={promptSource === "ai"}
                    onChange={() => setPromptSource("ai")}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span style={{ color: "var(--text-primary)" }}>
                    Generate with AI
                  </span>
                </label>
              </div>

              {/* Number of Cards */}
              <div className="mb-4">
                <label
                  className="block text-sm mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Number of cards
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNumCards((n) => Math.max(1, n - 1))}
                    className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] hover:text-cyan-500"
                  >
                    −
                  </button>
                  <span
                    className="w-12 text-center text-xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {numCards}
                  </span>
                  <button
                    onClick={() => setNumCards((n) => Math.min(10, n + 1))}
                    className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] hover:text-cyan-500"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Manual Prompt Input */}
              {promptSource === "manual" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Enter prompts (one per line)
                  </label>
                  <textarea
                    value={manualPrompts}
                    onChange={(e) => setManualPrompts(e.target.value)}
                    placeholder={`What's something you've learned recently?\nIf you could travel anywhere, where would you go?\nWhat makes a good friend?`}
                    className="w-full h-40 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none font-mono text-sm"
                  />
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    If you enter fewer prompts than cards, they will cycle.
                  </p>
                </motion.div>
              )}

              {/* AI Prompt Generation */}
              {promptSource === "ai" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* CEFR Level */}
                  <div>
                    <label
                      className="block text-sm mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Student level
                    </label>
                    <div className="flex gap-2">
                      {(["A1", "A2", "B1", "B2", "C1"] as CEFRLevel[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => setCefrLevel(level)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            cefrLevel === level
                              ? "bg-cyan-500 text-white"
                              : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI Guidance */}
                  <div>
                    <label
                      className="block text-sm mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Optional guidance for the AI
                    </label>
                    <textarea
                      value={aiGuidance}
                      onChange={(e) => setAiGuidance(e.target.value)}
                      placeholder="e.g., Everyday opinions, Work and study, Suitable for shy students..."
                      className="w-full h-20 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generateCards}
                    disabled={generating}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {generating ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Generate cards
                      </>
                    )}
                  </button>

                  {/* Generated Cards */}
                  {generatedCards.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3 mt-4"
                    >
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Edit cards as needed:
                      </p>
                      
                      {generatedCards.map((card, index) => (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="glass-card p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center flex-shrink-0 text-sm font-bold"
                            >
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <textarea
                                value={card.prompt}
                                onChange={(e) =>
                                  updateCardPrompt(card.id, e.target.value)
                                }
                                className="w-full p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none text-sm"
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => regenerateCard(card.id)}
                                disabled={regeneratingId === card.id}
                                className="p-2 rounded-lg hover:bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-cyan-500 transition-all"
                                title="Regenerate this card"
                              >
                                <RefreshCw
                                  size={16}
                                  className={
                                    regeneratingId === card.id
                                      ? "animate-spin"
                                      : ""
                                  }
                                />
                              </button>
                              <button
                                onClick={() => deleteCard(card.id)}
                                className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500 transition-all"
                                title="Delete this card"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {/* Add Card Button */}
                      <button
                        onClick={addCard}
                        className="w-full p-3 rounded-xl border-2 border-dashed border-[var(--glass-border)] text-[var(--text-muted)] hover:text-cyan-500 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={18} />
                        Add card
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </section>

            {/* Settings */}
            <section className="glass-card p-6">
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Settings
              </h2>

              <div className="space-y-4">
                {/* Timer Toggle */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={timerEnabled}
                      onChange={(e) => setTimerEnabled(e.target.checked)}
                      className="w-5 h-5 rounded accent-cyan-500"
                    />
                    <span style={{ color: "var(--text-primary)" }}>
                      Show timer per card
                    </span>
                  </label>

                  {timerEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="ml-8"
                    >
                      <label
                        className="block text-sm mb-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Minutes per card
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setTimerMinutes((t) => Math.max(0.5, t - 0.5))
                          }
                          className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] hover:text-cyan-500"
                        >
                          −
                        </button>
                        <span
                          className="w-12 text-center text-xl font-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {timerMinutes}
                        </span>
                        <button
                          onClick={() =>
                            setTimerMinutes((t) => Math.min(5, t + 0.5))
                          }
                          className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] hover:text-cyan-500"
                        >
                          +
                        </button>
                        <Clock size={18} className="text-[var(--text-muted)] ml-2" />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Feedback Toggle */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFeedback}
                      onChange={(e) => setShowFeedback(e.target.checked)}
                      className="w-5 h-5 rounded accent-cyan-500"
                    />
                    <span style={{ color: "var(--text-primary)" }}>
                      Include feedback screen between cards
                    </span>
                  </label>
                </div>
              </div>
            </section>

            {/* Start Button */}
            <div className="flex justify-center">
              <button
                onClick={handleStart}
                disabled={!canStart}
                className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all ${
                  canStart
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-105 shadow-lg shadow-cyan-500/25"
                    : "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50"
                }`}
              >
                <Play size={24} />
                Start Speaking Cards
              </button>
            </div>
          </div>
        </main>
      </div>
    </BackgroundPaths>
  );
}

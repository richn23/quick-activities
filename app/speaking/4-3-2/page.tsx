"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Sparkles,
  RefreshCw,
  Check,
  Edit3,
  Play,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { SkyToggle } from "@/components/ui/sky-toggle";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";
type PromptSource = "manual" | "ai";
type InteractionMode = "pairs" | "groups";

interface SessionData {
  prompt: string;
  rounds: number[];
  interactionMode: InteractionMode;
  showFeedback: boolean;
}

export default function FourThreeTwoSetup() {
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
  const [manualPrompt, setManualPrompt] = useState("");
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
  const [aiGuidance, setAiGuidance] = useState("");
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Shared settings
  const [numRounds, setNumRounds] = useState(3);
  const [roundMinutes, setRoundMinutes] = useState([4, 3, 2]);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("pairs");
  const [showFeedback, setShowFeedback] = useState(true);

  // Update round minutes when numRounds changes
  useEffect(() => {
    if (numRounds === 2) {
      setRoundMinutes([3, 2]);
    } else if (numRounds === 3) {
      setRoundMinutes([4, 3, 2]);
    } else if (numRounds === 4) {
      setRoundMinutes([4, 3, 2, 1]);
    }
  }, [numRounds]);

  // Generate prompts via AI
  const generatePrompts = async () => {
    setGenerating(true);
    setGeneratedPrompts([]);
    setSelectedPromptIndex(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-432-prompts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            cefr_level: cefrLevel,
            guidance: aiGuidance || undefined,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate prompts");

      const data = await response.json();
      setGeneratedPrompts(data.prompts || []);
    } catch (error) {
      console.error("Error generating prompts:", error);
      // Fallback prompts for testing
      setGeneratedPrompts([
        "Talk about a skill you would like to learn and why.",
        "Describe a memorable journey you have taken.",
        "Talk about how your daily routine has changed over the years.",
      ]);
    } finally {
      setGenerating(false);
    }
  };

  // Select a generated prompt
  const selectPrompt = (index: number) => {
    setSelectedPromptIndex(index);
    setEditedPrompt(generatedPrompts[index]);
    setIsEditing(false);
  };

  // Get final prompt
  const getFinalPrompt = (): string => {
    if (promptSource === "manual") {
      return manualPrompt.trim();
    }
    if (isEditing || selectedPromptIndex !== null) {
      return editedPrompt.trim();
    }
    return "";
  };

  // Check if ready to start
  const canStart = getFinalPrompt().length > 0;

  // Start activity
  const handleStart = () => {
    const sessionData: SessionData = {
      prompt: getFinalPrompt(),
      rounds: roundMinutes.slice(0, numRounds),
      interactionMode,
      showFeedback,
    };

    sessionStorage.setItem("fourThreeTwoData", JSON.stringify(sessionData));
    router.push("/speaking/4-3-2/present");
  };

  // Update individual round time
  const updateRoundTime = (index: number, value: number) => {
    const clamped = Math.max(1, Math.min(6, value));
    setRoundMinutes((prev) => {
      const updated = [...prev];
      updated[index] = clamped;
      return updated;
    });
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
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-violet-500 transition-all"
              >
                <Home size={20} />
              </Link>
              <div>
                <h1
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  4-3-2 Speaking
                </h1>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Build fluency through repetition
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
                Speaking Prompt
              </h2>

              {/* Radio Buttons */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="promptSource"
                    checked={promptSource === "manual"}
                    onChange={() => setPromptSource("manual")}
                    className="w-4 h-4 accent-violet-500"
                  />
                  <span style={{ color: "var(--text-primary)" }}>
                    Write my own prompt
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="promptSource"
                    checked={promptSource === "ai"}
                    onChange={() => setPromptSource("ai")}
                    className="w-4 h-4 accent-violet-500"
                  />
                  <span style={{ color: "var(--text-primary)" }}>
                    Generate with AI
                  </span>
                </label>
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
                    What should students talk about?
                  </label>
                  <textarea
                    value={manualPrompt}
                    onChange={(e) => setManualPrompt(e.target.value)}
                    placeholder="e.g., Talk about a time when you learned something new..."
                    className="w-full h-32 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                  />
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
                              ? "bg-violet-500 text-white"
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
                      placeholder="e.g., Daily routines, Past experiences, Exam-style topic..."
                      className="w-full h-20 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generatePrompts}
                    disabled={generating}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {generating ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Generate prompts
                      </>
                    )}
                  </button>

                  {/* Generated Prompts */}
                  {generatedPrompts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3 mt-4"
                    >
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Select a prompt:
                      </p>
                      {generatedPrompts.map((prompt, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => selectPrompt(index)}
                          className={`w-full p-4 rounded-xl text-left transition-all ${
                            selectedPromptIndex === index
                              ? "bg-violet-500/20 border-2 border-violet-500"
                              : "glass-card hover:bg-[var(--glass-bg)]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                selectedPromptIndex === index
                                  ? "bg-violet-500 text-white"
                                  : "bg-[var(--glass-bg)] text-[var(--text-muted)]"
                              }`}
                            >
                              {selectedPromptIndex === index ? (
                                <Check size={14} />
                              ) : (
                                <span className="text-xs">{index + 1}</span>
                              )}
                            </div>
                            <p style={{ color: "var(--text-primary)" }}>{prompt}</p>
                          </div>
                        </motion.button>
                      ))}

                      {/* Edit Selected Prompt */}
                      {selectedPromptIndex !== null && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="text-sm"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Edit if needed:
                            </span>
                            <button
                              onClick={() => setIsEditing(!isEditing)}
                              className="text-sm flex items-center gap-1 text-violet-500 hover:text-violet-400"
                            >
                              <Edit3 size={14} />
                              {isEditing ? "Done" : "Edit"}
                            </button>
                          </div>
                          {isEditing ? (
                            <textarea
                              value={editedPrompt}
                              onChange={(e) => setEditedPrompt(e.target.value)}
                              className="w-full h-24 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                            />
                          ) : (
                            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
                              <p style={{ color: "var(--text-primary)" }}>
                                {editedPrompt}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Regenerate */}
                      <button
                        onClick={generatePrompts}
                        disabled={generating}
                        className="text-sm text-violet-500 hover:text-violet-400 flex items-center gap-1"
                      >
                        <RefreshCw size={14} />
                        Regenerate prompts
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </section>

            {/* Activity Settings */}
            <section className="glass-card p-6">
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Settings
              </h2>

              <div className="space-y-6">
                {/* Number of Rounds */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Number of rounds
                  </label>
                  <div className="flex gap-2">
                    {[2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setNumRounds(num)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          numRounds === num
                            ? "bg-violet-500 text-white"
                            : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes per Round */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Minutes per round
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {roundMinutes.slice(0, numRounds).map((mins, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span
                          className="text-sm w-16"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Round {index + 1}:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateRoundTime(index, mins - 1)}
                            className="w-8 h-8 rounded-lg glass-card text-[var(--text-primary)] hover:text-violet-500"
                          >
                            −
                          </button>
                          <span
                            className="w-8 text-center font-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {mins}
                          </span>
                          <button
                            onClick={() => updateRoundTime(index, mins + 1)}
                            className="w-8 h-8 rounded-lg glass-card text-[var(--text-primary)] hover:text-violet-500"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interaction Mode */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Interaction mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setInteractionMode("pairs")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        interactionMode === "pairs"
                          ? "bg-violet-500 text-white"
                          : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <Users size={16} />
                      Pairs
                    </button>
                    <button
                      onClick={() => setInteractionMode("groups")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        interactionMode === "groups"
                          ? "bg-violet-500 text-white"
                          : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <UsersRound size={16} />
                      Small groups
                    </button>
                  </div>
                </div>

                {/* Feedback Screen Toggle */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFeedback}
                      onChange={(e) => setShowFeedback(e.target.checked)}
                      className="w-5 h-5 rounded accent-violet-500"
                    />
                    <span style={{ color: "var(--text-primary)" }}>
                      Include reflection screen at the end
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
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:scale-105 shadow-lg shadow-violet-500/25"
                    : "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50"
                }`}
              >
                <Play size={24} />
                Start 4-3-2
              </button>
            </div>
          </div>
        </main>
      </div>
    </BackgroundPaths>
  );
}

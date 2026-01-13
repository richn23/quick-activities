"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Sparkles,
  RefreshCw,
  Play,
  Edit3,
  Plus,
  Trash2,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { SkyToggle } from "@/components/ui/sky-toggle";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";
type PromptSource = "ai" | "manual";
type TimerMode = "countdown" | "countup";

interface PromptData {
  question: string;
  points: string[];
}

interface SessionData {
  prompt: PromptData;
  speakingMinutes: number;
  timerMode: TimerMode;
  showFeedback: boolean;
}

export default function TimedTalkSetup() {
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
  const [promptSource, setPromptSource] = useState<PromptSource>("ai");
  
  // Manual prompt
  const [manualQuestion, setManualQuestion] = useState("");
  const [manualPoints, setManualPoints] = useState<string[]>(["", "", "", ""]);
  
  // AI state
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
  const [aiGuidance, setAiGuidance] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState<PromptData | null>(null);
  const [editedQuestion, setEditedQuestion] = useState("");
  const [editedPoints, setEditedPoints] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Shared settings
  const [speakingMinutes, setSpeakingMinutes] = useState(2);
  const [timerMode, setTimerMode] = useState<TimerMode>("countdown");
  const [showFeedback, setShowFeedback] = useState(true);

  // Generate prompt via AI
  const generatePrompt = async () => {
    setGenerating(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-timed-talk`,
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

      if (!response.ok) throw new Error("Failed to generate prompt");

      const data = await response.json();
      
      // Parse the response - expecting { prompt: { question, points } }
      const prompt: PromptData = data.prompt || {
        question: "Talk about a memorable experience.",
        points: [
          "when it happened",
          "who was involved",
          "what made it memorable",
          "how you felt about it",
        ],
      };
      
      setGeneratedPrompt(prompt);
      setEditedQuestion(prompt.question);
      setEditedPoints([...prompt.points]);
      setIsEditing(false);
    } catch (error) {
      console.error("Error generating prompt:", error);
      // Fallback
      const fallback: PromptData = {
        question: "Talk about a place you enjoy spending time in.",
        points: [
          "where it is",
          "how often you go there",
          "what you do there",
          "why it is important to you",
        ],
      };
      setGeneratedPrompt(fallback);
      setEditedQuestion(fallback.question);
      setEditedPoints([...fallback.points]);
    } finally {
      setGenerating(false);
    }
  };

  // Manual points handlers
  const addManualPoint = () => {
    setManualPoints((prev) => [...prev, ""]);
  };

  const removeManualPoint = (index: number) => {
    setManualPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const updateManualPoint = (index: number, value: string) => {
    setManualPoints((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  // Edited points handlers
  const addEditedPoint = () => {
    setEditedPoints((prev) => [...prev, ""]);
  };

  const removeEditedPoint = (index: number) => {
    setEditedPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEditedPoint = (index: number, value: string) => {
    setEditedPoints((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  // Get final prompt
  const getFinalPrompt = (): PromptData | null => {
    if (promptSource === "manual") {
      const question = manualQuestion.trim();
      const points = manualPoints.filter((p) => p.trim().length > 0);
      if (question.length === 0) return null;
      return { question, points };
    }
    
    if (editedQuestion.trim().length === 0) return null;
    return {
      question: editedQuestion.trim(),
      points: editedPoints.filter((p) => p.trim().length > 0),
    };
  };

  // Check if ready to start
  const canStart = getFinalPrompt() !== null;

  // Start activity
  const handleStart = () => {
    const prompt = getFinalPrompt();
    if (!prompt) return;

    const sessionData: SessionData = {
      prompt,
      speakingMinutes,
      timerMode,
      showFeedback,
    };

    sessionStorage.setItem("timedTalkData", JSON.stringify(sessionData));
    router.push("/speaking/timed-talk/present");
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
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-rose-500 transition-all"
              >
                <Home size={20} />
              </Link>
              <div>
                <h1
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Timed Talk
                </h1>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Speak without stopping for a set time
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
                    checked={promptSource === "ai"}
                    onChange={() => setPromptSource("ai")}
                    className="w-4 h-4 accent-rose-500"
                  />
                  <span style={{ color: "var(--text-primary)" }}>
                    Generate with AI
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="promptSource"
                    checked={promptSource === "manual"}
                    onChange={() => setPromptSource("manual")}
                    className="w-4 h-4 accent-rose-500"
                  />
                  <span style={{ color: "var(--text-primary)" }}>
                    Write my own prompt
                  </span>
                </label>
              </div>

              {/* AI Generation */}
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
                              ? "bg-rose-500 text-white"
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
                      Optional guidance for the prompt
                    </label>
                    <textarea
                      value={aiGuidance}
                      onChange={(e) => setAiGuidance(e.target.value)}
                      placeholder="e.g., Everyday topics, Exam-style speaking, Work and study..."
                      className="w-full h-20 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generatePrompt}
                    disabled={generating}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {generating ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Generate timed talk
                      </>
                    )}
                  </button>

                  {/* Generated Prompt */}
                  {generatedPrompt && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Generated prompt:
                        </span>
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="text-sm flex items-center gap-1 text-rose-500 hover:text-rose-400"
                        >
                          <Edit3 size={14} />
                          {isEditing ? "Done" : "Edit"}
                        </button>
                      </div>

                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                        {isEditing ? (
                          <div className="space-y-4">
                            <div>
                              <label
                                className="block text-sm mb-1"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Main question
                              </label>
                              <textarea
                                value={editedQuestion}
                                onChange={(e) => setEditedQuestion(e.target.value)}
                                className="w-full p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label
                                className="block text-sm mb-2"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Prompt points
                              </label>
                              <div className="space-y-2">
                                {editedPoints.map((point, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <span className="text-rose-500">•</span>
                                    <input
                                      type="text"
                                      value={point}
                                      onChange={(e) =>
                                        updateEditedPoint(index, e.target.value)
                                      }
                                      className="flex-1 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                                    />
                                    <button
                                      onClick={() => removeEditedPoint(index)}
                                      className="p-1 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={addEditedPoint}
                                  className="text-sm text-rose-500 hover:text-rose-400 flex items-center gap-1"
                                >
                                  <Plus size={14} />
                                  Add point
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p
                              className="text-lg font-medium mb-3"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {editedQuestion}
                            </p>
                            {editedPoints.length > 0 && (
                              <>
                                <p
                                  className="text-sm mb-2"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  You should talk about:
                                </p>
                                <ul className="space-y-1">
                                  {editedPoints.map((point, index) => (
                                    <li
                                      key={index}
                                      className="text-sm"
                                      style={{ color: "var(--text-secondary)" }}
                                    >
                                      • {point}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        onClick={generatePrompt}
                        disabled={generating}
                        className="mt-3 text-sm text-rose-500 hover:text-rose-400 flex items-center gap-1"
                      >
                        <RefreshCw size={14} />
                        Regenerate
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Manual Input */}
              {promptSource === "manual" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label
                      className="block text-sm mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Main question
                    </label>
                    <textarea
                      value={manualQuestion}
                      onChange={(e) => setManualQuestion(e.target.value)}
                      placeholder="e.g., Talk about a hobby you enjoy."
                      className="w-full h-24 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Prompt points (optional)
                    </label>
                    <div className="space-y-2">
                      {manualPoints.map((point, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-rose-500">•</span>
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => updateManualPoint(index, e.target.value)}
                            placeholder={`Point ${index + 1}`}
                            className="flex-1 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                          />
                          {manualPoints.length > 1 && (
                            <button
                              onClick={() => removeManualPoint(index)}
                              className="p-1 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addManualPoint}
                        className="text-sm text-rose-500 hover:text-rose-400 flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Add point
                      </button>
                    </div>
                  </div>
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

              <div className="space-y-6">
                {/* Speaking Time */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Speaking time (minutes)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSpeakingMinutes((t) => Math.max(1, t - 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] hover:text-rose-500"
                    >
                      −
                    </button>
                    <span
                      className="w-12 text-center text-xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {speakingMinutes}
                    </span>
                    <button
                      onClick={() => setSpeakingMinutes((t) => Math.min(5, t + 1))}
                      className="w-10 h-10 rounded-lg glass-card text-[var(--text-primary)] hover:text-rose-500"
                    >
                      +
                    </button>
                    <Timer size={18} className="text-[var(--text-muted)] ml-2" />
                  </div>
                </div>

                {/* Timer Mode */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Timer mode
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="timerMode"
                        checked={timerMode === "countdown"}
                        onChange={() => setTimerMode("countdown")}
                        className="w-4 h-4 accent-rose-500"
                      />
                      <span style={{ color: "var(--text-primary)" }}>
                        Countdown (2:00 → 0:00)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="timerMode"
                        checked={timerMode === "countup"}
                        onChange={() => setTimerMode("countup")}
                        className="w-4 h-4 accent-rose-500"
                      />
                      <span style={{ color: "var(--text-primary)" }}>
                        Count up (0:00 → 2:00)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Feedback Toggle */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFeedback}
                      onChange={(e) => setShowFeedback(e.target.checked)}
                      className="w-5 h-5 rounded accent-rose-500"
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
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:scale-105 shadow-lg shadow-rose-500/25"
                    : "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50"
                }`}
              >
                <Play size={24} />
                Start Timed Talk
              </button>
            </div>
          </div>
        </main>
      </div>
    </BackgroundPaths>
  );
}

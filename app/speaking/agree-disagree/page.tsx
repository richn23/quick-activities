"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Sparkles,
  RefreshCw,
  Play,
  Edit3,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { SkyToggle } from "@/components/ui/sky-toggle";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";
type PromptSource = "ai" | "manual";
type ScaleType = "simple" | "extended";

interface SessionData {
  statement: string;
  scaleType: ScaleType;
  showFeedback: boolean;
}

export default function AgreeDisagreeSetup() {
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
  const [manualStatement, setManualStatement] = useState("");
  
  // AI state
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
  const [aiGuidance, setAiGuidance] = useState("");
  const [generatedStatement, setGeneratedStatement] = useState("");
  const [editedStatement, setEditedStatement] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Shared settings
  const [scaleType, setScaleType] = useState<ScaleType>("simple");
  const [showFeedback, setShowFeedback] = useState(true);

  // Generate statement via AI
  const generateStatement = async () => {
    setGenerating(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-agree-disagree`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            cefr_level: cefrLevel,
            guidance: aiGuidance || undefined,
            num_statements: 1,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate statement");

      const data = await response.json();
      const statement = data.statements?.[0] || "";
      
      setGeneratedStatement(statement);
      setEditedStatement(statement);
      setIsEditing(false);
    } catch (error) {
      console.error("Error generating statement:", error);
      // Fallback
      const fallback = "People learn languages better through experience than through grammar study.";
      setGeneratedStatement(fallback);
      setEditedStatement(fallback);
    } finally {
      setGenerating(false);
    }
  };

  // Get final statement
  const getFinalStatement = (): string => {
    if (promptSource === "manual") {
      return manualStatement.trim();
    }
    return editedStatement.trim();
  };

  // Check if ready to start
  const canStart = getFinalStatement().length > 0;

  // Start activity
  const handleStart = () => {
    const sessionData: SessionData = {
      statement: getFinalStatement(),
      scaleType,
      showFeedback,
    };

    sessionStorage.setItem("agreeDisagreeData", JSON.stringify(sessionData));
    router.push("/speaking/agree-disagree/present");
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
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-amber-500 transition-all"
              >
                <Home size={20} />
              </Link>
              <div>
                <h1
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Agree / Disagree
                </h1>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Take a stance and defend it
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
                Statement
              </h2>

              {/* Radio Buttons */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="promptSource"
                    checked={promptSource === "ai"}
                    onChange={() => setPromptSource("ai")}
                    className="w-4 h-4 accent-amber-500"
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
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span style={{ color: "var(--text-primary)" }}>
                    Write my own statement
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
                              ? "bg-amber-500 text-white"
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
                      Optional guidance for the statement
                    </label>
                    <textarea
                      value={aiGuidance}
                      onChange={(e) => setAiGuidance(e.target.value)}
                      placeholder="e.g., Education, Technology, Work and study, Not too controversial..."
                      className="w-full h-20 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generateStatement}
                    disabled={generating}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {generating ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Generate statement
                      </>
                    )}
                  </button>

                  {/* Generated Statement */}
                  {generatedStatement && (
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
                          Generated statement:
                        </span>
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="text-sm flex items-center gap-1 text-amber-500 hover:text-amber-400"
                        >
                          <Edit3 size={14} />
                          {isEditing ? "Done" : "Edit"}
                        </button>
                      </div>

                      {isEditing ? (
                        <textarea
                          value={editedStatement}
                          onChange={(e) => setEditedStatement(e.target.value)}
                          className="w-full h-24 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                        />
                      ) : (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <p
                            className="text-lg font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            &quot;{editedStatement}&quot;
                          </p>
                        </div>
                      )}

                      <button
                        onClick={generateStatement}
                        disabled={generating}
                        className="mt-3 text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1"
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
                >
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Write your statement
                  </label>
                  <textarea
                    value={manualStatement}
                    onChange={(e) => setManualStatement(e.target.value)}
                    placeholder="e.g., Everyone should learn to cook their own meals."
                    className="w-full h-32 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
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
                {/* Opinion Scale */}
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Opinion scale
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scaleType"
                        checked={scaleType === "simple"}
                        onChange={() => setScaleType("simple")}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span style={{ color: "var(--text-primary)" }}>
                        Agree / Disagree
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scaleType"
                        checked={scaleType === "extended"}
                        onChange={() => setScaleType("extended")}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span style={{ color: "var(--text-primary)" }}>
                        Strongly agree / Agree / Disagree / Strongly disagree
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
                      className="w-5 h-5 rounded accent-amber-500"
                    />
                    <span style={{ color: "var(--text-primary)" }}>
                      Include reflection screen after discussion
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
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-105 shadow-lg shadow-amber-500/25"
                    : "glass-card text-[var(--text-muted)] cursor-not-allowed opacity-50"
                }`}
              >
                <Play size={24} />
                Start Agree / Disagree
              </button>
            </div>
          </div>
        </main>
      </div>
    </BackgroundPaths>
  );
}

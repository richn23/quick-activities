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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { SkyToggle } from "@/components/ui/sky-toggle";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";
type PromptSource = "ai" | "manual";
type ScaleType = "simple" | "extended";

interface SessionData {
  statements: string[];
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
  const [numStatements, setNumStatements] = useState(1);
  
  // AI state
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
  const [aiGuidance, setAiGuidance] = useState("");
  const [generatedStatements, setGeneratedStatements] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // Manual state
  const [manualStatements, setManualStatements] = useState<string[]>([""]);

  // Shared settings
  const [scaleType, setScaleType] = useState<ScaleType>("simple");
  const [showFeedback, setShowFeedback] = useState(true);

  // Generate statements via AI
  const generateStatements = async () => {
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
            num_statements: numStatements,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate statements");

      const data = await response.json();
      const statements = data.statements || [];
      
      setGeneratedStatements(statements);
    } catch (error) {
      console.error("Error generating statements:", error);
      // Fallback
      const fallbacks = [
        "People learn languages better through experience than through grammar study.",
        "Social media has improved the way we communicate with each other.",
        "Everyone should learn to cook their own meals.",
        "Working from home is better than working in an office.",
        "Schools should teach financial literacy from a young age.",
      ];
      setGeneratedStatements(fallbacks.slice(0, numStatements));
    } finally {
      setGenerating(false);
    }
  };

  // Regenerate single statement
  const regenerateSingle = async (index: number) => {
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

      if (!response.ok) throw new Error("Failed to regenerate");

      const data = await response.json();
      const newStatement = data.statements?.[0];
      
      if (newStatement) {
        const updated = [...generatedStatements];
        updated[index] = newStatement;
        setGeneratedStatements(updated);
      }
    } catch (error) {
      console.error("Error regenerating statement:", error);
    }
  };

  // Update generated statement
  const updateGeneratedStatement = (index: number, value: string) => {
    const updated = [...generatedStatements];
    updated[index] = value;
    setGeneratedStatements(updated);
  };

  // Manual statement management
  const addManualStatement = () => {
    setManualStatements([...manualStatements, ""]);
  };

  const removeManualStatement = (index: number) => {
    if (manualStatements.length > 1) {
      const updated = manualStatements.filter((_, i) => i !== index);
      setManualStatements(updated);
    }
  };

  const updateManualStatement = (index: number, value: string) => {
    const updated = [...manualStatements];
    updated[index] = value;
    setManualStatements(updated);
  };

  // Get final statements
  const getFinalStatements = (): string[] => {
    if (promptSource === "manual") {
      return manualStatements.filter((s) => s.trim().length > 0);
    }
    return generatedStatements.filter((s) => s.trim().length > 0);
  };

  // Check if ready to start
  const canStart = getFinalStatements().length > 0;

  // Start activity
  const handleStart = () => {
    const sessionData: SessionData = {
      statements: getFinalStatements(),
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
                Statements
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
                    Write my own
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
                  {/* Number of Statements */}
                  <div>
                    <label
                      className="block text-sm mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Number of statements
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setNumStatements(num)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            numStatements === num
                              ? "bg-amber-500 text-white"
                              : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

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
                      Optional topic guidance
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
                    onClick={generateStatements}
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
                        Generate {numStatements === 1 ? "statement" : "statements"}
                      </>
                    )}
                  </button>

                  {/* Generated Statements */}
                  {generatedStatements.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 space-y-3"
                    >
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Generated statements (edit as needed):
                      </p>

                      {generatedStatements.map((statement, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="w-6 h-6 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-1"
                            >
                              {index + 1}
                            </span>
                            <textarea
                              value={statement}
                              onChange={(e) => updateGeneratedStatement(index, e.target.value)}
                              className="flex-1 bg-transparent text-[var(--text-primary)] focus:outline-none resize-none min-h-[60px]"
                            />
                            <button
                              onClick={() => regenerateSingle(index)}
                              className="p-2 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                              title="Regenerate this statement"
                            >
                              <RefreshCw size={16} />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={generateStatements}
                        disabled={generating}
                        className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1"
                      >
                        <RefreshCw size={14} />
                        Regenerate all
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
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Add one or more statements for discussion:
                  </p>

                  {manualStatements.map((statement, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span
                        className="w-6 h-6 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-3"
                      >
                        {index + 1}
                      </span>
                      <textarea
                        value={statement}
                        onChange={(e) => updateManualStatement(index, e.target.value)}
                        placeholder={`Statement ${index + 1}...`}
                        className="flex-1 h-20 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                      />
                      {manualStatements.length > 1 && (
                        <button
                          onClick={() => removeManualStatement(index)}
                          className="p-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-all mt-1"
                          title="Remove statement"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={addManualStatement}
                    className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add another statement
                  </button>
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
                      Include reflection after each statement
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
                {getFinalStatements().length > 1 && (
                  <span className="text-sm opacity-80">
                    ({getFinalStatements().length} statements)
                  </span>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </BackgroundPaths>
  );
}

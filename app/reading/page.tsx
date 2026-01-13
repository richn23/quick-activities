"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  FileText,
  Sparkles,
  ImageIcon,
  Upload,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Check,
  Edit3,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { SkyToggle } from "@/components/ui/sky-toggle";

type InputMethod = "paste" | "generate" | "image" | null;
type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";
type TextLength = "short" | "medium" | "long";
type TextType = "article" | "story" | "dialogue" | "email" | "blog" | "news";

interface TextAnalysis {
  topic: string;
  wordCount: number;
  cefrLevel: string;
}

export default function ReadingSetup() {
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

  // Input method state
  const [inputMethod, setInputMethod] = useState<InputMethod>(null);
  
  // Paste/Upload state
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Generate state
  const [genTopic, setGenTopic] = useState("");
  const [genCefr, setGenCefr] = useState<CEFRLevel>("B1");
  const [genLength, setGenLength] = useState<TextLength>("medium");
  const [genType, setGenType] = useState<TextType>("article");
  const [generating, setGenerating] = useState(false);
  
  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Final text state
  const [finalText, setFinalText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  
  // Analysis state
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null);
  const [analysing, setAnalysing] = useState(false);

  // Select input method
  const selectMethod = (method: InputMethod) => {
    setInputMethod(method);
    // Reset states when switching
    setFinalText("");
    setAnalysis(null);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    
    if (extension === "txt") {
      const text = await file.text();
      setPastedText(text);
    } else if (extension === "docx" || extension === "pdf") {
      // For now, show message - would need server-side processing
      alert(`${extension.toUpperCase()} parsing coming soon. Please paste text directly for now.`);
    }
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Analyse text
  const analyseText = async (text: string) => {
    setAnalysing(true);
    setFinalText(text);
    setEditedText(text);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyse-reading-text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json();
      setAnalysis({
        topic: data.topic || "General",
        wordCount: data.word_count || text.split(/\s+/).filter(w => w).length,
        cefrLevel: data.cefr_level || "B1",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      // Fallback to basic analysis
      const wordCount = text.split(/\s+/).filter(w => w).length;
      setAnalysis({
        topic: "Unable to determine",
        wordCount,
        cefrLevel: "B1",
      });
    } finally {
      setAnalysing(false);
    }
  };

  // Generate text
  const generateText = async () => {
    if (!genTopic.trim()) return;
    
    setGenerating(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-reading-text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            topic: genTopic,
            cefr_level: genCefr,
            length: genLength,
            text_type: genType,
          }),
        }
      );

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();
      const text = data.text || "";
      
      await analyseText(text);
    } catch (error) {
      console.error("Generation error:", error);
      // Fallback text for testing
      const fallbackText = `This is a sample text about ${genTopic}. It would normally be generated by AI based on your settings. The text would be approximately ${genLength === "short" ? "150" : genLength === "medium" ? "300" : "500"} words and written at a ${genCefr} level.`;
      await analyseText(fallbackText);
    } finally {
      setGenerating(false);
    }
  };

  // Extract text from image
  const extractFromImage = async () => {
    if (!imageFile) return;
    
    setExtracting(true);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // Remove data URL prefix
        };
        reader.readAsDataURL(imageFile);
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extract-text-from-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            image_base64: base64,
            media_type: imageFile.type,
          }),
        }
      );

      if (!response.ok) throw new Error("Extraction failed");

      const data = await response.json();
      const text = data.text || "";
      
      await analyseText(text);
    } catch (error) {
      console.error("Extraction error:", error);
      alert("Failed to extract text from image. Please try again or paste the text directly.");
    } finally {
      setExtracting(false);
    }
  };

  // Save edited text
  const saveEdit = () => {
    setFinalText(editedText);
    setIsEditing(false);
    // Re-analyse with new text
    const wordCount = editedText.split(/\s+/).filter(w => w).length;
    if (analysis) {
      setAnalysis({ ...analysis, wordCount });
    }
  };

  // Continue to activities
  const handleContinue = () => {
    const textToSave = isEditing ? editedText : finalText;
    sessionStorage.setItem("readingText", textToSave);
    sessionStorage.setItem("readingAnalysis", JSON.stringify(analysis));
    router.push("/reading/activities");
  };

  // Check if ready to continue
  const canContinue = finalText.length > 0 && analysis !== null && !analysing;

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
                href="/"
                className="p-3 rounded-xl glass-card text-[var(--text-primary)] hover:text-emerald-500 transition-all"
              >
                <Home size={20} />
              </Link>
              <div>
                <h1
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Reading Skills
                </h1>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Step 1: Add your text
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 pb-8">
          <div className="max-w-3xl mx-auto space-y-4">
            
            {/* Input Method Tiles - Show when no final text */}
            {!finalText && (
              <>
                {/* Paste/Upload Tile */}
                <motion.div
                  layout
                  className="glass-card overflow-hidden"
                >
                  <button
                    onClick={() => selectMethod(inputMethod === "paste" ? null : "paste")}
                    className="w-full p-6 text-left flex items-center gap-4 hover:bg-[var(--glass-bg)] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                        Paste or Upload Text
                      </h3>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Paste text directly or upload a file (.txt)
                      </p>
                    </div>
                    <ChevronRight
                      size={20}
                      className={`text-[var(--text-muted)] transition-transform ${
                        inputMethod === "paste" ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {inputMethod === "paste" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[var(--glass-border)]"
                      >
                        <div className="p-6 space-y-4">
                          <textarea
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="Paste your reading text here..."
                            className="w-full h-48 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                          />
                          
                          <div className="flex items-center gap-4">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              accept=".txt"
                              className="hidden"
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 rounded-lg glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-all"
                            >
                              <Upload size={16} />
                              Upload file
                            </button>
                            
                            <div className="flex-1" />
                            
                            <button
                              onClick={() => analyseText(pastedText)}
                              disabled={!pastedText.trim() || analysing}
                              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                                pastedText.trim()
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:scale-105"
                                  : "glass-card text-[var(--text-muted)] cursor-not-allowed"
                              }`}
                            >
                              {analysing ? (
                                <>
                                  <RefreshCw size={18} className="animate-spin" />
                                  Analysing...
                                </>
                              ) : (
                                <>
                                  <Check size={18} />
                                  Analyse Text
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Generate Tile */}
                <motion.div
                  layout
                  className="glass-card overflow-hidden"
                >
                  <button
                    onClick={() => selectMethod(inputMethod === "generate" ? null : "generate")}
                    className="w-full p-6 text-left flex items-center gap-4 hover:bg-[var(--glass-bg)] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
                      <Sparkles size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                        Generate Text with AI
                      </h3>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Create a reading text on any topic
                      </p>
                    </div>
                    <ChevronRight
                      size={20}
                      className={`text-[var(--text-muted)] transition-transform ${
                        inputMethod === "generate" ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {inputMethod === "generate" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[var(--glass-border)]"
                      >
                        <div className="p-6 space-y-4">
                          {/* Topic */}
                          <div>
                            <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                              Topic *
                            </label>
                            <input
                              type="text"
                              value={genTopic}
                              onChange={(e) => setGenTopic(e.target.value)}
                              placeholder="e.g., public transport, healthy eating, online shopping"
                              className="w-full p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                            />
                          </div>

                          {/* CEFR Level */}
                          <div>
                            <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                              CEFR Level
                            </label>
                            <div className="flex gap-2">
                              {(["A1", "A2", "B1", "B2", "C1"] as CEFRLevel[]).map((level) => (
                                <button
                                  key={level}
                                  onClick={() => setGenCefr(level)}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    genCefr === level
                                      ? "bg-violet-500 text-white"
                                      : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Length */}
                          <div>
                            <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                              Length
                            </label>
                            <div className="flex gap-2">
                              {([
                                { value: "short", label: "Short (~150 words)" },
                                { value: "medium", label: "Medium (~300 words)" },
                                { value: "long", label: "Long (~500 words)" },
                              ] as { value: TextLength; label: string }[]).map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => setGenLength(opt.value)}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    genLength === opt.value
                                      ? "bg-violet-500 text-white"
                                      : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Text Type */}
                          <div>
                            <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                              Text Type
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {([
                                { value: "article", label: "Article" },
                                { value: "story", label: "Story" },
                                { value: "dialogue", label: "Dialogue" },
                                { value: "email", label: "Email" },
                                { value: "blog", label: "Blog post" },
                                { value: "news", label: "News report" },
                              ] as { value: TextType; label: string }[]).map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => setGenType(opt.value)}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    genType === opt.value
                                      ? "bg-violet-500 text-white"
                                      : "glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Generate Button */}
                          <div className="flex justify-end">
                            <button
                              onClick={generateText}
                              disabled={!genTopic.trim() || generating}
                              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                                genTopic.trim()
                                  ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:scale-105"
                                  : "glass-card text-[var(--text-muted)] cursor-not-allowed"
                              }`}
                            >
                              {generating ? (
                                <>
                                  <RefreshCw size={18} className="animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={18} />
                                  Generate Text
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Image Upload Tile */}
                <motion.div
                  layout
                  className="glass-card overflow-hidden"
                >
                  <button
                    onClick={() => selectMethod(inputMethod === "image" ? null : "image")}
                    className="w-full p-6 text-left flex items-center gap-4 hover:bg-[var(--glass-bg)] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
                      <ImageIcon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                        Upload Image
                      </h3>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Photo of textbook page or handout
                      </p>
                    </div>
                    <ChevronRight
                      size={20}
                      className={`text-[var(--text-muted)] transition-transform ${
                        inputMethod === "image" ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {inputMethod === "image" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[var(--glass-border)]"
                      >
                        <div className="p-6 space-y-4">
                          <input
                            type="file"
                            ref={imageInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          
                          {!imagePreview ? (
                            <button
                              onClick={() => imageInputRef.current?.click()}
                              className="w-full h-48 rounded-xl border-2 border-dashed border-[var(--glass-border)] hover:border-amber-500/50 flex flex-col items-center justify-center gap-3 transition-all"
                            >
                              <ImageIcon size={40} className="text-[var(--text-muted)]" />
                              <p style={{ color: "var(--text-secondary)" }}>
                                Click to upload or drag and drop
                              </p>
                              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                PNG, JPG, WEBP up to 10MB
                              </p>
                            </button>
                          ) : (
                            <div className="space-y-4">
                              <div className="relative">
                                <img
                                  src={imagePreview}
                                  alt="Preview"
                                  className="w-full max-h-64 object-contain rounded-xl"
                                />
                                <button
                                  onClick={() => {
                                    setImageFile(null);
                                    setImagePreview(null);
                                  }}
                                  className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-all"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              
                              <div className="flex justify-end">
                                <button
                                  onClick={extractFromImage}
                                  disabled={extracting}
                                  className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-2 hover:scale-105 transition-all"
                                >
                                  {extracting ? (
                                    <>
                                      <RefreshCw size={18} className="animate-spin" />
                                      Extracting...
                                    </>
                                  ) : (
                                    <>
                                      <FileText size={18} />
                                      Extract Text
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </>
            )}

            {/* Analysis Results Card */}
            {finalText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check size={16} className="text-emerald-500" />
                    </div>
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                      Text loaded
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setFinalText("");
                      setAnalysis(null);
                      setPastedText("");
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
                  >
                    <X size={14} />
                    Start over
                  </button>
                </div>

                {/* Text Display/Edit */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Reading text
                    </span>
                    <button
                      onClick={() => {
                        if (isEditing) {
                          saveEdit();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                      className="text-sm flex items-center gap-1 text-emerald-500 hover:text-emerald-400"
                    >
                      <Edit3 size={14} />
                      {isEditing ? "Save" : "Edit"}
                    </button>
                  </div>
                  
                  {isEditing ? (
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full h-48 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    />
                  ) : (
                    <div className="h-48 overflow-y-auto p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <p className="whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                        {finalText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Analysis Stats */}
                {analysis && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-center">
                      <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                        Topic
                      </p>
                      <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                        {analysis.topic}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-center">
                      <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                        Word Count
                      </p>
                      <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                        {analysis.wordCount}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-center">
                      <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                        CEFR Level
                      </p>
                      <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                        {analysis.cefrLevel}
                      </p>
                    </div>
                  </div>
                )}

                {/* Warning for short text */}
                {analysis && analysis.wordCount < 50 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Text is quite short — some activities may be limited
                    </p>
                  </div>
                )}

                {/* Continue Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleContinue}
                    disabled={!canContinue}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-2 transition-all ${
                      canContinue
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:scale-105 shadow-lg shadow-emerald-500/25"
                        : "glass-card text-[var(--text-muted)] cursor-not-allowed"
                    }`}
                  >
                    Continue to Activities
                    <ChevronRight size={24} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </BackgroundPaths>
  );
}

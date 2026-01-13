// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface AnalyseTextRequest {
  text: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: "text"; text: string }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: Record<string, unknown>;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: COMMON_HEADERS,
    ...init,
  });
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

function buildPrompt(text: string): string {
  return `Analyse this reading text and provide:

1. **Topic**: A short phrase (2-5 words) describing what the text is about
2. **CEFR Level**: Estimate the reading level (A1, A2, B1, B2, C1, or C2)

Consider these factors for CEFR level:
- A1: Very simple sentences, basic vocabulary, familiar topics
- A2: Simple sentences, everyday vocabulary, concrete topics
- B1: Moderately complex sentences, some abstract ideas, clear structure
- B2: Complex sentences, varied vocabulary, abstract topics, implicit meaning
- C1: Sophisticated language, nuanced meaning, professional/academic register
- C2: Very complex, literary or highly specialised language

TEXT TO ANALYSE:
"""
${text}
"""

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "topic": "Short topic phrase",
  "cefr_level": "B1"
}`;
}

async function callAnthropic(prompt: string) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const message = data.content.find((item) => item.type === "text");
  if (!message) {
    throw new Error("Anthropic response did not include text content.");
  }

  const trimmed = message.text.trim();

  let jsonText = trimmed;
  const jsonMatch = trimmed.match(/```json([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  const jsonObjectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch && jsonObjectMatch) {
    jsonText = jsonObjectMatch[0];
  }

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Failed to parse JSON:", { jsonText, error });
    throw new Error("Unable to parse AI response as JSON.");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, { status: 200 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const body = (await req.json()) as AnalyseTextRequest;
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return jsonResponse({ error: "Text is required" }, { status: 400 });
    }

    const wordCount = countWords(text);

    // For very short texts, skip AI and return basic analysis
    if (wordCount < 10) {
      return jsonResponse({
        topic: "Too short to determine",
        word_count: wordCount,
        cefr_level: "A1",
      });
    }

    if (!ANTHROPIC_API_KEY) {
      // Fallback without AI
      return jsonResponse({
        topic: "General",
        word_count: wordCount,
        cefr_level: "B1",
      });
    }

    const prompt = buildPrompt(text);
    const result = await callAnthropic(prompt);

    return jsonResponse({
      topic: result.topic || "General",
      word_count: wordCount,
      cefr_level: result.cefr_level || "B1",
    });
  } catch (error) {
    console.error("analyse-reading-text error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

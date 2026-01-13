// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateSpeakingCardsRequest {
  cefr_level?: string;
  guidance?: string;
  num_cards?: number;
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

function buildPrompt(cefrLevel: string, numCards: number, guidance?: string): string {
  const guidanceText = guidance ? `\n\nTeacher's topic guidance: "${guidance}"` : "";

  return `You are generating discussion questions for a "Speaking Cards" activity.

HOW IT WORKS:
- One question shown at a time
- Students discuss in pairs or small groups
- No right or wrong answers
- Questions spark conversation, not debate

TASK: Generate exactly ${numCards} discussion questions.

QUESTION TYPES TO MIX:
- Opinions: "What do you think about...?" "Do you prefer...?"
- Experiences: "Have you ever...?" "What was the last time you...?"
- Likes/Dislikes: "What kind of... do you enjoy?" "Is there anything you dislike about...?"
- Hypotheticals: "If you could..., what would you...?"
- Preferences: "Would you rather...?" "What's your favourite...?"

CEFR Level: ${cefrLevel}
- A1: Very simple questions (What's your name? What's your favourite colour?)
- A2: Simple questions about daily life, preferences, routines
- B1: Questions about experiences, opinions, comparisons
- B2: More abstract questions, hypotheticals, explaining reasons
- C1: Nuanced questions requiring elaboration and justification
${guidanceText}

GOOD EXAMPLES:
- "What's something you've recently changed your mind about?"
- "If you could learn any skill instantly, what would it be?"
- "What's the best piece of advice anyone has given you?"
- "Do you prefer spending time alone or with others? Why?"
- "What's something most people enjoy that you don't understand the appeal of?"
- "Have you ever had a memorable encounter with a stranger?"

BAD EXAMPLES:
- "Do you agree that climate change is a problem?" (debate framing)
- "What is the capital of France?" (factual, not discussion)
- "Tell me about yourself." (too vague, not a question)
- "Social media: good or bad?" (binary debate)

KEY REQUIREMENTS:
- Each question is standalone (no bullet points or sub-questions)
- Questions invite extended responses, not yes/no
- Variety of question types across the set
- Classroom-safe and inclusive
- Questions anyone can answer (not too niche)

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "prompts": [
    "First question?",
    "Second question?",
    "Third question?"
  ]
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
      max_tokens: 800,
      temperature: 0.85,
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
    const body = (await req.json()) as GenerateSpeakingCardsRequest;
    const { cefr_level = "B1", guidance, num_cards = 5 } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(cefr_level, num_cards, guidance);
    const result = await callAnthropic(prompt);

    return jsonResponse({ prompts: result.prompts || [] });
  } catch (error) {
    console.error("generate-speaking-cards error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface Generate432Request {
  cefr_level?: string;
  guidance?: string;
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

function buildPrompt(cefrLevel: string, guidance?: string): string {
  const guidanceText = guidance ? `\n\nTeacher's topic guidance: "${guidance}"` : "";

  return `You are generating speaking prompts for a "4-3-2 Speaking" fluency activity.

HOW 4-3-2 WORKS:
Students speak about the SAME topic 3 times:
- Round 1: 4 minutes
- Round 2: 3 minutes (new partner)
- Round 3: 2 minutes (new partner)

The goal is FLUENCY through repetition — each round they refine and compress their ideas.

TASK: Generate exactly 3 different speaking prompts.

PROMPT STYLE:
- Longer, flowing prompts (2-3 sentences)
- NOT bullet-point based
- Should invite storytelling, reflection, or extended explanation
- Rich enough to sustain 4 minutes of speaking
- Personal enough that students have something to say

CEFR Level: ${cefrLevel}
- A1: Very simple, concrete topics (favourite things, daily routine, family)
- A2: Concrete, familiar topics (routines, preferences, simple past experiences)
- B1: Personal experiences, opinions, comparisons
- B2: Abstract ideas, hypotheticals, explaining perspectives
- C1: Complex reasoning, nuanced opinions, professional themes
${guidanceText}

GOOD EXAMPLES:
- "Think about a time when you had to make a difficult decision. What was the situation, what options did you have, and how did you eventually decide? Looking back, do you think you made the right choice?"
- "Describe someone who has had a significant influence on your life. How did you meet this person, what have they taught you, and in what ways have they shaped who you are today?"
- "Talk about a place that holds special memories for you. What is this place, what experiences have you had there, and why does it remain important to you?"

BAD EXAMPLES:
- "Talk about food." (too vague, won't sustain 4 minutes)
- "Describe a book. Say what it was about and if you liked it." (too short, bullet-point style)
- "Debate the pros and cons of social media." (debate format, not personal narrative)

KEY REQUIREMENTS:
- Each prompt should be 2-3 sentences
- Prompts should invite personal stories or reflections
- Avoid yes/no framings
- Avoid debate/argument framings
- Classroom-safe and inclusive

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "prompts": [
    "First full prompt here...",
    "Second full prompt here...",
    "Third full prompt here..."
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
      temperature: 0.8,
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
    const body = (await req.json()) as Generate432Request;
    const { cefr_level = "B1", guidance } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(cefr_level, guidance);
    const result = await callAnthropic(prompt);

    return jsonResponse({ prompts: result.prompts || [] });
  } catch (error) {
    console.error("generate-432-prompts error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

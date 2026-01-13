// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateTimedTalkRequest {
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

  return `You are generating an IELTS Speaking Part 2 style prompt for a language classroom.

TASK: Create ONE "Timed Talk" task card.

FORMAT:
- A main instruction starting with "Describe..." or "Talk about..."
- Exactly 4 bullet points that guide the student toward SPECIFIC DETAILS
- Each bullet point should prompt concrete, personal information

CEFR Level: ${cefrLevel}
- A1: Very simple topics (my family, my room, my favourite food)
- A2: Familiar, concrete topics (daily life, hobbies, family, home)
- B1: Personal experiences, preferences, simple opinions
- B2: More abstract topics, hypotheticals, explaining reasons
- C1: Complex topics, nuanced opinions, professional/academic themes
${guidanceText}

GOOD EXAMPLE:
{
  "prompt": {
    "question": "Describe a book you have read recently.",
    "points": [
      "what the book was called and who wrote it",
      "what the book was about",
      "why you decided to read it",
      "whether you would recommend it to others"
    ]
  }
}

ANOTHER GOOD EXAMPLE:
{
  "prompt": {
    "question": "Talk about a skill you would like to learn.",
    "points": [
      "what the skill is",
      "how you would learn it",
      "why you want to learn this skill",
      "how useful it would be in your life"
    ]
  }
}

KEY REQUIREMENTS:
- Bullet points ask for SPECIFIC details, not vague ideas
- Each bullet naturally leads to 20-30 seconds of speaking
- The topic should allow anyone to respond (not too niche)
- Classroom-safe and culturally neutral

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "prompt": {
    "question": "Describe/Talk about...",
    "points": ["point 1", "point 2", "point 3", "point 4"]
  }
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
      max_tokens: 500,
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
    const body = (await req.json()) as GenerateTimedTalkRequest;
    const { cefr_level = "B1", guidance } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(cefr_level, guidance);
    const result = await callAnthropic(prompt);

    return jsonResponse({ prompt: result.prompt });
  } catch (error) {
    console.error("generate-timed-talk error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateAgreeDisagreeRequest {
  cefr_level?: string;
  guidance?: string;
  num_statements?: number;
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

function buildPrompt(cefrLevel: string, numStatements: number, guidance?: string): string {
  const guidanceText = guidance ? `\n\nTeacher's topic guidance: "${guidance}"` : "";
  const plural = numStatements > 1;

  return `You are generating ${plural ? `${numStatements} statements` : "a statement"} for an "Agree/Disagree" speaking activity.

HOW IT WORKS:
- Students see a statement
- They decide if they agree or disagree
- Teacher tallies opinions visibly
- Students with DIFFERENT opinions pair up to discuss
- Goal: understand the other perspective, not "win"

TASK: Generate exactly ${numStatements} debatable statement${plural ? "s" : ""}.

STATEMENT STYLE:
Each statement must present a CONTRAST between two options or perspectives:
- "X is better than Y"
- "X is more important than Y"
- "People should X rather than Y"
- "X matters more than Y"

This contrast is essential — it creates two clear "sides" for discussion.

CEFR Level: ${cefrLevel}
- A1: Very simple preferences (I like X more than Y)
- A2: Simple preferences, everyday choices
- B1: Opinions about lifestyle, habits, common experiences
- B2: More abstract comparisons, societal observations
- C1: Nuanced trade-offs, complex value judgments
${guidanceText}

GOOD EXAMPLES (note the contrast):
- "Learning from mistakes is more valuable than learning from success."
- "It's better to have a few close friends than many casual acquaintances."
- "Experience is more important than qualifications when hiring someone."
- "Living in a small town is preferable to living in a big city."
- "People should prioritise job satisfaction over salary."
- "Reading books is more beneficial than watching documentaries."
- "Natural talent matters more than hard work in achieving success."

BAD EXAMPLES:
- "Exercise is good for you." (no contrast, obviously true)
- "Climate change is real." (not debatable in good faith)
- "People should be kind." (no meaningful disagreement possible)
- "Technology has changed society." (statement of fact, not opinion)
- "Social media is bad." (too simplistic, no contrast)

KEY REQUIREMENTS:
- Each statement must contain a clear contrast (X vs Y, or "more than", "rather than", etc.)
- Both positions should be defensible
- Classroom-safe (avoid politics, religion, deeply personal issues)
- One sentence each, clearly stated
- Should split a room roughly 50/50
${plural ? "- Make statements varied in topic (don't repeat similar themes)" : ""}

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "statements": [
    ${plural ? `"First contrasting statement.",\n    "Second contrasting statement."${numStatements > 2 ? ",\n    ..." : ""}` : `"Your contrasting statement here."`}
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
      max_tokens: 500,
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
    const body = (await req.json()) as GenerateAgreeDisagreeRequest;
    const { cefr_level = "B1", guidance, num_statements = 1 } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(cefr_level, num_statements, guidance);
    const result = await callAnthropic(prompt);

    return jsonResponse({ statements: result.statements || [] });
  } catch (error) {
    console.error("generate-agree-disagree error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

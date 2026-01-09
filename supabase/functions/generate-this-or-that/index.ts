// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateThisOrThatRequestBody {
  cefr_level?: string;
  num_sets?: number;
  options_per_set?: number;
  topic?: string;
  exclude_sets?: string[]; // Previously generated sets to avoid
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
      max_tokens: 2000,
      temperature: 0.7, // Balanced temperature for creative but sensible outputs
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
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

  // Attempt to parse direct JSON or extract JSON block from text.
  let jsonText = trimmed;
  const jsonMatch = trimmed.match(/```json([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (error) {
    console.error("Failed to parse Anthropic JSON:", { jsonText, error });
    throw new Error("Unable to parse AI response as JSON.");
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return jsonResponse({}, { status: 200 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const body = (await req.json()) as GenerateThisOrThatRequestBody;
    const { 
      cefr_level = "B1", 
      num_sets = 5, 
      options_per_set = 2,
      topic = "",
      exclude_sets = []
    } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    // Build the exclusion list for the prompt
    const exclusionText = exclude_sets.length > 0 
      ? `\n\nDO NOT USE these combinations (already generated):\n${exclude_sets.join('\n')}`
      : '';

    // Build topic guidance
    const topicText = topic 
      ? `\n\nTHEME/TOPIC: ${topic}` 
      : '\n\nUse varied topics suitable for discussion.';

    const aiPrompt = `You are generating "This or That" discussion sets for a language classroom.

TASK: Generate ${num_sets} unique sets, each with exactly ${options_per_set} options for students to choose between and discuss.

Be creative and surprising with your choices. Avoid predictable or overused combinations.

CEFR LEVEL: ${cefr_level}
- A1-A2: Use simple, familiar vocabulary. Short phrases or single words. Concrete, everyday topics.
- B1-B2: Can use more abstract concepts. Compound phrases allowed. Include opinions and preferences.
- C1-C2: Complex ideas, nuanced choices, hypotheticals, professional or philosophical topics welcome.
${topicText}

REQUIREMENTS:
1. Each set must have genuinely debatable options - no obvious "right" answer
2. All options in a set should be comparable (same category or clear contrast)
3. Vocabulary and complexity must match the CEFR level
4. Sets should spark discussion and opinion-giving
5. Think outside the box - surprise the teacher with unexpected but discussable choices
${exclusionText}

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "sets": [
    { "options": ["Option A", "Option B"${options_per_set > 2 ? ', "Option C"' : ''}${options_per_set > 3 ? ', "Option D"' : ''}] }
  ]
}

Generate exactly ${num_sets} sets, each with exactly ${options_per_set} options.`;

    const result = await callAnthropic(aiPrompt);

    // Handle both formats: { sets: [...] } or direct array [...]
    let sets = [];
    if (result.sets && Array.isArray(result.sets)) {
      sets = result.sets;
    } else if (Array.isArray(result)) {
      // Convert old format [{left, right}] to new format [{options: []}]
      sets = result.map((item: any) => {
        if (item.options) {
          return item;
        } else if (item.left && item.right) {
          return { options: [item.left, item.right] };
        }
        return item;
      });
    }

    return jsonResponse({ sets });
  } catch (error) {
    console.error("generate-this-or-that error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

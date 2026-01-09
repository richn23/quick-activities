// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateConnectionsRequestBody {
  cefr_level?: string;
  num_sets?: number;
  topic?: string;
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
      temperature: 0.7,
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
  if (req.method === "OPTIONS") {
    return jsonResponse({}, { status: 200 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const body = (await req.json()) as GenerateConnectionsRequestBody;
    const {
      cefr_level = "B1",
      num_sets = 4,
      topic = "",
    } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    // Build topic guidance
    const topicText = topic
      ? `THEME / TOPIC: ${topic}`
      : `THEME / TOPIC: Use varied, vocabulary-building categories suitable for ${cefr_level} level ESL students.`;

    const aiPrompt = `You are generating word sets for a "Connections" game for a language classroom.

GAME DESCRIPTION:
This is similar to the NYT Connections game. Students see all words mixed together in a grid.
They must find groups of 4 related words and identify what connects them.
Each group has a category (the connection).

TASK:
Generate exactly ${num_sets} groups.
Each group must have exactly 4 words.
Groups should be ordered by difficulty (easiest first, hardest last).

CEFR LEVEL: ${cefr_level}
- A1–A2: Very common words. Obvious, concrete categories. Simple vocabulary.
- B1–B2: More varied vocabulary. Some abstract categories allowed. Collocations welcome.
- C1–C2: Advanced vocabulary. Can include idioms, nuanced connections, or tricky categories.

${topicText}

DIFFICULTY GUIDELINES:
1. Easiest group: Very obvious connection (e.g., "Fruits", "Days of the week")
2. Medium groups: Clear but requires thought (e.g., "Things that are round", "Words ending in -tion")
3. Hardest group: Subtle connection, may have red herrings (e.g., "Words that can follow 'time'", "Olympic host cities")

REQUIREMENTS:
1. Each group MUST have exactly 4 words
2. Words should be 1-2 words maximum (short, clear)
3. No word should appear in multiple groups
4. Categories should be specific and clear (not vague like "Things")
5. Some words may appear to belong to multiple groups (creates challenge)
6. Vocabulary and categories must match the CEFR level
7. Avoid offensive or inappropriate content

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "sets": [
    {
      "category": "Clear category name",
      "words": ["Word1", "Word2", "Word3", "Word4"]
    }
  ]
}

Generate exactly ${num_sets} sets, ordered from easiest to hardest.`;

    const result = await callAnthropic(aiPrompt);

    let sets = [];
    if (result.sets && Array.isArray(result.sets)) {
      sets = result.sets;
    } else if (Array.isArray(result)) {
      sets = result;
    }

    // Normalize the response format
    const formattedSets = sets.map((set: any, index: number) => ({
      category: set.category || `Group ${index + 1}`,
      words: set.words || set.items || [],
      difficulty: index,
    }));

    return jsonResponse({ sets: formattedSets });
  } catch (error) {
    console.error("generate-connections error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});


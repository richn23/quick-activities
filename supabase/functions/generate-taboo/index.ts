// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateRequest {
  cefr_level: string;
  num_items: number;
  taboo_words_per_item: number;
  topic?: string;
  exclude_words?: string[];
}

interface AnthropicResponse {
  content: Array<{ type: "text"; text: string }>;
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
      max_tokens: 4000,
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

  try {
    return JSON.parse(jsonText);
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
    const body = (await req.json()) as GenerateRequest;
    const { 
      cefr_level = "B1", 
      num_items = 10, 
      taboo_words_per_item = 3,
      topic,
      exclude_words = []
    } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    let prompt = `Generate ${num_items} items for a "Taboo" guessing game (like the board game).

CEFR Level: ${cefr_level}

Requirements:
1. Each item needs a main word/phrase to guess and ${taboo_words_per_item} "taboo" words that CANNOT be used when describing it
2. Vocabulary must match the CEFR level:
   - A1-A2: Common, everyday words
   - B1-B2: Intermediate vocabulary, some abstract concepts
   - C1-C2: Advanced vocabulary, nuanced concepts

3. Taboo words should be:
   - The most obvious/common words someone would use to describe the main word
   - Direct synonyms or closely related terms
   - Words that would make describing too easy

4. Main words should be guessable through creative description`;

    if (topic) {
      prompt += `

TOPIC/THEME: ${topic}
Focus the words around this topic. Generate words that are relevant to this theme.`;
    } else {
      prompt += `

Generate a varied mix of nouns, verbs, adjectives, places, and concepts suitable for classroom use.`;
    }

    if (exclude_words.length > 0) {
      prompt += `

DO NOT USE these previously generated words:
${exclude_words.slice(-30).join(", ")}`;
    }

    prompt += `

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "items": [
    {
      "word": "Birthday",
      "tabooWords": ["cake", "candles", "party"]
    }
  ]
}

Important:
- Words should be appropriate for an educational setting
- Ensure the game is challenging but fair
- Taboo words should be genuinely useful for describing the main word

Generate exactly ${num_items} items. Return ONLY valid JSON.`;

    const result = await callAnthropic(prompt);

    // Validate structure
    if (!result.items || !Array.isArray(result.items)) {
      throw new Error("Invalid response structure");
    }

    // Validate each item
    const validItems = result.items.filter((item: any) => 
      item.word && 
      typeof item.word === "string" && 
      Array.isArray(item.tabooWords) &&
      item.tabooWords.length >= 2
    );

    if (validItems.length === 0) {
      throw new Error("No valid items generated");
    }

    return jsonResponse({ items: validItems });
  } catch (error) {
    console.error("generate-taboo error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

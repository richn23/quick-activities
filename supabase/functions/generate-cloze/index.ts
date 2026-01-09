// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateClozeRequestBody {
  cefr_level?: string;
  word_count?: number;
  topic?: string;
  include_distractors?: boolean;
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
    const body = (await req.json()) as GenerateClozeRequestBody;
    const {
      cefr_level = "B1",
      word_count = 100,
      topic = "",
      include_distractors = false,
    } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    // Build topic guidance
    const topicText = topic
      ? `TOPIC / THEME: ${topic}`
      : `TOPIC: Generate an interesting, educational text suitable for ESL students at ${cefr_level} level.`;

    const distractorInstruction = include_distractors
      ? `\n\nALSO generate 4-6 distractor words that are plausible but NOT in the text. These should be:
- Same part of speech as removed words
- Semantically related to the topic
- Would fit grammatically in some gaps but are incorrect`
      : "";

    const aiPrompt = `You are generating a cloze (gap-fill) text for a language classroom.

TASK:
1. Generate a coherent, interesting text of approximately ${word_count} words
2. Suggest 8-12 words that should be removed to create gaps
3. The gaps should test vocabulary and/or grammar appropriate for the level

CEFR LEVEL: ${cefr_level}
- A1–A2: Very simple sentences. Common vocabulary. Present simple, basic past tense.
- B1–B2: More complex sentences. Varied vocabulary. Multiple tenses, conditionals.
- C1–C2: Sophisticated language. Nuanced vocabulary. Complex grammar structures.

${topicText}

REQUIREMENTS:
1. Text should be coherent and make sense as a complete passage
2. ~${word_count} words (can be ±20%)
3. Suggest gaps that test:
   - Key vocabulary words
   - Grammar items (verbs, prepositions, articles)
   - Mix of difficulty levels
4. Avoid removing the first or last word of a sentence
5. Don't remove proper nouns or numbers
6. Gaps should be distributed throughout the text
${distractorInstruction}

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "text": "The complete text with all words present",
  "suggested_gaps": [3, 7, 12, 18, ...],
  "distractors": ["word1", "word2", ...]
}

Where suggested_gaps is an array of word indices (0-based) to remove.
If distractors are not requested, return an empty array for distractors.`;

    const result = await callAnthropic(aiPrompt);

    return jsonResponse({
      text: result.text || "",
      suggested_gaps: result.suggested_gaps || [],
      distractors: result.distractors || [],
    });
  } catch (error) {
    console.error("generate-cloze error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});


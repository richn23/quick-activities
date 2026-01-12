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
  num_sentences: number;
  target_structure?: string;
  topic?: string;
  exclude_sentences?: string[];
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
      num_sentences = 5, 
      target_structure,
      topic,
      exclude_sentences = []
    } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    const topicNote = topic
      ? `The sentences should be thematically related to: ${topic}`
      : "Use varied, everyday topics suitable for language learners.";

    const structureNote = target_structure
      ? `Target grammar structure: ${target_structure}. Each sentence should naturally include or demonstrate this structure.`
      : "Use a variety of common grammatical structures.";

    const excludeNote = exclude_sentences.length > 0
      ? `\n\nDO NOT use any of these previously generated sentences:\n${exclude_sentences.slice(-20).join("\n")}`
      : "";

    const prompt = `Generate ${num_sentences} sentences for a "Back to the Board: Sentences" ESL classroom game.

CEFR Level: ${cefr_level}
${structureNote}
${topicNote}

GAME RULES:
- One student sits with their back to the board (can't see the sentence)
- Other students describe the sentence WORD BY WORD (not the meaning)
- Example: For "The cat is sleeping", students might say:
  - "The" → "Article, definite"
  - "cat" → "Small pet, meows"
  - "is" → "To be, present"
  - "sleeping" → "Resting, eyes closed, zzz"

SENTENCE REQUIREMENTS:
1. Length: 4-8 words per sentence (longer for higher levels)
2. Each sentence must be a complete, grammatically correct sentence
3. Use vocabulary appropriate for ${cefr_level} level
4. Include a mix of nouns, verbs, adjectives, and function words
5. Avoid proper nouns and obscure vocabulary
6. Sentences should be interesting and varied
7. Each word should be describable without using the word itself${excludeNote}

CEFR LEVEL GUIDELINES:
- A1: Very simple sentences (4-5 words), basic vocabulary
- A2: Simple sentences (5-6 words), everyday topics  
- B1: Standard sentences (5-7 words), can include phrasal verbs
- B2: Complex sentences (6-8 words), idiomatic expressions allowed
- C1/C2: Sophisticated sentences (6-8 words), advanced vocabulary

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "sentences": [
    { "sentence": "The cat is sleeping on the sofa." },
    { "sentence": "She always drinks coffee in the morning." }
  ]
}

Generate exactly ${num_sentences} sentences. Return ONLY valid JSON.`;

    const result = await callAnthropic(prompt);

    // Validate structure
    if (!result.sentences || !Array.isArray(result.sentences)) {
      throw new Error("Invalid response structure");
    }

    // Process sentences - add word array for each
    const processedSentences = result.sentences.map((item: any) => {
      const sentence = (item.sentence || "").trim();
      // Split into words, keeping punctuation attached
      const words = sentence
        .replace(/([.!?,])/g, " $1")
        .split(/\s+/)
        .filter((word: string) => word.length > 0);
      
      return {
        sentence,
        words,
      };
    });

    const validSentences = processedSentences.filter(
      (s: any) => s.sentence && s.words.length > 2
    );

    if (validSentences.length === 0) {
      throw new Error("No valid sentences generated");
    }

    return jsonResponse({ sentences: validSentences });
  } catch (error) {
    console.error("generate-sentences error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

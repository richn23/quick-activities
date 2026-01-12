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

    let prompt = `Generate ${num_sentences} English sentences for a "Sentence Jumbles" language learning activity.

CEFR Level: ${cefr_level}

Requirements:
1. Each sentence must be grammatically correct and natural
2. Vocabulary and complexity must match the CEFR level:
   - A1: Very simple sentences (5-8 words), basic vocabulary
   - A2: Simple sentences (6-10 words), everyday vocabulary
   - B1: Standard sentences (8-12 words), common expressions
   - B2: More complex sentences (10-15 words), varied vocabulary
   - C1: Sophisticated sentences (12-18 words), advanced structures
   - C2: Complex, nuanced sentences, idiomatic expressions

3. Each sentence should have a clear, unambiguous correct word order
4. Include a variety of sentence types (statements, questions, negatives)
5. Each sentence should be interesting and educational`;

    if (target_structure) {
      prompt += `

Target grammar structure: ${target_structure}
Focus the sentences on practising this grammar point.`;
    }

    if (topic) {
      prompt += `

Topic/Theme: ${topic}
Base the sentences around this topic.`;
    }

    if (exclude_sentences.length > 0) {
      prompt += `

DO NOT USE these previously generated sentences (or very similar ones):
${exclude_sentences.slice(-20).join("\n")}`;
    }

    prompt += `

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "sentences": [
    {
      "original": "The cat sat on the mat.",
      "words": ["The", "cat", "sat", "on", "the", "mat."]
    }
  ]
}

Notes:
- Keep punctuation attached to the final word (e.g., "mat." not "mat" + ".")
- Split contractions as they appear (e.g., "don't" stays as one word)
- Capitalize only the first word and proper nouns
- Make sentences engaging and suitable for classroom use

Generate exactly ${num_sentences} sentences. Return ONLY valid JSON.`;

    const result = await callAnthropic(prompt);

    // Validate structure
    if (!result.sentences || !Array.isArray(result.sentences)) {
      throw new Error("Invalid response structure");
    }

    // Validate each sentence
    const validSentences = result.sentences.filter((s: any) => 
      s.original && 
      typeof s.original === "string" && 
      Array.isArray(s.words) &&
      s.words.length > 1
    );

    if (validSentences.length === 0) {
      throw new Error("No valid sentences generated");
    }

    return jsonResponse({ sentences: validSentences });
  } catch (error) {
    console.error("generate-sentence-jumbles error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

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
  num_pairs: number;
  match_type: 'definition' | 'question-answer' | 'sentence-halves' | 'collocations' | 'synonyms' | 'antonyms';
  topic?: string;
  exclude_items?: string[];
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
      temperature: 0.7,
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

function buildPrompt(
  matchType: string,
  numPairs: number,
  cefrLevel: string,
  topic?: string,
  excludeItems?: string[]
): string {
  let prompt = '';
  
  switch (matchType) {
    case 'definition':
      prompt = `Generate ${numPairs} word-definition pairs for a classroom matching activity.

CEFR LEVEL: ${cefrLevel}
- A1-A2: Common, concrete vocabulary. Simple definitions.
- B1-B2: More abstract words. Clear but slightly more complex definitions.
- C1-C2: Advanced vocabulary. Precise definitions.

${topic ? `TOPIC/THEME: ${topic}` : 'Use varied everyday topics.'}

REQUIREMENTS:
1. Definitions should be concise (3-8 words ideally)
2. Definitions should be clear and unambiguous
3. Avoid using the target word in the definition
4. Match vocabulary to CEFR level`;
      break;
      
    case 'question-answer':
      prompt = `Generate ${numPairs} question-answer pairs for a classroom matching activity.

CEFR LEVEL: ${cefrLevel}
- A1-A2: Simple questions about daily life. Short answers.
- B1-B2: More varied question types. Fuller answers.
- C1-C2: Complex questions. Nuanced answers.

${topic ? `TOPIC/THEME: ${topic}` : 'Use varied everyday topics.'}

REQUIREMENTS:
1. Questions should have ONE clear matching answer
2. Answers should be concise (2-6 words)
3. Avoid yes/no questions (harder to match uniquely)
4. Mix question types (what, where, when, how, why)`;
      break;
      
    case 'sentence-halves':
      prompt = `Generate ${numPairs} sentences split into two halves for a classroom matching activity.

CEFR LEVEL: ${cefrLevel}
- A1-A2: Simple sentences. Clear break points.
- B1-B2: Compound/complex sentences. Natural split points.
- C1-C2: Sophisticated sentences. Logical break points.

${topic ? `TOPIC/THEME: ${topic}` : 'Use varied everyday topics.'}

REQUIREMENTS:
1. Each half should only logically match ONE other half
2. Split at natural break points (after comma, conjunction, etc.)
3. Avoid splits that could match multiple endings
4. Both halves should be roughly similar length`;
      break;
      
    case 'collocations':
      prompt = `Generate ${numPairs} collocation pairs for a classroom matching activity.

CEFR LEVEL: ${cefrLevel}
- A1-A2: Common verb + noun collocations. High frequency.
- B1-B2: Wider variety including adjective + noun, phrasal verbs.
- C1-C2: Advanced collocations, idiom components.

${topic ? `TOPIC/THEME: ${topic}` : 'Use varied everyday topics.'}

REQUIREMENTS:
1. Pairs should be common/natural collocations
2. First word should only naturally pair with ONE second word in the set
3. Mix types: verb+noun, adjective+noun, verb+adverb
4. Avoid collocations that could match multiple options`;
      break;
      
    case 'synonyms':
      prompt = `Generate ${numPairs} synonym pairs for a classroom matching activity.

CEFR LEVEL: ${cefrLevel}
- A1-A2: Common words with simple synonyms.
- B1-B2: More varied vocabulary.
- C1-C2: Advanced/nuanced synonyms.

${topic ? `TOPIC/THEME: ${topic}` : 'Use varied everyday vocabulary.'}

REQUIREMENTS:
1. Words should be clear synonyms (similar meaning)
2. Each word should only match ONE other word in the set
3. Avoid near-synonyms that could cause confusion
4. Both words should be at appropriate CEFR level`;
      break;
      
    case 'antonyms':
      prompt = `Generate ${numPairs} antonym pairs for a classroom matching activity.

CEFR LEVEL: ${cefrLevel}
- A1-A2: Common opposites.
- B1-B2: More varied vocabulary.
- C1-C2: Advanced/nuanced antonyms.

${topic ? `TOPIC/THEME: ${topic}` : 'Use varied everyday vocabulary.'}

REQUIREMENTS:
1. Words should be clear antonyms (opposite meaning)
2. Each word should only match ONE other word in the set
3. Use direct opposites, not gradable scales
4. Both words should be at appropriate CEFR level`;
      break;
      
    default:
      throw new Error(`Unknown match type: ${matchType}`);
  }
  
  if (excludeItems && excludeItems.length > 0) {
    prompt += `

DO NOT USE these previously generated items:
${excludeItems.slice(-30).join(", ")}`;
  }
  
  prompt += `

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "pairs": [
    { "itemA": "example1", "itemB": "match1" },
    { "itemA": "example2", "itemB": "match2" }
  ]
}

Generate exactly ${numPairs} pairs. Return ONLY valid JSON.`;

  return prompt;
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
      num_pairs = 6, 
      match_type = "definition",
      topic,
      exclude_items = []
    } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(match_type, num_pairs, cefr_level, topic, exclude_items);
    const result = await callAnthropic(prompt);

    // Validate structure
    if (!result.pairs || !Array.isArray(result.pairs)) {
      throw new Error("Invalid response structure");
    }

    // Validate each pair
    const validPairs = result.pairs.filter((pair: any) => 
      pair.itemA && 
      typeof pair.itemA === "string" && 
      pair.itemB &&
      typeof pair.itemB === "string"
    );

    if (validPairs.length === 0) {
      throw new Error("No valid pairs generated");
    }

    return jsonResponse({ pairs: validPairs });
  } catch (error) {
    console.error("generate-match-it error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

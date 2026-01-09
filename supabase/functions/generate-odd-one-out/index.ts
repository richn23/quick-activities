// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateOddOneOutRequestBody {
  cefr_level?: string;
  num_sets?: number;
  items_per_set?: number;
  topic?: string;
  exclude_items?: string[];
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
      max_tokens: 4000,
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
    const body = (await req.json()) as GenerateOddOneOutRequestBody;
    const { 
      cefr_level = "B1", 
      num_sets = 4,
      items_per_set = 4,
      topic = "",
      exclude_items = [],
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
      : `THEME / TOPIC: Use varied, discussion-friendly categories suitable for ${cefr_level}.`;

    // Build exclusion list
    const exclusionText = exclude_items.length > 0
      ? `\n\nDO NOT USE THESE ITEMS (already generated in this session):\n${exclude_items.join(", ")}`
      : "";

    // CEFR-specific reasoning guidance
    let reasoningGuidance = "";
    if (cefr_level === "A1" || cefr_level === "A2") {
      reasoningGuidance = `
REASONING STYLE for ${cefr_level}:
- Use VERY simple explanations
- Short phrases or simple sentences
- Examples: "Because it is not food", "Because it is a feeling", "Because you cannot eat it"
- Avoid complex grammar or abstract concepts
- Keep items concrete and familiar (common nouns, basic verbs)
- Never resolve ambiguity — leave interpretation open`;
    } else if (cefr_level === "B1" || cefr_level === "B2") {
      reasoningGuidance = `
REASONING STYLE for ${cefr_level}:
- Use short sentences with comparison language
- Examples: "Unlike the others, X is not a living thing", "X is the only one that is man-made"
- Can include basic cause-effect relationships
- Keep explanations clear and practical`;
    } else {
      reasoningGuidance = `
REASONING STYLE for ${cefr_level}:
- Can use nuanced, conceptual distinctions
- Examples: "While all items share a surface similarity, X represents an abstract concept rather than a tangible entity"
- Can reference metaphorical or professional contexts
- Encourage sophisticated comparison and contrast`;
    }

    const aiPrompt = `You are generating "Odd One Out" discussion sets for a language classroom.

═══════════════════════════════════════════════════════════════
CRITICAL RULE — AI ROLE LIMITATION (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════

You are a CONTENT GENERATOR, not a decision-maker.

You MAY:
✓ Generate item sets
✓ Suggest multiple possible justifications (reasoning examples)

You MUST NEVER:
✗ Select, mark, or indicate a "correct" odd one out
✗ Output any field like "answer", "correct", "oddOneOut", or "selected"
✗ Rank options by correctness
✗ Imply that one interpretation is better than others
✗ Resolve ambiguity for the user

Multiple interpretations MUST remain equally valid.

═══════════════════════════════════════════════════════════════

ACTIVITY DESCRIPTION:
In this activity, students are shown a small set of words or phrases.
They must decide which item is the "odd one out" and justify their reasoning.
There is intentionally NO single correct answer — multiple interpretations should be possible.
The focus is on reasoning, explanation, and language use, not correctness.

TASK:
Generate ${num_sets} unique sets.
Each set must contain exactly ${items_per_set} items.
For EACH set, also provide 3-5 reasoning examples that justify DIFFERENT possible odd-one-out choices.

CEFR LEVEL: ${cefr_level}
- A1–A2: Simple, concrete nouns or verbs. Familiar categories. Clear vocabulary.
- B1–B2: Broader topics. Abstract nouns, adjectives, collocations, or short phrases allowed.
- C1–C2: Conceptual, metaphorical, professional, or nuanced items encouraged.
${reasoningGuidance}

${topicText}

REQUIREMENTS:
1. Every set MUST allow MORE THAN ONE valid odd-one-out choice
2. CRITICAL: At least 3 items MUST share a coherent, defensible connection — a grouping that students can discover and articulate through discussion, even if not immediately apparent
3. Items should NOT all be equally unrelated — there must be a real pattern to find
4. The 4th item should break the pattern in a discussable way, while still allowing alternative interpretations
5. Avoid trivial category tests, but also avoid sets where ALL items are random/unrelated
6. The reasoning examples MUST reference DIFFERENT items as the odd one out
7. Each reasoning example should start with "X could be..." or "One could argue X..." — never "X is the answer"
8. Vocabulary, abstraction, and complexity must align with the CEFR level
9. Avoid culturally sensitive, offensive, or inappropriate content
10. Do NOT include any "answer", "correct", "selected", or "oddOneOut" field — this activity is open-ended
11. Generate fresh, unexpected combinations - avoid common/predictable groupings
${exclusionText}

GOOD SET EXAMPLES:
- Entrepreneur, Diplomat, Surgeon, Integrity → 3 professions + 1 abstract noun (but "Integrity" could also link to all jobs)
- Whisper, Shout, Murmur, Silence → 3 ways of speaking + 1 absence of sound (but all relate to sound)
- Marathon, Sprint, Hurdles, Spectator → 3 athletic events + 1 person (but all relate to athletics)

BAD SET EXAMPLES (avoid these):
- Serendipity, Ephemeral, Ubiquitous, Melancholy → All abstract, no clear grouping
- Chair, Democracy, Tuesday, Purple → Random items with no connection

═══════════════════════════════════════════════════════════════
JUSTIFICATION QUALITY RULES (STRICT)
═══════════════════════════════════════════════════════════════

Focus justifications on:
✓ Categories (sweet vs savoury, solid vs liquid)
✓ Function or purpose (document vs activity, tool vs material)
✓ Typical context (indoor vs outdoor, formal vs informal)
✓ Classification (object vs experience, living vs non-living)

Use hedging language:
✓ "typically", "usually", "often", "can be seen as", "is generally"

AVOID these weak justification patterns:
✗ Personal behaviour: "You eat it with your hands", "You do it alone"
✗ Physical actions: "You hold it", "You drink it standing up"
✗ Absolutes: "You always need...", "You never..."
✗ Edge cases: "Some people might...", "In certain situations..."
✗ Subjective preferences: "It's more fun", "People prefer..."

Before including a justification, verify:
"Would this sound reasonable if a teacher questioned it?"
If the justification relies on personal habits or edge cases, regenerate it.

GOOD EXAMPLES:
- "X is typically a dessert, while the others are main courses"
- "X is usually a document, while the others are activities"
- "X can be seen as an experience rather than a physical object"
- "X is generally consumed as a beverage, unlike the solid foods"

BAD EXAMPLES (DO NOT USE):
- "You eat X with your hands" (personal behaviour)
- "You usually do X alone" (assumption about behaviour)
- "X requires a spoon" (physical action edge case)
- "You always need X when travelling" (absolute claim)

═══════════════════════════════════════════════════════════════

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "sets": [
    {
      "items": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "ai_reasoning_examples": [
        "Item 1 could be the odd one out because...",
        "Item 2 could be the odd one out because...",
        "Item 3 could be the odd one out because..."
      ]
    }
  ]
}

REMEMBER: Do NOT choose, mark, or imply a correct odd one out. All items are valid choices.

Generate exactly ${num_sets} sets, each with exactly ${items_per_set} items and 3-5 reasoning examples.`;

    const result = await callAnthropic(aiPrompt);

    // Normalize the response format
    let sets = [];
    if (result.sets && Array.isArray(result.sets)) {
      sets = result.sets;
    } else if (Array.isArray(result)) {
      sets = result;
    }

    // ENFORCE: Strip any answer/selection fields the AI might have included
    // Convert to the format expected by the frontend with NEUTRAL state
    const formattedSets = sets.map((set: any) => {
      // Extract only allowed fields, ignore any "answer", "correct", "selected", "oddOneOut" from AI
      const words = set.items || set.words || [];
      const aiReasoningExamples = set.ai_reasoning_examples || set.aiReasoningExamples || [];
      
      return {
        words,
        oddOneOut: -1, // ALWAYS -1 (unselected) — AI never decides
        aiReasoningExamples,
      };
    });

    return jsonResponse({ sets: formattedSets });
  } catch (error) {
    console.error("generate-odd-one-out error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

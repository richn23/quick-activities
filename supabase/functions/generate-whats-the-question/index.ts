// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateWhatsTheQuestionRequestBody {
  cefr_level?: string;
  num_items?: number;
  topic?: string;
  exclude_questions?: string[];
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
    const body = (await req.json()) as GenerateWhatsTheQuestionRequestBody;
    const { 
      cefr_level = "B1", 
      num_items = 5,
      topic = "",
      exclude_questions = [],
    } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    // Build exclusion list
    const exclusionText = exclude_questions.length > 0
      ? `\n\nDO NOT USE THESE QUESTION TYPES OR SIMILAR TOPICS (already generated):\n${exclude_questions.join("\n")}`
      : "";

    // Build topic guidance
    const topicText = topic 
      ? `THEME / TOPIC: ${topic}` 
      : `THEME / TOPIC: Use varied, discussion-friendly ESL topics suitable for ${cefr_level}.`;

    const aiPrompt = `You are generating content for a language classroom activity called "What's the Question?".

ACTIVITY DESCRIPTION:
In this activity, students are shown ONLY learner answers on the screen.
Working in pairs or groups, they discuss the answers and deduce what the original question might have been.
There is no single correct question — multiple reasonable interpretations are encouraged.
The teacher may reveal a suggested original question after discussion.

TASK:
Generate ${num_items} unique items.

Each item must include:
1) A hidden original question (for the teacher)
2) A set of learner answers that logically respond to that question

CEFR LEVEL: ${cefr_level}
- A1–A2: Simple, concrete questions. Familiar topics. Short answers (words or short phrases).
- B1–B2: Everyday abstract topics allowed. Full sentences possible. Opinions and explanations.
- C1–C2: Open-ended, nuanced, hypothetical, reflective, or professional questions. Varied answer styles.

${topicText}

REQUIREMENTS:
1. Students should be able to reasonably deduce the question from the answers
2. Answers must clearly belong together and point toward the same type of question
3. Avoid obvious question stems like "What is your favourite…?" unless level-appropriate
4. Encourage discussion, comparison, and justification
5. Keep vocabulary, grammar, and abstraction aligned to the CEFR level
6. Answers should feel like real learner responses (not identical, not robotic)
7. Generate fresh, unexpected questions - avoid common/predictable combinations
${exclusionText}

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "items": [
    {
      "suggested_question": "Hidden question shown only to the teacher",
      "answers": [
        "Learner answer 1",
        "Learner answer 2",
        "Learner answer 3"
      ]
    }
  ]
}

Generate exactly ${num_items} items.`;

    const result = await callAnthropic(aiPrompt);

    // Normalize the response format
    let items = [];
    if (result.items && Array.isArray(result.items)) {
      items = result.items;
    } else if (Array.isArray(result)) {
      items = result;
    }

    // Convert to the format expected by the frontend: { question, answer }
    const sets = items.map((item: any) => ({
      question: item.suggested_question || item.question || "",
      answer: Array.isArray(item.answers) ? item.answers.join(", ") : (item.answer || ""),
    }));

    return jsonResponse({ sets });
  } catch (error) {
    console.error("generate-whats-the-question error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});


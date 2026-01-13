// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateSpeakingPromptsRequest {
  cefr_level: string;
  guidance?: string;
  activity_type: string;
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

function buildPrompt(activityType: string, cefrLevel: string, guidance?: string): string {
  const guidanceText = guidance ? `\n\nTeacher guidance: "${guidance}"` : "";

  const activityPrompts: Record<string, string> = {
    "4-3-2": `You are generating speaking prompts for a language classroom fluency activity called "4-3-2 Speaking".

In this activity, students speak about the same topic 3 times, each time with less time (4 minutes, then 3, then 2). The goal is fluency through repetition.

CEFR Level: ${cefrLevel}
- A2: Simple, concrete topics about daily life, personal experiences, routines
- B1: Topics allowing personal opinion, familiar situations, past experiences
- B2: Abstract topics, hypotheticals, explaining viewpoints
- C1: Complex topics requiring nuanced discussion, professional themes
${guidanceText}

Generate exactly 3 speaking prompts. Each prompt must be:
- Short (1-2 sentences maximum)
- Open-ended (no single correct answer)
- Classroom-safe (appropriate for all students)
- NOT a role-play scenario
- NOT a debate or agree/disagree format
- Suitable for sustained monologue (1-4 minutes)

Good examples:
- "Talk about a skill you would like to learn and why."
- "Describe a memorable journey you have taken."
- "Talk about how technology has changed your daily routine."

Bad examples:
- "You are a travel agent. Sell a holiday." (role-play)
- "Debate whether social media is good or bad." (debate format)
- "What is the capital of France?" (not open-ended)

OUTPUT FORMAT (JSON only, no markdown):
{
  "prompts": [
    "First prompt here",
    "Second prompt here", 
    "Third prompt here"
  ]
}`,

    "timed-talk": `You are generating speaking prompts for a "Timed Talk" fluency activity.

Students will speak for a set time (30-90 seconds) without stopping on a given topic.

CEFR Level: ${cefrLevel}
${guidanceText}

Generate exactly 3 speaking prompts. Each prompt must be:
- Short and clear
- Open-ended
- Suitable for 30-90 seconds of speaking
- Classroom-safe

OUTPUT FORMAT (JSON only, no markdown):
{
  "prompts": [
    "First prompt here",
    "Second prompt here",
    "Third prompt here"
  ]
}`,

    "question-cards": `You are generating discussion questions for a speaking activity.

These questions will be shown one at a time for pair or group discussion.

CEFR Level: ${cefrLevel}
${guidanceText}

Generate exactly 5 discussion questions. Each question must be:
- Open-ended (encourages extended response)
- Suitable for pair/group discussion
- Classroom-safe
- Appropriate for the CEFR level

OUTPUT FORMAT (JSON only, no markdown):
{
  "prompts": [
    "First question here",
    "Second question here",
    "Third question here",
    "Fourth question here",
    "Fifth question here"
  ]
}`,

    "agree-disagree": `You are generating statements for an "Agree/Disagree" speaking activity.

Students will be shown a statement and must take a position (agree or disagree) and defend it.

CEFR Level: ${cefrLevel}
${guidanceText}

Generate exactly 5 statements. Each statement must be:
- Debatable (reasonable people could disagree)
- Clear and concise
- Classroom-safe
- Appropriate for the CEFR level
- NOT obviously true or false

Good examples:
- "Everyone should learn to cook."
- "Working from home is better than working in an office."
- "Social media has made people less social."

Bad examples:
- "The sky is blue." (not debatable)
- "Murder is wrong." (not genuinely debatable in classroom)

OUTPUT FORMAT (JSON only, no markdown):
{
  "prompts": [
    "First statement here",
    "Second statement here",
    "Third statement here",
    "Fourth statement here",
    "Fifth statement here"
  ]
}`,
  };

  return activityPrompts[activityType] || activityPrompts["timed-talk"];
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
      max_tokens: 1000,
      temperature: 0.8,
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

  // Extract JSON
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
    const body = (await req.json()) as GenerateSpeakingPromptsRequest;
    const { cefr_level = "B1", guidance, activity_type = "timed-talk" } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(activity_type, cefr_level, guidance);
    const result = await callAnthropic(prompt);

    return jsonResponse({ prompts: result.prompts || [] });
  } catch (error) {
    console.error("generate-speaking-prompts error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

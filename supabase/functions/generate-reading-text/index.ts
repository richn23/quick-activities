// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface GenerateTextRequest {
  topic: string;
  cefr_level?: string;
  length?: string;
  text_type?: string;
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

function getWordTarget(length: string): string {
  switch (length) {
    case "short":
      return "approximately 150 words";
    case "long":
      return "approximately 500 words";
    case "medium":
    default:
      return "approximately 300 words";
  }
}

function getTextTypeGuidance(textType: string): string {
  switch (textType) {
    case "story":
      return `Write a SHORT STORY with:
- A clear beginning, middle, and end
- One or two characters
- A simple plot or event
- Past tense narrative`;
    case "dialogue":
      return `Write a DIALOGUE/CONVERSATION between two people:
- Use natural conversational language
- Include speaker labels (e.g., "A:" and "B:" or names)
- Cover a realistic everyday scenario
- Include appropriate greetings and closings`;
    case "email":
      return `Write an EMAIL:
- Include To/From/Subject headers
- Use appropriate email conventions
- Semi-formal or informal tone depending on context
- Clear purpose and call to action`;
    case "blog":
      return `Write a BLOG POST:
- Engaging, personal tone
- First person perspective
- Conversational but informative
- Can include rhetorical questions`;
    case "news":
      return `Write a NEWS REPORT:
- Objective, factual tone
- Third person perspective
- Lead paragraph with key information
- Inverted pyramid structure`;
    case "article":
    default:
      return `Write an ARTICLE:
- Informative, clear structure
- Introduction, body paragraphs, conclusion
- Third person or general perspective
- Balanced, educational tone`;
  }
}

function getCefrGuidance(cefrLevel: string): string {
  switch (cefrLevel) {
    case "A1":
      return `A1 (Beginner) level:
- Very simple, short sentences (5-8 words maximum)
- Most basic vocabulary only (500 most common words)
- Present simple tense mainly
- Familiar, concrete topics (family, food, home, daily routines)
- Very short paragraphs (2-3 sentences)
- No idioms, phrasal verbs, or complex structures
- Simple connectors only (and, but, because)`;
    case "A2":
      return `A2 (Elementary) level:
- Use simple sentences (subject-verb-object)
- Basic vocabulary (most common 1000-1500 words)
- Present and past simple tenses mainly
- Concrete, everyday topics
- Short paragraphs
- Avoid idioms and phrasal verbs`;
    case "B2":
      return `B2 (Upper Intermediate) level:
- Complex sentences with subordinate clauses
- Wide vocabulary including some abstract terms
- All tenses including perfect and conditional
- Can discuss abstract ideas and hypotheticals
- Longer paragraphs with developed ideas
- Some idioms and phrasal verbs acceptable`;
    case "C1":
      return `C1 (Advanced) level:
- Sophisticated sentence structures
- Rich vocabulary including academic/professional terms
- Nuanced expression and implicit meaning
- Complex ideas with supporting arguments
- Cohesive, well-organised paragraphs
- Idioms, collocations, and varied register`;
    case "B1":
    default:
      return `B1 (Intermediate) level:
- Moderately complex sentences
- Common vocabulary with some less frequent words
- Present, past, future, and present perfect tenses
- Can express opinions and experiences
- Clear paragraph structure
- Limited idioms, explained in context`;
  }
}

function buildPrompt(
  topic: string,
  cefrLevel: string,
  length: string,
  textType: string
): string {
  return `Generate a reading text for English language learners.

TOPIC: ${topic}

${getTextTypeGuidance(textType)}

${getCefrGuidance(cefrLevel)}

LENGTH: ${getWordTarget(length)}

IMPORTANT REQUIREMENTS:
- The text must be ORIGINAL (not copied from real sources)
- Culturally neutral and classroom-appropriate
- Engaging and interesting to read
- Grammatically correct
- No explicit violence, politics, or controversial content
- If a story or scenario, use generic names and settings

OUTPUT: Return ONLY the text itself. No title, no introduction, no explanation. Just the reading text.`;
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
      max_tokens: 1500,
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

  return message.text.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, { status: 200 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const body = (await req.json()) as GenerateTextRequest;
    const {
      topic,
      cefr_level = "B1",
      length = "medium",
      text_type = "article",
    } = body;

    if (!topic || topic.trim().length === 0) {
      return jsonResponse({ error: "Topic is required" }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(topic, cefr_level, length, text_type);
    const text = await callAnthropic(prompt);

    return jsonResponse({ text });
  } catch (error) {
    console.error("generate-reading-text error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

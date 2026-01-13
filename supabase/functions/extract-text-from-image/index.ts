// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface ExtractTextRequest {
  image_base64: string;
  media_type: string;
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

function getMediaType(type: string): string {
  // Normalize media type for Anthropic API
  const normalizedTypes: Record<string, string> = {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/gif": "image/gif",
    "image/webp": "image/webp",
  };
  return normalizedTypes[type.toLowerCase()] || "image/jpeg";
}

async function callAnthropic(imageBase64: string, mediaType: string) {
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
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: getMediaType(mediaType),
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Extract ALL the readable text from this image.

This is likely a textbook page, worksheet, or handout for English language learning.

INSTRUCTIONS:
1. Extract the main reading text as accurately as possible
2. Preserve paragraph breaks
3. Ignore headers, footers, page numbers, and exercise instructions (unless they're part of the reading)
4. If there are multiple texts, extract the main/longest one
5. If the image is unclear or text is unreadable, extract what you can

OUTPUT: Return ONLY the extracted text. No explanation, no commentary, just the text from the image.

If you cannot extract any meaningful text, respond with: "[Unable to extract text from this image]"`,
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
    const body = (await req.json()) as ExtractTextRequest;
    const { image_base64, media_type } = body;

    if (!image_base64) {
      return jsonResponse({ error: "Image data is required" }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    const text = await callAnthropic(image_base64, media_type || "image/jpeg");

    // Check if extraction failed
    if (text.includes("[Unable to extract text")) {
      return jsonResponse(
        { error: "Unable to extract text from this image. Please try a clearer image or paste the text directly." },
        { status: 422 }
      );
    }

    return jsonResponse({ text });
  } catch (error) {
    console.error("extract-text-from-image error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});

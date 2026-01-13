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
  file_base64?: string;
  image_base64?: string; // Legacy support
  media_type: string;
  filename?: string;
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

function isImageType(mediaType: string): boolean {
  return mediaType.startsWith("image/");
}

function isPdfType(mediaType: string): boolean {
  return mediaType === "application/pdf";
}

function isDocxType(mediaType: string): boolean {
  return (
    mediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mediaType === "application/msword"
  );
}

function isPptxType(mediaType: string): boolean {
  return (
    mediaType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mediaType === "application/vnd.ms-powerpoint"
  );
}

function getImageMediaType(type: string): string {
  const normalizedTypes: Record<string, string> = {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/gif": "image/gif",
    "image/webp": "image/webp",
  };
  return normalizedTypes[type.toLowerCase()] || "image/jpeg";
}

const EXTRACTION_PROMPT = `Extract ALL the readable text from this document.

This is likely a textbook page, worksheet, handout, or educational material for English language learning.

INSTRUCTIONS:
1. Extract the main reading text as accurately as possible
2. Preserve paragraph breaks
3. Ignore headers, footers, page numbers, and exercise instructions (unless they're part of the reading)
4. If there are multiple texts, extract the main/longest one
5. If the document is unclear or text is unreadable, extract what you can
6. For presentations (PowerPoint), extract the text from all visible slides in order

OUTPUT: Return ONLY the extracted text. No explanation, no commentary, just the text from the document.

If you cannot extract any meaningful text, respond with: "[Unable to extract text from this document]"`;

async function extractFromImage(base64: string, mediaType: string) {
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
                media_type: getImageMediaType(mediaType),
                data: base64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
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

async function extractFromPdf(base64: string) {
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
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
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

async function extractFromOfficeDoc(base64: string, mediaType: string, filename: string) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured.");
  }

  // For DOCX and PPTX, we try to use Claude's document handling
  // Claude can process these via the document content type
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // If Claude doesn't support this document type directly, provide helpful error
    if (response.status === 400) {
      throw new Error(
        `Unable to process ${filename}. For best results, please export to PDF or paste the text directly.`
      );
    }
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
    const { file_base64, image_base64, media_type, filename = "document" } = body;
    
    // Support both new and legacy field names
    const base64Data = file_base64 || image_base64;

    if (!base64Data) {
      return jsonResponse({ error: "File data is required" }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "Anthropic API key not configured." },
        { status: 500 }
      );
    }

    let text: string;

    if (isImageType(media_type)) {
      text = await extractFromImage(base64Data, media_type);
    } else if (isPdfType(media_type)) {
      text = await extractFromPdf(base64Data);
    } else if (isDocxType(media_type) || isPptxType(media_type)) {
      text = await extractFromOfficeDoc(base64Data, media_type, filename);
    } else {
      return jsonResponse(
        { error: `Unsupported file type: ${media_type}. Please use PDF, DOCX, PPTX, or images.` },
        { status: 400 }
      );
    }

    // Check if extraction failed
    if (text.includes("[Unable to extract text")) {
      return jsonResponse(
        { error: "Unable to extract text from this document. Please try a different file or paste the text directly." },
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

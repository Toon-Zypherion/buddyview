import { NextResponse } from "next/server";
import { findBuddyById, loadBuddyDetail } from "@/lib/buddyData";
import fs from "node:fs/promises";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequestBody = {
  buddyId?: string;
  message?: string;
  history?: ChatMessage[];
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

export async function POST(request: Request) {
  const payload = (await request.json()) as ChatRequestBody;
  const buddyId = payload.buddyId?.trim();
  const message = payload.message?.trim();

  if (!buddyId || !message) {
    return NextResponse.json(
      { error: "Both buddyId and message are required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI key not configured on the server." },
      { status: 500 },
    );
  }

  const buddySummary = findBuddyById(buddyId);

  if (!buddySummary) {
    return NextResponse.json({ error: "Buddy not found." }, { status: 404 });
  }

  const buddyDetail = await loadBuddyDetail(buddyId);

  if (!buddyDetail) {
    return NextResponse.json({ error: "Buddy not found." }, { status: 404 });
  }

  const systemPrompt = buildSystemPrompt({
    name: buddyDetail.name,
    role: buddyDetail.role,
    systemInstructions: buddyDetail.systemInstructions,
    customInstructions: buddyDetail.customInstructions,
    userInstructions: null,
    context: null,
    contextFile: null,
  });

  const history = sanitiseHistory(payload.history ?? []);

  const systemMsg: OpenAIChatMessage = { role: "system", content: systemPrompt };
  const priming: OpenAIChatMessage[] = [];

  // Add user-level style/directives as a priming user message (lower priority than system)
  if (buddyDetail.userInstructions?.trim()) {
    priming.push({
      role: "user",
      content: `Style/directives:\n${buddyDetail.userInstructions.trim()}`,
    });
  }

  // Inject knowledge base content (inline or loaded from file) as a priming user message
  if (buddyDetail.context?.trim() || buddyDetail.contextFile?.trim()) {
    let ctx = buddyDetail.context?.trim() ?? null;
    if (!ctx && buddyDetail.contextFile) {
      try {
        ctx = await fs.readFile(buddyDetail.contextFile, "utf8");
      } catch {
        ctx = null;
      }
    }
    if (ctx) {
      priming.push({
        role: "user",
        content: `Knowledge base:\n"""${ctx.slice(0, 15000)}"""`,
      });
    }
  }

  const chatMessages: OpenAIChatMessage[] = [
    systemMsg,
    ...priming,
    ...history.map((entry) => ({ role: entry.role, content: entry.content })),
  ];

  // Ensure the current prompt is appended as the latest user message
  if (!history.length || history[history.length - 1]?.content !== message) {
    chatMessages.push({ role: "user", content: message });
  }

  try {
    const completion = await callOpenAI({
      apiKey,
      model: DEFAULT_MODEL,
      messages: chatMessages,
    });

    if (!completion) {
      throw new Error("No completion returned from OpenAI.");
    }

    return NextResponse.json({ reply: completion });
  } catch (error) {
    console.error("[chat] OpenAI request failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Upstream signal dropped. Try again shortly.",
      },
      { status: 500 },
    );
  }
}

type SystemPromptContext = {
  name: string;
  role: string;
  systemInstructions: string | null | undefined;
  customInstructions: string | null | undefined;
  userInstructions: string | null | undefined;
  context: string | null | undefined;
  contextFile: string | null | undefined;
};

function buildSystemPrompt(context: SystemPromptContext) {
  const parts = [
    context.systemInstructions?.trim() ||
      `You are ${context.name}, ${context.role}. Respond as that persona.`,
    context.customInstructions
      ? `Follow these delivery preferences:\n${context.customInstructions.trim()}`
      : null,
    context.userInstructions
      ? `Follow these style directives:\n${context.userInstructions.trim()}`
      : null,
    context.context
      ? `Reference context:\n${context.context.trim()}`
      : context.contextFile
        ? `Reference context from file: ${context.contextFile}`
      : null,
    "Always speak in the first person as the buddy, stay concise but vivid, and provide helpful, actionable responses.",
  ];

  return parts.filter((chunk) => Boolean(chunk?.length)).join("\n\n");
}

function sanitiseHistory(history: ChatMessage[]) {
  return history
    .filter((entry): entry is ChatMessage => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      if (!entry.content || !entry.content.trim()) {
        return false;
      }

      return entry.role === "user" || entry.role === "assistant";
    })
    .slice(-10)
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    }));
}

type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIRequest = {
  apiKey: string;
  model: string;
  messages: OpenAIChatMessage[];
};

async function callOpenAI({ apiKey, model, messages }: OpenAIRequest) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI responded with ${response.status}: ${truncate(errorText, 280)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();

  return content ?? null;
}

function truncate(input: string, length: number) {
  if (input.length <= length) {
    return input;
  }

  return `${input.slice(0, length - 1)}…`;
}

import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { A3_SYSTEM_PROMPT } from "@/lib/a3-prompt";

const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

type ContentBlock = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type MessageContent = string | ContentBlock[];

function hasImages(messages: { role: string; content: MessageContent }[]): boolean {
  return messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((b) => b.type === "image_url")
  );
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const { messages } = await request.json();

  const model = hasImages(messages) ? VISION_MODEL : TEXT_MODEL;

  const completion = await groq.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: "system", content: A3_SYSTEM_PROMPT },
      ...messages,
    ],
  });

  return NextResponse.json({ content: completion.choices[0].message.content });
}

import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { A3_SYSTEM_PROMPT } from "@/lib/a3-prompt";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const { messages } = await request.json();

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4096,
    messages: [
      { role: "system", content: A3_SYSTEM_PROMPT },
      ...messages,
    ],
  });

  return NextResponse.json({
    content: completion.choices[0].message.content,
  });
}

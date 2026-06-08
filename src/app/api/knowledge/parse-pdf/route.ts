import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (
      buf: Buffer
    ) => Promise<{ text: string; numpages: number }>;
    const data = await pdfParse(buffer);

    const text = data.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from this PDF. It may be scanned or image-based." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
      pages: data.numpages,
      chars: text.length,
    });
  } catch (err) {
    console.error("[parse-pdf]", err);
    return NextResponse.json(
      { error: "Failed to parse PDF. The file may be encrypted or corrupted." },
      { status: 500 }
    );
  }
}

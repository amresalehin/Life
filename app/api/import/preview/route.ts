import { NextResponse } from "next/server";
import { previewImport } from "@/lib/ingestion";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { data?: unknown; file?: unknown; sourceName?: string };
    const result = await previewImport(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to preview import", error: String(error) },
      { status: 400 },
    );
  }
}

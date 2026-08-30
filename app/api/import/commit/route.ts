import { NextResponse } from "next/server";
import { commitImport } from "@/lib/ingestion";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { data?: unknown; file?: unknown; sourceName?: string };
    const result = await commitImport(body, body.sourceName);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to commit import", error: String(error) },
      { status: 400 },
    );
  }
}

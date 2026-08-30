import { NextResponse } from "next/server";
import { searchWatchHistory } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? "100");

  const results = await searchWatchHistory(q, Number.isFinite(limit) ? Math.min(limit, 200) : 100);

  return NextResponse.json({ items: results });
}

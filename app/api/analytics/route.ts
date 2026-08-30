import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/analytics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startInput = searchParams.get("start");
  const endInput = searchParams.get("end");

  const start = startInput ? new Date(startInput) : undefined;
  const end = endInput ? new Date(endInput) : undefined;

  const analytics = await getAnalytics(start, end);
  return NextResponse.json(analytics);
}

import { NextResponse } from "next/server";
import { addDays, startOfDay } from "date-fns";
import { getWatchEvents, toCalendarEvents } from "@/lib/events";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startInput = searchParams.get("start");
  const endInput = searchParams.get("end");
  const search = searchParams.get("q") ?? undefined;
  const channel = searchParams.get("channel") ?? undefined;

  const start = startInput ? new Date(startInput) : startOfDay(new Date());
  const end = endInput ? new Date(endInput) : addDays(start, 1);

  const items = await getWatchEvents({
    start,
    end,
    search: search?.trim() || undefined,
    channel: channel?.trim() || undefined,
  });

  return NextResponse.json({
    items,
    calendarEvents: toCalendarEvents(items),
  });
}

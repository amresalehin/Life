"use client";

import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import type { JournalView } from "@/lib/types";
import { useJournalStore } from "@/lib/store";

type EventItem = {
  id: string;
  watchedAt: string;
  watchedDate: string;
  watchedHour: number;
  watchedWeekday: number;
  title: string;
  channelName: string;
  url: string;
  videoId?: string | null;
  thumbnailUrl?: string | null;
  metadata?: unknown;
  tags?: string[];
  notes?: string[];
};

type EventsResponse = {
  items: EventItem[];
  calendarEvents: Array<{ id: string; title: string; start: string; url: string }>;
};

type AnalyticsResponse = {
  totals: {
    totalWatchEvents: number;
    totalUniqueVideos: number;
    averageVideosPerDay: number;
  };
  byDay: Array<{ label: string; value: number }>;
  byHour: Array<{ label: number; value: number }>;
  topChannels: Array<{ label: string; value: number }>;
  activityByWeekday: Array<{ label: number; value: number }>;
};

const viewToCalendarView: Record<Exclude<JournalView, "timeline">, string> = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
  year: "listYear",
};

export function JournalApp() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [range, setRange] = useState(() => {
    const start = startOfDay(new Date());
    return {
      start: start.toISOString(),
      end: addDays(start, 1).toISOString(),
    };
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<unknown>(null);
  const [importMessage, setImportMessage] = useState<string>("");

  const { view, search, channel, setView, setSearch, setChannel, setSelectedDate } = useJournalStore();

  const eventsQuery = useQuery<EventsResponse>({
    queryKey: ["events", range.start, range.end, search, channel],
    queryFn: async () => {
      const params = new URLSearchParams({ start: range.start, end: range.end });
      if (search.trim()) params.set("q", search.trim());
      if (channel) params.set("channel", channel);
      const response = await fetch(`/api/events?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load events");
      }
      return response.json();
    },
  });

  const analyticsQuery = useQuery<AnalyticsResponse>({
    queryKey: ["analytics", range.start, range.end],
    queryFn: async () => {
      const params = new URLSearchParams({ start: range.start, end: range.end });
      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }
      return response.json();
    },
  });

  const previewImportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: importPayload }),
      });
      if (!response.ok) throw new Error("Preview failed");
      return response.json();
    },
    onSuccess: (result) => {
      setImportMessage(
        `Preview: ${result.validCount} valid, ${result.duplicateCount} duplicates, ${result.invalidCount} invalid`,
      );
    },
  });

  const commitImportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: importPayload, sourceName: "youtube-history.json" }),
      });
      if (!response.ok) throw new Error("Import failed");
      return response.json();
    },
    onSuccess: (result) => {
      setImportMessage(`Imported ${result.importedCount} new events (${result.duplicateCount} duplicates skipped)`);
      void eventsQuery.refetch();
      void analyticsQuery.refetch();
    },
  });

  const items = useMemo(() => eventsQuery.data?.items ?? [], [eventsQuery.data?.items]);
  const channels = useMemo(
    () => [...new Set(items.map((item) => item.channelName))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const selected = items.find((item) => item.id === selectedEventId) ?? items[0];

  const groupedTimeline = useMemo(() => {
    const grouped = new Map<string, EventItem[]>();
    for (const item of items) {
      const key = format(parseISO(item.watchedDate), "yyyy-MM-dd");
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(item);
    }
    return [...grouped.entries()].sort((a, b) => (a[0] > b[0] ? -1 : 1));
  }, [items]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 p-4">
        <h1 className="text-xl font-semibold">YouTube Watch History Life Journal</h1>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[320px_1fr_420px]">
        <aside className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Import watch history JSON</p>
            <input
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const raw = await file.text();
                setImportPayload(JSON.parse(raw));
                setImportMessage(`Loaded ${file.name}`);
              }}
              className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600 disabled:opacity-50"
                disabled={!importPayload || previewImportMutation.isPending}
                onClick={() => previewImportMutation.mutate()}
              >
                Preview
              </button>
              <button
                type="button"
                className="rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
                disabled={!importPayload || commitImportMutation.isPending}
                onClick={() => commitImportMutation.mutate()}
              >
                Import
              </button>
            </div>
            {importMessage ? <p className="text-xs text-zinc-300">{importMessage}</p> : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Global search</p>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, channel, URL"
              className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Channel filter</p>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
            >
              <option value="">All channels</option>
              {channels.map((itemChannel) => (
                <option key={itemChannel} value={itemChannel}>
                  {itemChannel}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Views</p>
            <div className="grid grid-cols-2 gap-2">
              {(["day", "week", "month", "year", "timeline"] as JournalView[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded px-3 py-2 text-sm capitalize ${
                    option === view ? "bg-blue-600" : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                  onClick={() => {
                    setView(option);
                    if (option !== "timeline") {
                      const api = calendarRef.current?.getApi();
                      api?.changeView(viewToCalendarView[option]);
                    }
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Analytics</p>
            {analyticsQuery.data ? (
              <div className="space-y-2 text-xs text-zinc-300">
                <p>Total watch events: {analyticsQuery.data.totals.totalWatchEvents}</p>
                <p>Unique videos: {analyticsQuery.data.totals.totalUniqueVideos}</p>
                <p>Average/day: {analyticsQuery.data.totals.averageVideosPerDay}</p>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">Loading analytics...</p>
            )}
          </div>
        </aside>

        <main className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          {view === "timeline" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Timeline</h2>
              {groupedTimeline.length === 0 ? (
                <p className="text-sm text-zinc-400">No events for current filters.</p>
              ) : (
                groupedTimeline.map(([dateKey, group]) => (
                  <section key={dateKey}>
                    <h3 className="mb-2 text-sm font-semibold text-zinc-300">{dateKey}</h3>
                    <div className="space-y-2">
                      {group.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedEventId(item.id)}
                          className="flex w-full items-center justify-between rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-left hover:border-zinc-600"
                        >
                          <span className="truncate pr-3 text-sm">{item.title}</span>
                          <span className="text-xs text-zinc-400">{format(parseISO(item.watchedAt), "p")}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={viewToCalendarView.day}
              events={eventsQuery.data?.calendarEvents ?? []}
              eventClick={(event) => {
                event.jsEvent.preventDefault();
                setSelectedEventId(event.event.id);
              }}
              datesSet={(info) => {
                setRange({ start: info.start.toISOString(), end: info.end.toISOString() });
                setSelectedDate(info.start.toISOString());
              }}
              height={560}
            />
          )}

          {items.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {items.slice(0, 18).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`rounded-lg border p-3 text-left transition ${
                    item.id === selected?.id
                      ? "border-blue-500 bg-zinc-800"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
                  }`}
                  onClick={() => setSelectedEventId(item.id)}
                >
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="mb-2 h-28 w-full rounded object-cover"
                    />
                  ) : null}
                  <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">{item.channelName}</p>
                  <p className="mt-1 text-xs text-zinc-500">{format(parseISO(item.watchedAt), "PPpp")}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No videos matched the current range or filters.</p>
          )}

          {analyticsQuery.data ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-64 rounded border border-zinc-800 bg-zinc-950 p-2">
                <p className="mb-2 text-xs text-zinc-300">Watch trend by day</p>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={analyticsQuery.data.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" hide />
                    <YAxis />
                    <Tooltip />
                    <Line dataKey="value" stroke="#3b82f6" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64 rounded border border-zinc-800 bg-zinc-950 p-2">
                <p className="mb-2 text-xs text-zinc-300">Top channels</p>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={analyticsQuery.data.topChannels}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </main>

        <aside className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Video detail</h2>
          {selected ? (
            <div className="space-y-3">
              {selected.videoId ? (
                <iframe
                  className="h-56 w-full rounded"
                  src={`https://www.youtube.com/embed/${selected.videoId}`}
                  title={selected.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
              <h3 className="text-sm font-semibold">{selected.title}</h3>
              <p className="text-xs text-zinc-300">{selected.channelName}</p>
              <p className="text-xs text-zinc-400">Watched {format(parseISO(selected.watchedAt), "PPpp")}</p>
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded bg-blue-600 px-3 py-2 text-xs hover:bg-blue-500"
              >
                Open on YouTube
              </a>
              {selected.tags?.length ? (
                <div>
                  <p className="text-xs text-zinc-400">Tags</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="rounded bg-zinc-800 px-2 py-1 text-[11px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Select a video card to view details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

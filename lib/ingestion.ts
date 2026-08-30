import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ImportPreviewResult, WatchCard } from "@/lib/types";

const subtitleSchema = z.object({
  name: z.string().optional(),
  url: z.string().optional(),
});

const rawEntrySchema = z
  .object({
    title: z.string().optional(),
    titleUrl: z.string().optional(),
    url: z.string().optional(),
    time: z.string().optional(),
    details: z.array(z.unknown()).optional(),
    subtitles: z.array(subtitleSchema).optional(),
  })
  .passthrough();

export type NormalizedWatchEvent = {
  sourceEventHash: string;
  watchedAt: Date;
  watchedDate: Date;
  watchedHour: number;
  watchedWeekday: number;
  title: string;
  url: string;
  videoId?: string;
  channelName: string;
  channelExternalId?: string;
  channelUrl?: string;
  thumbnailUrl?: string;
  rawMetadataJson: Prisma.InputJsonValue;
  rawEventJson: Prisma.InputJsonValue;
};

const normalizeTitle = (title?: string) => {
  if (!title) return "Untitled";
  return title.replace(/^Watched\s+/i, "").trim() || "Untitled";
};

const extractVideoId = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || undefined;
    }
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) return fromQuery;
    const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);
    if (shorts?.[1]) return shorts[1];
  } catch {
    return undefined;
  }
  return undefined;
};

const deriveThumbnailUrl = (videoId?: string) =>
  videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;

const dayFloor = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const hashEvent = (parts: string[]) =>
  crypto.createHash("sha256").update(parts.join("|")).digest("hex");

export function normalizeYouTubeHistoryEntries(input: unknown): {
  valid: NormalizedWatchEvent[];
  errors: string[];
  recordCount: number;
} {
  const array = Array.isArray(input)
    ? input
    : Array.isArray((input as { watchHistory?: unknown[] })?.watchHistory)
      ? (input as { watchHistory: unknown[] }).watchHistory
      : [];

  const valid: NormalizedWatchEvent[] = [];
  const errors: string[] = [];

  array.forEach((entry, index) => {
    const parsed = rawEntrySchema.safeParse(entry);
    if (!parsed.success) {
      errors.push(`Entry ${index}: malformed object`);
      return;
    }

    const raw = parsed.data;
    const watchedAt = raw.time ? new Date(raw.time) : undefined;
    if (!watchedAt || Number.isNaN(watchedAt.getTime())) {
      errors.push(`Entry ${index}: missing/invalid time`);
      return;
    }

    const url = raw.titleUrl ?? raw.url;
    if (!url) {
      errors.push(`Entry ${index}: missing video URL`);
      return;
    }

    const title = normalizeTitle(raw.title);
    const subtitle = raw.subtitles?.[0];
    const channelName = subtitle?.name?.trim() || "Unknown Channel";
    const channelUrl = subtitle?.url;
    const channelExternalId = channelUrl?.split("/").pop();
    const videoId = extractVideoId(url);
    const thumbnailUrl = deriveThumbnailUrl(videoId);

    const watchedDate = dayFloor(watchedAt);
    const sourceEventHash = hashEvent([
      videoId ?? "",
      url,
      title,
      channelName,
      watchedAt.toISOString(),
    ]);

    valid.push({
      sourceEventHash,
      watchedAt,
      watchedDate,
      watchedHour: watchedAt.getHours(),
      watchedWeekday: watchedAt.getDay(),
      title,
      url,
      videoId,
      channelName,
      channelExternalId,
      channelUrl,
      thumbnailUrl,
      rawMetadataJson: raw as Prisma.InputJsonValue,
      rawEventJson: raw as Prisma.InputJsonValue,
    });
  });

  return { valid, errors, recordCount: array.length };
}

export async function previewImport(input: unknown): Promise<ImportPreviewResult> {
  const normalized = normalizeYouTubeHistoryEntries(input);
  const hashes = normalized.valid.map((v) => v.sourceEventHash);

  const existing = hashes.length
    ? await prisma.watchEvent.findMany({
        where: { sourceEventHash: { in: hashes } },
        select: { sourceEventHash: true },
      })
    : [];

  const existingSet = new Set(existing.map((v) => v.sourceEventHash));
  const duplicateCount = normalized.valid.filter((v) => existingSet.has(v.sourceEventHash)).length;

  const sample: WatchCard[] = normalized.valid.slice(0, 20).map((v) => ({
    id: v.sourceEventHash,
    watchedAt: v.watchedAt.toISOString(),
    watchedDate: v.watchedDate.toISOString(),
    title: v.title,
    channelName: v.channelName,
    url: v.url,
    videoId: v.videoId,
    thumbnailUrl: v.thumbnailUrl,
    watchedHour: v.watchedHour,
    watchedWeekday: v.watchedWeekday,
    metadata: v.rawMetadataJson,
  }));

  return {
    recordCount: normalized.recordCount,
    validCount: normalized.valid.length,
    invalidCount: normalized.errors.length,
    duplicateCount,
    errors: normalized.errors.slice(0, 50),
    sample,
  };
}

async function ensureFtsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE VIRTUAL TABLE IF NOT EXISTS watch_event_fts USING fts5(
      watch_event_id UNINDEXED,
      title,
      channel_name,
      url,
      metadata,
      notes
    )
  `);
}

export async function upsertFtsForEvent(eventId: string) {
  await ensureFtsTable();
  await prisma.$executeRawUnsafe(
    `DELETE FROM watch_event_fts WHERE watch_event_id = ?`,
    eventId,
  );
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO watch_event_fts (watch_event_id, title, channel_name, url, metadata, notes)
    SELECT
      we.id,
      v.title,
      v.channelName,
      v.url,
      COALESCE(CAST(v.rawMetadataJson AS TEXT), ''),
      COALESCE(GROUP_CONCAT(n.content, ' '), '')
    FROM WatchEvent we
    JOIN Video v ON v.id = we.videoId
    LEFT JOIN Note n ON n.watchEventId = we.id
    WHERE we.id = ?
    GROUP BY we.id, v.title, v.channelName, v.url, v.rawMetadataJson
  `,
    eventId,
  );
}

export async function commitImport(input: unknown, sourceName = "youtube-history.json") {
  const normalized = normalizeYouTubeHistoryEntries(input);
  const hashes = normalized.valid.map((v) => v.sourceEventHash);
  const existing = hashes.length
    ? await prisma.watchEvent.findMany({
        where: { sourceEventHash: { in: hashes } },
        select: { sourceEventHash: true },
      })
    : [];
  const existingSet = new Set(existing.map((v) => v.sourceEventHash));

  const importBatch = await prisma.importBatch.create({
    data: {
      sourceName,
      recordCount: normalized.recordCount,
      validCount: normalized.valid.length,
      invalidCount: normalized.errors.length,
      duplicateCount: 0,
      notes: normalized.errors.length ? `First error: ${normalized.errors[0]}` : null,
    },
  });

  let created = 0;
  let duplicates = 0;

  for (const event of normalized.valid) {
    if (existingSet.has(event.sourceEventHash)) {
      duplicates += 1;
      continue;
    }

    const canonicalKey = (
      event.channelExternalId || event.channelName.trim().toLowerCase().replace(/\s+/g, "-")
    ).slice(0, 180);

    const channel = await prisma.channel.upsert({
      where: { canonicalKey },
      update: {
        name: event.channelName,
        canonicalUrl: event.channelUrl,
        channelId: event.channelExternalId,
      },
      create: {
        canonicalKey,
        name: event.channelName,
        canonicalUrl: event.channelUrl,
        channelId: event.channelExternalId,
      },
    });

    const video = event.videoId
      ? await prisma.video.upsert({
          where: { videoId: event.videoId },
          update: {
            title: event.title,
            channelId: channel.id,
            channelName: event.channelName,
            url: event.url,
            thumbnailUrl: event.thumbnailUrl,
            rawMetadataJson: event.rawMetadataJson,
          },
          create: {
            videoId: event.videoId,
            title: event.title,
            channelId: channel.id,
            channelName: event.channelName,
            url: event.url,
            thumbnailUrl: event.thumbnailUrl,
            rawMetadataJson: event.rawMetadataJson,
          },
        })
      : await prisma.video.create({
          data: {
            title: event.title,
            channelId: channel.id,
            channelName: event.channelName,
            url: event.url,
            thumbnailUrl: event.thumbnailUrl,
            rawMetadataJson: event.rawMetadataJson,
          },
        });

    const watchEvent = await prisma.watchEvent.create({
      data: {
        sourceEventHash: event.sourceEventHash,
        videoId: video.id,
        watchedAt: event.watchedAt,
        watchedDate: event.watchedDate,
        watchedHour: event.watchedHour,
        watchedWeekday: event.watchedWeekday,
        importBatchId: importBatch.id,
        rawEventJson: event.rawEventJson,
      },
      select: { id: true },
    });

    await upsertFtsForEvent(watchEvent.id);
    created += 1;
  }

  await prisma.importBatch.update({
    where: { id: importBatch.id },
    data: { duplicateCount: duplicates },
  });

  return {
    importBatchId: importBatch.id,
    recordCount: normalized.recordCount,
    validCount: normalized.valid.length,
    invalidCount: normalized.errors.length,
    duplicateCount: duplicates,
    importedCount: created,
    errors: normalized.errors.slice(0, 50),
  };
}

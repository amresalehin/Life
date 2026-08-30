import crypto from "node:crypto";
import JSZip from "jszip";
import { Prisma } from "@prisma/client";
import { load } from "cheerio";
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

const importFileSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  contentBase64: z.string().min(1),
});

const importEnvelopeSchema = z
  .object({
    data: z.unknown().optional(),
    file: importFileSchema.optional(),
    sourceName: z.string().optional(),
  })
  .partial();

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

function parseFirstDate(text: string): Date | undefined {
  const normalized = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/,
    /\b[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M(?:\s+[A-Z]{2,4})?\b/,
    /\b[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s+[AP]M\b/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match?.[0]) continue;
    const parsed = new Date(match[0]);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const tokens = normalized
    .split(/[\n|]/)
    .map((token) => token.trim())
    .filter(Boolean);
  for (const token of tokens) {
    const parsed = new Date(token);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return undefined;
}

function decodeHtmlEntities(input: string) {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function htmlToWatchHistoryEntries(html: string) {
  const $ = load(html);
  const rows: Array<Record<string, unknown>> = [];

  $("a[href*='youtube.com/watch'], a[href*='youtu.be/'], a[href*='youtube.com/shorts/']").each((_, el) => {
    const videoAnchor = $(el);
    const titleUrl = videoAnchor.attr("href")?.trim();
    const titleText = videoAnchor.text().trim();
    if (!titleUrl || !titleText) return;

    const container = videoAnchor.closest("div, li, tr, section, article");
    const channelAnchor = container
      .find("a[href*='youtube.com/channel/'], a[href*='youtube.com/@'], a[href*='youtube.com/c/'], a[href*='youtube.com/user/']")
      .first();

    const channelName = channelAnchor.text().trim() || "Unknown Channel";
    const channelUrl = channelAnchor.attr("href")?.trim();
    const watchedAt = parseFirstDate(container.text());
    if (!watchedAt) return;

    rows.push({
      title: `Watched ${decodeHtmlEntities(titleText)}`,
      titleUrl,
      time: watchedAt.toISOString(),
      subtitles: [{ name: decodeHtmlEntities(channelName), url: channelUrl }],
      sourceFormat: "html",
    });
  });

  return rows;
}

async function parseZipInput(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir);

  const preferredJson = names.find((name) => /watch-history.*\.json$/i.test(name));
  const anyJson = preferredJson ?? names.find((name) => name.toLowerCase().endsWith(".json"));
  if (anyJson) {
    const text = await zip.files[anyJson].async("text");
    return { data: JSON.parse(text), sourceName: anyJson };
  }

  const preferredHtml = names.find((name) => /watch-history.*\.html?$/i.test(name));
  const anyHtml = preferredHtml ?? names.find((name) => /\.html?$/i.test(name));
  if (anyHtml) {
    const html = await zip.files[anyHtml].async("text");
    return { data: htmlToWatchHistoryEntries(html), sourceName: anyHtml };
  }

  throw new Error("No watch-history JSON or HTML file found inside ZIP");
}

async function resolveImportInput(input: unknown, fallbackName?: string) {
  const parsedEnvelope = importEnvelopeSchema.safeParse(input);

  if (parsedEnvelope.success && parsedEnvelope.data.file) {
    const file = parsedEnvelope.data.file;
    const fileName = file.fileName;
    const lower = fileName.toLowerCase();
    const buffer = Buffer.from(file.contentBase64, "base64");

    if (lower.endsWith(".zip") || file.mimeType?.includes("zip")) {
      const parsedZip = await parseZipInput(buffer);
      return {
        data: parsedZip.data,
        sourceName: parsedEnvelope.data.sourceName ?? parsedZip.sourceName,
      };
    }

    const text = buffer.toString("utf8");

    if (lower.endsWith(".html") || lower.endsWith(".htm") || file.mimeType?.includes("html")) {
      return {
        data: htmlToWatchHistoryEntries(text),
        sourceName: parsedEnvelope.data.sourceName ?? fileName,
      };
    }

    if (lower.endsWith(".json") || file.mimeType?.includes("json")) {
      return {
        data: JSON.parse(text),
        sourceName: parsedEnvelope.data.sourceName ?? fileName,
      };
    }

    try {
      return {
        data: JSON.parse(text),
        sourceName: parsedEnvelope.data.sourceName ?? fileName,
      };
    } catch {
      return {
        data: htmlToWatchHistoryEntries(text),
        sourceName: parsedEnvelope.data.sourceName ?? fileName,
      };
    }
  }

  if (parsedEnvelope.success && parsedEnvelope.data.data !== undefined) {
    return {
      data: parsedEnvelope.data.data,
      sourceName: parsedEnvelope.data.sourceName ?? fallbackName ?? "youtube-history.json",
    };
  }

  return {
    data: input,
    sourceName: fallbackName ?? "youtube-history.json",
  };
}

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
  const resolved = await resolveImportInput(input);
  const normalized = normalizeYouTubeHistoryEntries(resolved.data);
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
  const resolved = await resolveImportInput(input, sourceName);
  const normalized = normalizeYouTubeHistoryEntries(resolved.data);
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
      sourceName: resolved.sourceName,
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

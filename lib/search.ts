import { prisma } from "@/lib/prisma";

export async function searchWatchHistory(query: string, limit = 100) {
  const clean = query.trim();

  if (!clean) {
    const recent = await prisma.watchEvent.findMany({
      take: limit,
      orderBy: { watchedAt: "desc" },
      include: { video: true },
    });

    return recent.map((item) => ({
      id: item.id,
      watchedAt: item.watchedAt.toISOString(),
      watchedDate: item.watchedDate.toISOString(),
      watchedHour: item.watchedHour,
      watchedWeekday: item.watchedWeekday,
      title: item.video.title,
      channelName: item.video.channelName,
      url: item.video.url,
      videoId: item.video.videoId,
      thumbnailUrl: item.video.thumbnailUrl,
      metadata: item.video.rawMetadataJson,
    }));
  }

  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT
        we.id,
        we.watchedAt,
        we.watchedDate,
        we.watchedHour,
        we.watchedWeekday,
        v.title,
        v.channelName,
        v.url,
        v.videoId,
        v.thumbnailUrl,
        v.rawMetadataJson
      FROM watch_event_fts f
      JOIN WatchEvent we ON we.id = f.watch_event_id
      JOIN Video v ON v.id = we.videoId
      WHERE watch_event_fts MATCH ?
      ORDER BY we.watchedAt DESC
      LIMIT ?
    `,
      clean,
      limit,
    )) as Array<{
      id: string;
      watchedAt: string;
      watchedDate: string;
      watchedHour: number;
      watchedWeekday: number;
      title: string;
      channelName: string;
      url: string;
      videoId: string | null;
      thumbnailUrl: string | null;
      rawMetadataJson: string | null;
    }>;

    return rows.map((row) => ({
      ...row,
      metadata: row.rawMetadataJson,
    }));
  } catch {
    const fallback = await prisma.watchEvent.findMany({
      where: {
        OR: [
          { video: { title: { contains: clean } } },
          { video: { channelName: { contains: clean } } },
          { video: { url: { contains: clean } } },
        ],
      },
      include: { video: true },
      take: limit,
      orderBy: { watchedAt: "desc" },
    });

    return fallback.map((item) => ({
      id: item.id,
      watchedAt: item.watchedAt.toISOString(),
      watchedDate: item.watchedDate.toISOString(),
      watchedHour: item.watchedHour,
      watchedWeekday: item.watchedWeekday,
      title: item.video.title,
      channelName: item.video.channelName,
      url: item.video.url,
      videoId: item.video.videoId,
      thumbnailUrl: item.video.thumbnailUrl,
      metadata: item.video.rawMetadataJson,
    }));
  }
}

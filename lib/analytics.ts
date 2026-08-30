import { prisma } from "@/lib/prisma";

export async function getAnalytics(start?: Date, end?: Date) {
  const dateFilter = {
    watchedAt: {
      gte: start,
      lt: end,
    },
  };

  const totalVideosWatched = await prisma.watchEvent.count({ where: dateFilter });
  const uniqueVideos = await prisma.watchEvent.findMany({
    where: dateFilter,
    distinct: ["videoId"],
    select: { videoId: true },
  });

  const byDay = (await prisma.$queryRawUnsafe(
    `
      SELECT DATE(watchedAt) AS label, COUNT(*) AS value
      FROM WatchEvent
      WHERE (? IS NULL OR watchedAt >= ?) AND (? IS NULL OR watchedAt < ?)
      GROUP BY DATE(watchedAt)
      ORDER BY DATE(watchedAt)
    `,
    start?.toISOString() ?? null,
    start?.toISOString() ?? null,
    end?.toISOString() ?? null,
    end?.toISOString() ?? null,
  )) as Array<{ label: string; value: number }>;

  const byHour = (await prisma.$queryRawUnsafe(
    `
      SELECT watchedHour AS label, COUNT(*) AS value
      FROM WatchEvent
      WHERE (? IS NULL OR watchedAt >= ?) AND (? IS NULL OR watchedAt < ?)
      GROUP BY watchedHour
      ORDER BY watchedHour
    `,
    start?.toISOString() ?? null,
    start?.toISOString() ?? null,
    end?.toISOString() ?? null,
    end?.toISOString() ?? null,
  )) as Array<{ label: number; value: number }>;

  const topChannels = (await prisma.$queryRawUnsafe(
    `
      SELECT v.channelName AS label, COUNT(*) AS value
      FROM WatchEvent we
      JOIN Video v ON v.id = we.videoId
      WHERE (? IS NULL OR we.watchedAt >= ?) AND (? IS NULL OR we.watchedAt < ?)
      GROUP BY v.channelName
      ORDER BY value DESC
      LIMIT 10
    `,
    start?.toISOString() ?? null,
    start?.toISOString() ?? null,
    end?.toISOString() ?? null,
    end?.toISOString() ?? null,
  )) as Array<{ label: string; value: number }>;

  const activityByWeekday = (await prisma.$queryRawUnsafe(
    `
      SELECT watchedWeekday AS label, COUNT(*) AS value
      FROM WatchEvent
      WHERE (? IS NULL OR watchedAt >= ?) AND (? IS NULL OR watchedAt < ?)
      GROUP BY watchedWeekday
      ORDER BY watchedWeekday
    `,
    start?.toISOString() ?? null,
    start?.toISOString() ?? null,
    end?.toISOString() ?? null,
    end?.toISOString() ?? null,
  )) as Array<{ label: number; value: number }>;

  const averageVideosPerDay =
    byDay.length === 0
      ? 0
      : Number((byDay.reduce((acc, curr) => acc + Number(curr.value), 0) / byDay.length).toFixed(2));

  return {
    totals: {
      totalWatchEvents: totalVideosWatched,
      totalUniqueVideos: uniqueVideos.length,
      averageVideosPerDay,
    },
    byDay,
    byHour,
    topChannels,
    activityByWeekday,
  };
}

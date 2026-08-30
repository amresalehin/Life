import { prisma } from "@/lib/prisma";

export type EventQueryInput = {
  start?: Date;
  end?: Date;
  search?: string;
  channel?: string;
};

export async function getWatchEvents(input: EventQueryInput) {
  const where = {
    watchedAt: {
      gte: input.start,
      lt: input.end,
    },
    ...(input.search
      ? {
          OR: [
            { video: { title: { contains: input.search } } },
            { video: { channelName: { contains: input.search } } },
            { video: { url: { contains: input.search } } },
          ],
        }
      : {}),
    ...(input.channel ? { video: { channelName: input.channel } } : {}),
  };

  const records = await prisma.watchEvent.findMany({
    where,
    include: {
      video: true,
      favorite: true,
      tags: { include: { tag: true } },
      notes: true,
    },
    orderBy: { watchedAt: "desc" },
    take: 1000,
  });

  return records.map((item) => ({
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
    isFavorite: Boolean(item.favorite),
    tags: item.tags.map((tagLink) => tagLink.tag.name),
    notes: item.notes.map((n) => n.content),
  }));
}

export function toCalendarEvents(items: Awaited<ReturnType<typeof getWatchEvents>>) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    start: item.watchedAt,
    url: item.url,
    extendedProps: {
      channel: item.channelName,
      videoId: item.videoId,
      thumbnailUrl: item.thumbnailUrl,
      watchedAt: item.watchedAt,
    },
  }));
}

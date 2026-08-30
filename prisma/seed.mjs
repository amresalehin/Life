import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sourceEventHash = "sample-seed-event-hash";
  const existing = await prisma.watchEvent.findUnique({ where: { sourceEventHash } });
  if (existing) {
    console.log("Seed sample already exists");
    return;
  }

  const channel = await prisma.channel.upsert({
    where: { canonicalKey: "sample-channel" },
    update: {},
    create: {
      canonicalKey: "sample-channel",
      name: "Sample Channel",
      channelId: "UC_SAMPLE",
      canonicalUrl: "https://www.youtube.com/channel/UC_SAMPLE",
    },
  });

  const video = await prisma.video.upsert({
    where: { videoId: "sampleVideoId123" },
    update: {},
    create: {
      videoId: "sampleVideoId123",
      url: "https://www.youtube.com/watch?v=sampleVideoId123",
      title: "Sample Imported Video",
      channelName: channel.name,
      channelId: channel.id,
      thumbnailUrl: "https://i.ytimg.com/vi/sampleVideoId123/hqdefault.jpg",
      rawMetadataJson: { seeded: true },
    },
  });

  const watchedAt = new Date();
  const watchedDate = new Date(watchedAt);
  watchedDate.setHours(0, 0, 0, 0);

  await prisma.watchEvent.create({
    data: {
      sourceEventHash,
      videoId: video.id,
      watchedAt,
      watchedDate,
      watchedHour: watchedAt.getHours(),
      watchedWeekday: watchedAt.getDay(),
      rawEventJson: { seeded: true },
    },
  });

  console.log("Seed sample inserted");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

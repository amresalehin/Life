-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT,
    "canonicalKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channelId" TEXT,
    "channelName" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "publishedAt" DATETIME,
    "thumbnailUrl" TEXT,
    "rawMetadataJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Video_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceName" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordCount" INTEGER NOT NULL,
    "validCount" INTEGER NOT NULL,
    "invalidCount" INTEGER NOT NULL,
    "duplicateCount" INTEGER NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "WatchEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceEventHash" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "watchedAt" DATETIME NOT NULL,
    "watchedDate" DATETIME NOT NULL,
    "watchedHour" INTEGER NOT NULL,
    "watchedWeekday" INTEGER NOT NULL,
    "importBatchId" TEXT,
    "rawEventJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchEvent_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WatchEvent_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EventTag" (
    "watchEventId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("watchEventId", "tagId"),
    CONSTRAINT "EventTag_watchEventId_fkey" FOREIGN KEY ("watchEventId") REFERENCES "WatchEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watchEventId" TEXT,
    "noteDate" DATETIME,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_watchEventId_fkey" FOREIGN KEY ("watchEventId") REFERENCES "WatchEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watchEventId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_watchEventId_fkey" FOREIGN KEY ("watchEventId") REFERENCES "WatchEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "filterJson" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Channel_channelId_key" ON "Channel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_canonicalKey_key" ON "Channel"("canonicalKey");

-- CreateIndex
CREATE INDEX "Channel_name_idx" ON "Channel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Video_videoId_key" ON "Video"("videoId");

-- CreateIndex
CREATE INDEX "Video_title_idx" ON "Video"("title");

-- CreateIndex
CREATE INDEX "Video_channelName_idx" ON "Video"("channelName");

-- CreateIndex
CREATE UNIQUE INDEX "WatchEvent_sourceEventHash_key" ON "WatchEvent"("sourceEventHash");

-- CreateIndex
CREATE INDEX "WatchEvent_watchedAt_idx" ON "WatchEvent"("watchedAt");

-- CreateIndex
CREATE INDEX "WatchEvent_watchedDate_idx" ON "WatchEvent"("watchedDate");

-- CreateIndex
CREATE INDEX "WatchEvent_watchedHour_idx" ON "WatchEvent"("watchedHour");

-- CreateIndex
CREATE INDEX "WatchEvent_watchedWeekday_idx" ON "WatchEvent"("watchedWeekday");

-- CreateIndex
CREATE INDEX "WatchEvent_videoId_idx" ON "WatchEvent"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Note_noteDate_idx" ON "Note"("noteDate");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_watchEventId_key" ON "Favorite"("watchEventId");

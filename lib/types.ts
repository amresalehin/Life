export type JournalView = "day" | "week" | "month" | "year" | "timeline";

export type WatchCard = {
  id: string;
  watchedAt: string;
  watchedDate: string;
  title: string;
  channelName: string;
  url: string;
  videoId?: string | null;
  thumbnailUrl?: string | null;
  watchedHour: number;
  watchedWeekday: number;
  metadata?: unknown;
};

export type ImportPreviewResult = {
  recordCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  errors: string[];
  sample: WatchCard[];
};

import { create } from "zustand";
import type { JournalView } from "@/lib/types";

type JournalState = {
  view: JournalView;
  search: string;
  channel: string;
  selectedDate: string;
  setView: (view: JournalView) => void;
  setSearch: (search: string) => void;
  setChannel: (channel: string) => void;
  setSelectedDate: (date: string) => void;
};

export const useJournalStore = create<JournalState>((set) => ({
  view: "day",
  search: "",
  channel: "",
  selectedDate: new Date().toISOString(),
  setView: (view) => set({ view }),
  setSearch: (search) => set({ search }),
  setChannel: (channel) => set({ channel }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
}));

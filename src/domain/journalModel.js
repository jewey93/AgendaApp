/**
 * DOMAIN LAYER — Journal model
 * ------------------------------------------------------------------
 * A journal entry is deliberately simpler than a task: just text tied
 * to a date, with optional tags. Multiple entries per day are allowed
 * (unlike the single "daily notes" field on the Daily planner) so this
 * can hold quick timestamped thoughts throughout the day, not just one
 * end-of-day block.
 * ------------------------------------------------------------------
 */
import { generateId } from "./id.js";

export function createJournalEntry(partial = {}) {
  return {
    id: partial.id || generateId(),
    date: partial.date || new Date().toISOString().slice(0, 10),
    text: (partial.text || "").trim(),
    tags: partial.tags || [],
    createdAt: partial.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}

export function entriesForDate(entries, iso) {
  return entries.filter((e) => e.date === iso);
}

export function sortByRecency(entries) {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt);
}

export function searchJournal(entries, query) {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => e.text.toLowerCase().includes(q) || e.tags.join(" ").toLowerCase().includes(q));
}

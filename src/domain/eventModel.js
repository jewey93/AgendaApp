/**
 * DOMAIN LAYER — Event model
 * ------------------------------------------------------------------
 * Separate from Task on purpose: an event has a date RANGE
 * (startDate/endDate) rather than a single date, and no completion
 * state — it's something that happens, not something you check off.
 * This is what lets the Monthly view render multi-day spanning bars.
 *
 * colorToken is one of a small fixed set of theme tokens (not a raw
 * hex value) so the UI layer decides what "accent" actually looks
 * like — same separation of concerns as CATEGORY_VISUALS.
 * ------------------------------------------------------------------
 */
import { generateId } from "./id.js";

export const EVENT_COLOR_TOKENS = ["primary", "secondary", "accent", "warning", "danger"];

export function createEvent(partial = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const rawStart = partial.startDate || today;
  const rawEnd = partial.endDate || rawStart;
  const [startDate, endDate] = rawStart <= rawEnd ? [rawStart, rawEnd] : [rawEnd, rawStart];
  return {
    id: partial.id || generateId(),
    title: (partial.title || "").trim() || "Untitled event",
    startDate,
    endDate,
    colorToken: EVENT_COLOR_TOKENS.includes(partial.colorToken) ? partial.colorToken : "primary",
  };
}

export function eventsOnDate(events, iso) {
  return events.filter((e) => e.startDate <= iso && iso <= e.endDate);
}

export function eventsTouchingMonth(events, monthPrefix) {
  const monthStart = `${monthPrefix}-01`;
  const monthEnd = `${monthPrefix}-31`;
  return events.filter((e) => e.startDate <= monthEnd && e.endDate >= monthStart);
}

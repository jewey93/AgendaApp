/**
 * DOMAIN LAYER — Date utilities
 * ------------------------------------------------------------------
 * Pure functions only: given an input, always return the same output,
 * with no side effects (no reading state, no touching the DOM, no
 * network calls). That's what makes "domain" code valuable — you can
 * test it, reuse it, and reason about it without booting up React or
 * a database.
 *
 * Nothing in this file imports React, Supabase, or anything from
 * src/ui or src/data. If you ever find yourself wanting to import
 * `useState` here, that's a signal the logic belongs in src/state
 * instead.
 * ------------------------------------------------------------------
 */

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const startOfWeek = (iso) => {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

export const monthKey = (iso) => iso.slice(0, 7);

export const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export const weekLabel = (weekStartIso) =>
  `${new Date(weekStartIso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(
    addDays(weekStartIso, 6) + "T00:00:00"
  ).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

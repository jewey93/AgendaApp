/**
 * DATA LAYER — Agenda repository
 * ------------------------------------------------------------------
 * The only file that knows the on-disk shape of your data. Everything
 * above it (src/state) just calls loadAgendaData()/saveAgendaData() with
 * plain JavaScript objects and has no idea Supabase exists.
 *
 * Data is stored as JSON (serialized to a string) in Supabase, protected
 * by the account login, TLS in transit, Supabase's encryption-at-rest,
 * and Row-Level Security (a user can only ever read/write their own rows
 * — enforced by Postgres, see supabase/schema.sql). This is the same
 * security model mainstream productivity apps use; there is no separate
 * encryption passphrase to remember.
 *
 * IMPORTANT — why we JSON.stringify/parse here:
 * The app_storage.value column is TEXT (it originally held encrypted
 * ciphertext strings). A raw JavaScript object does NOT round-trip through
 * a text column — it comes back out as a string — so storing an object
 * directly made every load look like "no data," which silently reseeded
 * and overwrote real tasks. We therefore always persist a string and parse
 * it back on read.
 * ------------------------------------------------------------------
 */
import { storage } from "./storage.js";

const STORAGE_KEY = "agenda:v1";

/**
 * A unique id for THIS browser tab/session. We stamp every save with it so
 * that when a write echoes back over Realtime we can recognize our own write
 * and ignore it — only writes made somewhere else (another device or tab)
 * should trigger a live refresh. It's stored under `__writer` inside the
 * saved JSON and stripped out again on load so it never reaches app state.
 */
export const CLIENT_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

function stripMeta(obj) {
  if (obj && typeof obj === "object" && "__writer" in obj) {
    const { __writer, ...rest } = obj;
    return rest;
  }
  return obj;
}

// Parse a stored TEXT value into an agenda object, or null if it isn't one.
// Shared by loadAgendaData and the Realtime handler.
function parseStored(v) {
  if (v && typeof v === "object") return stripMeta(v);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object") return stripMeta(parsed);
      return null;
    } catch {
      // Not valid JSON — legacy ciphertext from the old end-to-end-encrypted
      // scheme, which we can no longer read. Treat as "no data".
      return null;
    }
  }
  return null;
}

export async function loadAgendaData() {
  const res = await storage.get(STORAGE_KEY, false);
  if (!res) return null;
  return parseStored(res.value);
}

export async function saveAgendaData(data) {
  // Serialize to a string so it matches the TEXT column and round-trips
  // reliably on the next load. `__writer` tags the write as ours.
  await storage.set(STORAGE_KEY, JSON.stringify({ ...data, __writer: CLIENT_ID }), false);
}

/**
 * Live sync. Calls `onRemoteChange(data)` whenever the agenda is written from
 * another device or tab, where `data` is the parsed agenda object. Our own
 * writes are filtered out (by the `__writer` stamp). If the change event
 * can't be read directly (e.g. the payload was too large and got truncated),
 * `onRemoteChange(undefined)` is called to signal "something changed — go
 * re-fetch." Returns an unsubscribe function.
 */
export function subscribeAgenda(onRemoteChange) {
  return storage.subscribe(STORAGE_KEY, false, (payload) => {
    const raw = payload?.new?.value;
    if (typeof raw !== "string") {
      // No usable value on the event (truncated, or a DELETE). Signal refetch.
      onRemoteChange(undefined);
      return;
    }
    let parsedRaw;
    try {
      parsedRaw = JSON.parse(raw);
    } catch {
      onRemoteChange(undefined);
      return;
    }
    if (!parsedRaw || typeof parsedRaw !== "object") return;
    if (parsedRaw.__writer === CLIENT_ID) return; // our own echo — ignore
    onRemoteChange(stripMeta(parsedRaw));
  });
}

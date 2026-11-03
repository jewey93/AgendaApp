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

export async function loadAgendaData() {
  const res = await storage.get(STORAGE_KEY, false);
  if (!res) return null;
  const v = res.value;

  // Already an object (e.g. if the column is ever migrated to jsonb, or a
  // driver hands us parsed JSON): use it directly.
  if (v && typeof v === "object") return v;

  // Normal path: the stored value is a JSON string. Parse it back.
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      // Only accept a real agenda object. A valid-JSON scalar (e.g. a bare
      // number/string) is not our shape, so treat it as no data.
      if (parsed && typeof parsed === "object") return parsed;
      return null;
    } catch {
      // Not valid JSON — this is legacy ciphertext from the old
      // end-to-end-encrypted scheme, which we can no longer read (and
      // intentionally no longer use). Treat it as "no data" so the app
      // starts fresh and overwrites it with plain JSON on the next save.
      return null;
    }
  }

  return null;
}

export async function saveAgendaData(data) {
  // Serialize to a string so it matches the TEXT column and round-trips
  // reliably on the next load.
  await storage.set(STORAGE_KEY, JSON.stringify(data), false);
}

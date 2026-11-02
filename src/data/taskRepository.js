/**
 * DATA LAYER — Agenda repository
 * ------------------------------------------------------------------
 * The only file that knows the on-disk shape of your data. Everything
 * above it (src/state) just calls loadAgendaData()/saveAgendaData() with
 * plain JavaScript objects and has no idea Supabase exists.
 *
 * Data is stored as plain JSON in Supabase, protected by the account
 * login, TLS in transit, Supabase's encryption-at-rest, and Row-Level
 * Security (a user can only ever read/write their own rows — enforced by
 * Postgres, see supabase/schema.sql). This is the same security model
 * mainstream productivity apps use; there is no separate encryption
 * passphrase to remember.
 * ------------------------------------------------------------------
 */
import { storage } from "./storage.js";

const STORAGE_KEY = "agenda:v1";

export async function loadAgendaData() {
  const res = await storage.get(STORAGE_KEY, false);
  if (!res) return null;
  const v = res.value;
  // Normal path: the stored value is the plain agenda object.
  if (v && typeof v === "object") return v;
  // A string here is legacy ciphertext from the old end-to-end-encrypted
  // scheme, which we can no longer read (and intentionally no longer use).
  // Treat it as "no data" so the app starts fresh and overwrites it with
  // plain JSON on the next save.
  return null;
}

export async function saveAgendaData(data) {
  await storage.set(STORAGE_KEY, data, false);
}

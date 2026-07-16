/**
 * DATA LAYER — Agenda repository
 * ------------------------------------------------------------------
 * The only file that knows the on-disk shape of your data — AND now,
 * the only file that knows the data is encrypted before it ever
 * reaches Supabase. Everything above this layer (src/state) still
 * just calls loadAgendaData()/saveAgendaData() and gets/sends plain
 * JavaScript objects; it has no idea Supabase exists, and it has no
 * idea encryption exists either. The encryption key is handed in as a
 * parameter — this file never generates or stores it, that's
 * EncryptionGate's job (src/EncryptionGate.jsx).
 *
 * The salt is deliberately NOT encrypted — see crypto.js for why
 * that's safe. It's stored under its own key so it can be read before
 * a passphrase is even entered (the app needs it to attempt key
 * derivation in the first place).
 * ------------------------------------------------------------------
 */
import { storage } from "./storage.js";
import { encryptJSON, decryptJSON } from "./crypto.js";

const STORAGE_KEY = "agenda:v1";
const SALT_KEY = "agenda:salt";

export async function loadSalt() {
  const res = await storage.get(SALT_KEY, false);
  return res ? res.value : null;
}

export async function saveSalt(saltBase64) {
  await storage.set(SALT_KEY, saltBase64, false);
}

export async function loadAgendaData(encryptionKey) {
  const res = await storage.get(STORAGE_KEY, false);
  if (!res) return null;
  // Throws if the key is wrong (AES-GCM's auth tag check fails) — the
  // caller is expected to treat a throw here as "incorrect passphrase."
  return decryptJSON(encryptionKey, res.value);
}

export async function saveAgendaData(data, encryptionKey) {
  const packed = await encryptJSON(encryptionKey, data);
  await storage.set(STORAGE_KEY, packed, false);
}

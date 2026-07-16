/**
 * DATA LAYER — Encryption
 * ------------------------------------------------------------------
 * Same pattern as supabaseClient.js and notifier.js: this is the one
 * file allowed to know the browser's Web Crypto API exists. Everything
 * above it calls createEncryptionKey()/encryptJSON()/decryptJSON() and
 * doesn't need to know AES-GCM, PBKDF2, or IVs exist.
 *
 * How it works, briefly:
 *   1. A passphrase (chosen by the user, never sent to any server) is
 *      stretched into a 256-bit key via PBKDF2 — a slow, deliberately
 *      expensive function that makes brute-forcing the passphrase hard
 *      even if someone got hold of the encrypted data.
 *   2. That key encrypts/decrypts the whole agenda data blob with
 *      AES-256-GCM, an authenticated cipher — meaning decryption
 *      doesn't just silently produce garbage on a wrong key, it fails
 *      loudly, which is what lets the UI show "incorrect passphrase"
 *      instead of a corrupted app.
 *   3. The "salt" used in step 1 is not secret (salts never are) — its
 *      only job is making sure two people who happen to pick the same
 *      passphrase don't end up with the same key. It's stored alongside
 *      the encrypted data.
 *
 * IMPORTANT: there is no "forgot passphrase" recovery here. That's not
 * an oversight — a recoverable passphrase would mean someone else
 * (us, Supabase, anyone with database access) could get in too, which
 * defeats the entire point. This must be communicated clearly in the
 * UI (see EncryptionGate.jsx).
 * ------------------------------------------------------------------
 */

const PBKDF2_ITERATIONS = 200_000;

function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function fromBase64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function generateSalt() {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function createEncryptionKey(passphrase, saltBase64) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromBase64(saltBase64), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // not extractable — the raw key can never be pulled back out of the browser's crypto engine
    ["encrypt", "decrypt"]
  );
}

export async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // fresh IV every encryption, required for AES-GCM safety
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return JSON.stringify({ iv: toBase64(iv), data: toBase64(ciphertext) });
}

export async function decryptJSON(key, packedString) {
  const { iv, data } = JSON.parse(packedString);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(data));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

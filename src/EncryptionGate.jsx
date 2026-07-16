/**
 * EncryptionGate
 * ------------------------------------------------------------------
 * Sits between login (AuthGate) and the app itself. Its only job is
 * to end up with a valid AES-GCM CryptoKey in memory before rendering
 * <App>. Two paths:
 *
 *   - First time ever (no salt saved yet): ask the person to CREATE a
 *     passphrase, generate a fresh salt, save the salt (not secret),
 *     derive the key.
 *   - Every time after: ask them to ENTER their passphrase, derive a
 *     key from it using the saved salt, then try an actual decrypt of
 *     their stored data to confirm the passphrase is right before
 *     handing the key to the app. A wrong passphrase makes AES-GCM's
 *     built-in authentication check fail, which is what turns into
 *     the "Incorrect passphrase" message below — no separate password
 *     check needed.
 *
 * The derived key lives only in this component's React state, which
 * only exists in memory for this browser tab. Closing the tab, or
 * logging out, throws it away — by design.
 * ------------------------------------------------------------------
 */
import React, { useState, useEffect } from "react";
import { Lock, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { loadSalt, saveSalt, loadAgendaData } from "./data/taskRepository.js";
import { generateSalt, createEncryptionKey } from "./data/crypto.js";
import App from "./App.jsx";

export default function EncryptionGate({ session, onLogout }) {
  const [phase, setPhase] = useState("checking"); // checking | setup | unlock | ready
  const [salt, setSalt] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const existing = await loadSalt();
        if (existing) { setSalt(existing); setPhase("unlock"); }
        else setPhase("setup");
      } catch (e) {
        setError("Couldn't reach your account's storage. Check your connection and refresh.");
      }
    })();
  }, []);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError("");
    if (passphrase.length < 8) return setError("Use at least 8 characters — this is the one thing standing between your notes and anyone else.");
    if (passphrase !== confirmPassphrase) return setError("Passphrases don't match.");
    setBusy(true);
    try {
      const newSalt = generateSalt();
      const key = await createEncryptionKey(passphrase, newSalt);
      await saveSalt(newSalt);
      setEncryptionKey(key);
      setPhase("ready");
    } catch (e) {
      setError("Something went wrong setting up encryption. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const key = await createEncryptionKey(passphrase, salt);
      await loadAgendaData(key); // throws if the passphrase is wrong — see crypto.js
      setEncryptionKey(key);
      setPhase("ready");
    } catch (e) {
      setError("Incorrect passphrase.");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "ready") {
    return <App session={session} onLogout={onLogout} encryptionKey={encryptionKey} />;
  }

  return (
    <div className="auth-screen">
      <style>{encryptionGateStyles}</style>
      <div className="auth-card">
        {phase === "checking" && (
          <div className="auth-loading"><Loader2 size={20} className="spin" /> Checking your account…</div>
        )}

        {phase === "setup" && (
          <>
            <div className="auth-brand"><ShieldCheck size={18} /> Set up encryption</div>
            <p className="auth-sub">Your tasks, journal, and notes will be encrypted in your browser before they're ever saved. Nobody — including us — can read them without this passphrase.</p>
            <div className="encryption-warning"><AlertTriangle size={13} /> There is no password reset for this. If you lose it, your data can't be recovered.</div>
            {error && <div className="auth-msg error">{error}</div>}
            <form onSubmit={handleSetup}>
              <label><span>Create a passphrase</span><input type="password" autoFocus required value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="At least 8 characters" /></label>
              <label><span>Confirm passphrase</span><input type="password" required value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} /></label>
              <button type="submit" disabled={busy}><Lock size={16} /> {busy ? "Setting up…" : "Encrypt and continue"}</button>
            </form>
          </>
        )}

        {phase === "unlock" && (
          <>
            <div className="auth-brand"><Lock size={18} /> Unlock your notes</div>
            <p className="auth-sub">Enter your encryption passphrase to decrypt your data for this session.</p>
            {error && <div className="auth-msg error">{error}</div>}
            <form onSubmit={handleUnlock}>
              <label><span>Passphrase</span><input type="password" autoFocus required value={passphrase} onChange={(e) => setPassphrase(e.target.value)} /></label>
              <button type="submit" disabled={busy}><Lock size={16} /> {busy ? "Unlocking…" : "Unlock"}</button>
            </form>
          </>
        )}

        {onLogout && phase !== "checking" && (
          <button className="auth-switch" onClick={onLogout}>Log out</button>
        )}
      </div>
    </div>
  );
}

const encryptionGateStyles = `
  .auth-screen { min-height:100vh; width:100%; display:flex; align-items:center; justify-content:center; background:#0F1520; font-family:'Inter', system-ui, sans-serif; color:#E8ECF1; padding: 20px; }
  .auth-loading { display:flex; align-items:center; gap:10px; color:#93A0B4; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .auth-card { background:#161E2C; border:1px solid #26314480; border-radius:16px; padding:32px 28px; width:100%; max-width:380px; box-shadow:0 20px 60px rgba(0,0,0,0.35); }
  .auth-brand { display:flex; align-items:center; gap:8px; font-weight:700; font-size:18px; color:#5B8DEF; margin-bottom:4px; }
  .auth-sub { color:#93A0B4; font-size:13px; margin-bottom:14px; line-height:1.5; }
  .encryption-warning { display:flex; align-items:flex-start; gap:8px; background:rgba(240,183,94,0.12); color:#F0B75E; border-radius:8px; padding:10px 12px; font-size:12px; line-height:1.5; margin-bottom:16px; }
  .auth-msg { font-size:12.5px; padding:8px 10px; border-radius:8px; margin-bottom:12px; }
  .auth-msg.error { background:rgba(239,111,102,0.15); color:#EF6F66; }
  .auth-card form { display:flex; flex-direction:column; gap:14px; }
  .auth-card label { display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:600; color:#93A0B4; }
  .auth-card input { border:1px solid #2A3547; border-radius:8px; padding:9px 11px; background:#1C2536; color:#E8ECF1; font-size:13.5px; outline:none; }
  .auth-card input:focus { border-color:#5B8DEF; }
  .auth-card button[type="submit"] { display:flex; align-items:center; justify-content:center; gap:7px; background:#5B8DEF; color:#fff; border:none; padding:10px 14px; border-radius:9px; font-weight:600; font-size:13.5px; cursor:pointer; margin-top:4px; }
  .auth-card button[type="submit"]:disabled { opacity:0.6; cursor:default; }
  .auth-switch { display:block; width:100%; text-align:center; background:none; border:none; color:#93A0B4; font-size:12.5px; margin-top:16px; cursor:pointer; text-decoration:underline; }
`;

/**
 * UI LAYER — SecurityModal (two-factor authentication)
 * ------------------------------------------------------------------
 * Lets the signed-in user turn on TOTP two-factor auth (Google
 * Authenticator, Authy, 1Password, etc.) or turn it off again. All the
 * Supabase MFA calls live here; the rest of the app just opens this modal.
 *
 * Enrollment flow (Supabase MFA, TOTP):
 *   1. enroll({ factorType: 'totp' })  -> gives a QR code + secret
 *   2. user scans it in their authenticator app
 *   3. challengeAndVerify({ factorId, code })  -> factor becomes 'verified'
 * An un-verified factor left behind (user bailed mid-setup) is cleaned up
 * with unenroll() so it can't block a future enrollment.
 * ------------------------------------------------------------------
 */
import React, { useEffect, useState } from "react";
import { supabase } from "../data/supabaseClient";
import { X, ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";

export default function SecurityModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState(null);      // the verified factor, if any
  const [enroll, setEnroll] = useState(null);      // { id, qr, secret, uri } during setup
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = (data?.totp || []).find((f) => f.status === "verified");
      setFactor(verified || null);
    } catch (e) {
      setError(e.message || "Couldn't load your security settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setError(""); setBusy(true);
    try {
      // Clear any half-finished (unverified) factors first so enroll won't
      // fail with "factor already exists".
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of (list?.all || list?.totp || [])) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri });
    } catch (e) {
      setError(e.message || "Couldn't start two-factor setup.");
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
      if (error) throw error;
      setEnroll(null); setCode("");
      await refresh();
    } catch (err) {
      setError(err.message || "That code didn't match. Try the current one.");
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    if (enroll) { try { await supabase.auth.mfa.unenroll({ factorId: enroll.id }); } catch {} }
    setEnroll(null); setCode(""); setError("");
  };

  const disable = async () => {
    setError(""); setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      await refresh();
    } catch (e) {
      setError(e.message || "Couldn't turn off two-factor.");
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    try { await navigator.clipboard.writeText(enroll.secret); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const isSvgMarkup = enroll && typeof enroll.qr === "string" && enroll.qr.trim().startsWith("<svg");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3><ShieldCheck size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />Two-factor authentication</h3>
          <button className="icon-btn tiny" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>

        <div className="modal-body">
          {error && <div className="auth-msg error" style={{ margin: 0 }}>{error}</div>}

          {loading ? (
            <div className="auth-loading"><Loader2 size={18} className="spin" /> Loading…</div>
          ) : enroll ? (
            <>
              <p className="sec-text">Scan this with your authenticator app (Google Authenticator, Authy, 1Password…), then enter the 6-digit code it shows.</p>
              <div className="sec-qr">
                {isSvgMarkup
                  ? <div className="sec-qr-img" dangerouslySetInnerHTML={{ __html: enroll.qr }} />
                  : <img className="sec-qr-img" src={enroll.qr} alt="Two-factor QR code" />}
              </div>
              <button type="button" className="sec-secret" onClick={copySecret} title="Copy setup key">
                <span>{enroll.secret}</span>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
              <form onSubmit={confirmEnroll}>
                <label className="field" style={{ marginBottom: 10 }}>
                  <span>6-digit code</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoFocus
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
                </label>
                <div className="modal-foot" style={{ padding: 0, border: "none" }}>
                  <button type="button" className="ghost-btn" onClick={cancelEnroll}>Cancel</button>
                  <div className="spacer" />
                  <button type="submit" className="primary-btn" disabled={busy || code.length < 6}>
                    <ShieldCheck size={15} /> {busy ? "Verifying…" : "Turn on 2FA"}
                  </button>
                </div>
              </form>
            </>
          ) : factor ? (
            <>
              <div className="sec-status on"><ShieldCheck size={16} /> Two-factor is <strong>on</strong> for this account.</div>
              <p className="sec-text">You'll enter a code from your authenticator app each time you sign in on a new device. Keep your authenticator app safe — losing it makes signing in harder.</p>
              <div className="modal-foot" style={{ padding: 0, border: "none" }}>
                <button className="ghost-btn danger" onClick={disable} disabled={busy}>
                  <ShieldOff size={15} /> {busy ? "Turning off…" : "Turn off 2FA"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="sec-status off"><ShieldOff size={16} /> Two-factor is <strong>off</strong>.</div>
              <p className="sec-text">Add a second step at sign-in using a free authenticator app. Even if someone learns your password, they can't get in without the code on your phone — the single biggest upgrade to your account's security.</p>
              <div className="modal-foot" style={{ padding: 0, border: "none" }}>
                <div className="spacer" />
                <button className="primary-btn" onClick={startEnroll} disabled={busy}>
                  <ShieldCheck size={15} /> {busy ? "Starting…" : "Set up two-factor"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

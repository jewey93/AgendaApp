import React, { useEffect, useState } from "react";
import { supabase } from "./data/supabaseClient";
import EncryptionGate from "./EncryptionGate.jsx";
import { LogIn, UserPlus, Loader2, Sparkles, KeyRound, ArrowLeft } from "lucide-react";

export default function AuthGate() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [mode, setMode] = useState("login"); // login | signup | forgot | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      // Clicking the "reset password" link in the email brings the person
      // back with a temporary recovery session and this event fires — that's
      // the signal to show the "choose a new password" form instead of the
      // normal dashboard, even though `sess` is technically truthy here.
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const clearMessages = () => { setError(""); setNotice(""); };

  const submit = async (e) => {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice("Account created. Check your email to confirm, then log in.");
        setMode("login");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const submitForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
      setNotice("If an account exists for that email, a reset link is on its way. It'll bring you back here to choose a new password.");
    } catch (err) {
      setError(err.message || "Something went wrong sending the reset email.");
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (newPassword.length < 6) return setError("Use at least 6 characters.");
    if (newPassword !== confirmNewPassword) return setError("Passwords don't match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNotice("Password updated. You're logged in.");
      setMode("login");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setError(err.message || "Something went wrong updating your password.");
    } finally {
      setBusy(false);
    }
  };

  if (session === undefined) {
    return (
      <AuthShell>
        <div className="auth-loading"><Loader2 size={22} className="spin" /> Loading…</div>
      </AuthShell>
    );
  }

  // The password-recovery link logs the person into a temporary session —
  // intercept that here regardless of the normal `!session` branch below.
  if (session && mode === "reset") {
    return (
      <AuthShell>
        <div className="auth-card">
          <div className="auth-brand"><KeyRound size={18} /> Choose a new password</div>
          <p className="auth-sub">This only changes your login password — it has no effect on your encryption passphrase.</p>
          {error && <div className="auth-msg error">{error}</div>}
          {notice && <div className="auth-msg notice">{notice}</div>}
          <form onSubmit={submitNewPassword}>
            <label>
              <span>New password</span>
              <input type="password" autoComplete="new-password" required minLength={6} autoFocus value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
            </label>
            <label>
              <span>Confirm new password</span>
              <input type="password" autoComplete="new-password" required minLength={6} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
            </label>
            <button type="submit" disabled={busy}>
              <KeyRound size={16} /> {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </AuthShell>
    );
  }

  if (!session) {
    if (mode === "forgot") {
      return (
        <AuthShell>
          <div className="auth-card">
            <div className="auth-brand"><KeyRound size={18} /> Reset your password</div>
            <p className="auth-sub">Enter your account email and we'll send a link to reset your login password.</p>
            {error && <div className="auth-msg error">{error}</div>}
            {notice && <div className="auth-msg notice">{notice}</div>}
            <form onSubmit={submitForgotPassword}>
              <label>
                <span>Email</span>
                <input type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              <button type="submit" disabled={busy}>
                <KeyRound size={16} /> {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <button className="auth-switch" onClick={() => { setMode("login"); clearMessages(); }}>
              <ArrowLeft size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} /> Back to log in
            </button>
          </div>
        </AuthShell>
      );
    }

    return (
      <AuthShell>
        <div className="auth-card">
          <div className="auth-brand"><Sparkles size={18} /> Daily Agenda</div>
          <p className="auth-sub">{mode === "login" ? "Log in to your dashboard" : "Create your account"}</p>

          {error && <div className="auth-msg error">{error}</div>}
          {notice && <div className="auth-msg notice">{notice}</div>}

          <form onSubmit={submit}>
            <label>
              <span>Email</span>
              <input type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </label>
            <button type="submit" disabled={busy}>
              {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>

          {mode === "login" && (
            <button className="auth-switch" onClick={() => { setMode("forgot"); clearMessages(); }}>
              Forgot password?
            </button>
          )}
          <button
            className="auth-switch"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); clearMessages(); }}
          >
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </AuthShell>
    );
  }

  return <EncryptionGate session={session} onLogout={() => supabase.auth.signOut()} />;
}

/**
 * Wraps every auth screen (loading / login / signup / forgot / reset) in
 * the same split layout: a brand panel with a small hand-drawn mock of
 * the app's own Today view on one side, the real form on the other. The
 * plain single-card version this replaced just said "Daily Agenda" in
 * text — nothing about it looked like a scheduling app. On narrow
 * screens the visual panel is dropped and only the form shows, so
 * mobile logins stay just as quick as before.
 */
function AuthShell({ children }) {
  return (
    <div className="auth-screen">
      <style>{authStyles}</style>
      <div className="auth-shell">
        <AuthVisual />
        <div className="auth-panel">{children}</div>
      </div>
    </div>
  );
}

function AuthVisual() {
  return (
    <div className="auth-visual">
      <div className="auth-visual-inner">
        <div className="auth-visual-brand"><Sparkles size={20} /> Daily Agenda</div>
        <p className="auth-visual-tag">Plan your day, one task at a time — capture, schedule, and check things off without losing the big picture.</p>
        <div className="auth-mock-card">
          <div className="auth-mock-head"><span>Today</span><span className="auth-mock-date">Sat, Jul 25</span></div>
          <div className="auth-mock-row">
            <span className="auth-mock-dot" style={{ background: "#F5A25E" }} />
            <span className="auth-mock-time">07:00</span>
            <span className="auth-mock-title">30 min run</span>
          </div>
          <div className="auth-mock-row done">
            <span className="auth-mock-check">✓</span>
            <span className="auth-mock-time">09:30</span>
            <span className="auth-mock-title">Reply to emails</span>
          </div>
          <div className="auth-mock-row">
            <span className="auth-mock-dot" style={{ background: "#5B8DEF" }} />
            <span className="auth-mock-time">11:00</span>
            <span className="auth-mock-title">Ship weekly report</span>
          </div>
          <div className="auth-mock-row">
            <span className="auth-mock-dot" style={{ background: "#6FCF97" }} />
            <span className="auth-mock-time">18:00</span>
            <span className="auth-mock-title">Grocery run</span>
          </div>
          <div className="auth-mock-progress"><div className="auth-mock-progress-fill" /></div>
        </div>
      </div>
    </div>
  );
}

const authStyles = `
  .auth-screen {
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0F1520;
    font-family: 'Inter', system-ui, sans-serif;
    color: #E8ECF1;
    padding: 20px;
  }
  .auth-loading { display:flex; align-items:center; gap:10px; color:#93A0B4; padding: 32px 28px; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .auth-shell {
    display: flex;
    width: 100%;
    max-width: 900px;
    min-height: 540px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 30px 80px rgba(0,0,0,0.4);
  }
  .auth-visual {
    flex: 1 1 44%;
    background: linear-gradient(160deg, #16203a, #0F1520 70%);
    padding: 44px 40px;
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
  }
  .auth-visual::before {
    content: "";
    position: absolute;
    top: -60px; right: -60px;
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(91,141,239,0.25), transparent 70%);
  }
  .auth-visual-inner { position: relative; z-index: 1; width: 100%; }
  .auth-visual-brand { display:flex; align-items:center; gap:8px; font-weight:700; font-size:19px; color:#F5A25E; margin-bottom:10px; }
  .auth-visual-tag { color:#93A0B4; font-size:13.5px; margin-bottom:26px; max-width:280px; line-height:1.55; }
  .auth-mock-card {
    background: #161E2C;
    border: 1px solid #26314480;
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: 0 16px 36px rgba(0,0,0,0.35);
    max-width: 300px;
  }
  .auth-mock-head { display:flex; justify-content:space-between; align-items:baseline; font-weight:700; font-size:13px; margin-bottom:10px; color:#E8ECF1; }
  .auth-mock-date { color:#93A0B4; font-weight:500; font-size:11.5px; }
  .auth-mock-row { display:flex; align-items:center; gap:8px; padding:7px 0; font-size:12px; border-top:1px solid #22304480; }
  .auth-mock-row:first-of-type { border-top:none; }
  .auth-mock-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .auth-mock-check {
    width:14px; height:14px; border-radius:5px; background:#3FBF8C; color:#0F1520;
    font-size:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-weight:700;
  }
  .auth-mock-time { color:#93A0B4; font-family: ui-monospace, 'Courier New', monospace; font-size:11px; width:38px; flex-shrink:0; }
  .auth-mock-title { color:#E8ECF1; }
  .auth-mock-row.done .auth-mock-title { color:#93A0B4; text-decoration: line-through; }
  .auth-mock-progress { height:5px; background:#1C2536; border-radius:4px; overflow:hidden; margin-top:12px; }
  .auth-mock-progress-fill { height:100%; width:45%; background:#5B8DEF; }

  .auth-panel {
    flex: 1 1 56%;
    background: #161E2C;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 32px;
  }
  .auth-panel .auth-card { box-shadow: none; border: none; }
  .auth-panel .auth-loading { padding: 0; }

  @media (max-width: 760px) {
    .auth-visual { display: none; }
    .auth-shell { box-shadow: none; border-radius: 0; min-height: auto; max-width: 400px; }
    .auth-panel { background: transparent; padding: 0; }
    .auth-panel .auth-card { box-shadow: 0 20px 60px rgba(0,0,0,0.35); border: 1px solid #26314480; }
  }

  .auth-card {
    background: #161E2C;
    border: 1px solid #26314480;
    border-radius: 16px;
    padding: 32px 28px;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  }
  .auth-brand { display:flex; align-items:center; gap:8px; font-weight:700; font-size:18px; color:#F5A25E; margin-bottom:4px; }
  .auth-sub { color:#93A0B4; font-size:13px; margin-bottom:18px; line-height:1.5; }
  .auth-msg { font-size:12.5px; padding:8px 10px; border-radius:8px; margin-bottom:12px; }
  .auth-msg.error { background: rgba(239,111,102,0.15); color:#EF6F66; }
  .auth-msg.notice { background: rgba(63,191,140,0.15); color:#3FBF8C; }
  .auth-card form { display:flex; flex-direction:column; gap:14px; }
  .auth-card label { display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:600; color:#93A0B4; }
  .auth-card input {
    border:1px solid #2A3547; border-radius:8px; padding:9px 11px;
    background:#1C2536; color:#E8ECF1; font-size:13.5px; outline:none;
  }
  .auth-card input:focus { border-color:#5B8DEF; }
  .auth-card button[type="submit"] {
    display:flex; align-items:center; justify-content:center; gap:7px;
    background:#5B8DEF; color:#fff; border:none; padding:10px 14px;
    border-radius:9px; font-weight:600; font-size:13.5px; cursor:pointer; margin-top:4px;
  }
  .auth-card button[type="submit"]:disabled { opacity:0.6; cursor:default; }
  .auth-switch {
    display:block; width:100%; text-align:center; background:none; border:none;
    color:#93A0B4; font-size:12.5px; margin-top:12px; cursor:pointer; text-decoration:underline;
  }
`;

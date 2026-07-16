/**
 * COMPOSITION ROOT — App
 * ------------------------------------------------------------------
 * This file should stay small forever. Its only job is to call the
 * state hook and hand the result to the UI shell. It's the seam
 * between "how data works" (src/state, src/domain, src/data) and
 * "how it looks" (src/ui) — and because the seam is just a function
 * call and a props object, either side can be swapped independently.
 * ------------------------------------------------------------------
 */
import React from "react";
import { useAgendaState } from "./state/useAgendaState.js";
import AppShell from "./ui/AppShell.jsx";

export default function App({ session, onLogout, encryptionKey }) {
  const agendaState = useAgendaState(encryptionKey);
  return <AppShell state={agendaState} userEmail={session?.user?.email} onLogout={onLogout} />;
}

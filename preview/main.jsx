import React from "react";
import ReactDOM from "react-dom/client";
import { useAgendaState } from "../src/state/useAgendaState.js";
import AppShell from "../src/ui/AppShell.jsx";
import "../src/index.css";

// Renders the real dashboard directly, bypassing Supabase auth and the
// encryption gate. The repository is swapped for a mock (see
// vite.preview.config.js), so useAgendaState loads no data and falls back
// to its seeded demo tasks.
function Preview() {
  const state = useAgendaState("preview-key");
  return <AppShell state={state} userEmail="demo@dailyagenda.app" onLogout={() => {}} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Preview />);

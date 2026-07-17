/**
 * UI LAYER — Theme
 * ------------------------------------------------------------------
 * Everything about HOW the app looks lives in this one file: colors,
 * fonts, spacing, and which icon represents each category. This is
 * deliberate — if you redesign later, this is (almost) the only file
 * you'll need to touch to reskin the whole app, because every
 * component below reads colors via CSS variables (var(--primary),
 * etc.) rather than hardcoding hex values.
 *
 * Notice CATEGORY_VISUALS lives here, not in the domain layer. The
 * domain layer (src/domain/taskModel.js) only knows category KEYS
 * ("work", "fitness"...) and LABELS ("Work", "Fitness"). Which icon
 * and color represent "work" is a presentation choice — a redesign
 * might swap the icon or recolor everything without the business
 * rules caring at all.
 * ------------------------------------------------------------------
 */
import React from "react";
import { Flame, Briefcase, User, Dumbbell, Target } from "lucide-react";

export const CATEGORY_VISUALS = {
  haveToDo: { icon: Flame, color: "var(--accent)", soft: "var(--accent-soft)" },
  work: { icon: Briefcase, color: "var(--primary)", soft: "var(--primary-soft)" },
  personal: { icon: User, color: "var(--secondary)", soft: "var(--secondary-soft)" },
  fitness: { icon: Dumbbell, color: "var(--danger)", soft: "var(--danger-soft)" },
  goals: { icon: Target, color: "var(--warning)", soft: "var(--warning-soft)" },
};

export const PRIORITY_VISUALS = {
  high: { color: "var(--danger)" },
  medium: { color: "var(--warning)" },
  low: { color: "var(--success)" },
};

export const QUOTES = [
  "Small steps, done daily, outrun big plans done never.",
  "Clarity comes from action, not thought.",
  "Progress is progress, no matter how small.",
  "Discipline is choosing between what you want now and what you want most.",
  "Today's effort is tomorrow's ease.",
  "You don't have to see the whole staircase, just take the first step.",
  "Momentum is built one checked box at a time.",
];

export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');

      .app-root {
        --primary:#1D3557; --primary-soft:rgba(29,53,87,0.10);
        --secondary:#2E9C6F; --secondary-soft:rgba(46,156,111,0.12);
        --accent:#F2994A; --accent-soft:rgba(242,153,74,0.14);
        --success:#34A853; --warning:#EFA23A; --warning-soft:rgba(239,162,58,0.14);
        --danger:#E2554C; --danger-soft:rgba(226,85,76,0.12);
        --bg:#FAF8F3; --surface:#FFFFFF; --surface-2:#F3F0E8; --border:#E8E2D4;
        --text:#1B2430; --text-muted:#6B7280;
        --shadow: 0 1px 2px rgba(20,20,10,0.04), 0 6px 20px rgba(20,20,10,0.05);
        --radius: 14px;
        font-family: 'Inter', sans-serif;
        color: var(--text);
        background: var(--bg);
        display: flex;
        min-height: 100vh;
        width: 100%;
        position: relative;
      }
      .app-root.dark {
        --bg:#0F1520; --surface:#161E2C; --surface-2:#1C2536; --border:#26314487;
        --text:#E8ECF1; --text-muted:#93A0B4;
        --primary:#5B8DEF; --primary-soft:rgba(91,141,239,0.14);
        --secondary:#3FBF8C; --secondary-soft:rgba(63,191,140,0.14);
        --accent:#F5A25E; --accent-soft:rgba(245,162,94,0.16);
        --warning:#F0B75E; --warning-soft:rgba(240,183,94,0.14);
        --danger:#EF6F66; --danger-soft:rgba(239,111,102,0.14);
        --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35);
      }
      .app-root * { box-sizing: border-box; }
      /* Thin, theme-matched scrollbars everywhere instead of the
         browser's default chrome (the blocky arrow-button scrollbar
         clashes with a clean flat UI like this one). */
      .app-root * { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
      .app-root *::-webkit-scrollbar { width:6px; height:6px; }
      .app-root *::-webkit-scrollbar-track { background: transparent; }
      .app-root *::-webkit-scrollbar-thumb { background: var(--border); border-radius:10px; }
      .app-root *::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
      .loading-screen { align-items:center; justify-content:center; gap:10px; width:100%; color:var(--text-muted); }
      .spin-slow { animation: spin 2s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      .sidebar {
        width: 232px; flex-shrink:0; background: var(--primary); color:#EEF3FA;
        display:flex; flex-direction:column; padding: 20px 14px; gap: 18px;
        position: sticky; top:0; height:100vh; overflow-y:auto;
      }
      .app-root.dark .sidebar { background:#0B1220; }
      /* The sidebar is always dark regardless of app theme, so its
         scrollbar thumb needs its own light-on-dark color instead of
         the theme-driven var(--border) used everywhere else. */
      .sidebar { scrollbar-color: rgba(255,255,255,0.2) transparent; }
      .sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      .sidebar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.34); }
      .brand { font-family:'Space Grotesk', sans-serif; font-weight:700; font-size:18px; display:flex; align-items:center; gap:8px; padding: 4px 0 8px; letter-spacing:0.2px;}
      .brand-row { display:flex; align-items:center; justify-content:space-between; padding: 0 8px; }
      .brand-mark { color: var(--accent); }
      .nav { display:flex; flex-direction:column; gap:2px; }
      .nav-item { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:10px; background:none; border:none; color:#C7D3E5; font-size:13.5px; font-weight:500; cursor:pointer; text-align:left; transition: background .15s, color .15s; font-family:'Inter',sans-serif; }
      .nav-item:hover { background: rgba(255,255,255,0.06); color:#fff; }
      .nav-item.active { background: rgba(255,255,255,0.12); color:#fff; }
      .nav-item.highlight { background: rgba(242,153,74,0.18); color:#fff; }
      .sidebar-block { background: rgba(255,255,255,0.06); border-radius:12px; padding:12px; }
      .sidebar-block-title { font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#AEC0DA; display:flex; align-items:center; gap:6px; margin-bottom:6px; font-weight:600; }
      .pomo-time { font-family:'IBM Plex Mono', monospace; font-size:24px; font-weight:600; color:#fff; }
      .pomo-mode { font-size:11px; color:#AEC0DA; margin-bottom:8px; }
      .pomo-controls { display:flex; gap:6px; }
      .streak-value { font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:700; color: var(--accent); }
      .export-block { display:flex; flex-direction:column; gap:6px; }
      .theme-toggle { margin-top:auto; display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.06); border:none; color:#EEF3FA; padding:10px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:500; font-family:'Inter',sans-serif; }
      .theme-toggle:hover { background:rgba(255,255,255,0.12); }
      .account-block { margin-top: auto; }
      .account-email { font-size:11.5px; color:#C7D3E5; word-break:break-all; margin-bottom:8px; }
      .logout-btn { margin-top:0; width:100%; }

      .main-panel { flex:1; min-width:0; padding: 22px 30px 60px; }
      .topbar { display:flex; gap:12px; align-items:center; margin-bottom: 20px; flex-wrap:wrap; }
      .search-box { display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:9px 12px; flex:1; min-width:200px; color:var(--text-muted); box-shadow: var(--shadow); }
      .search-box input { border:none; outline:none; background:none; font-size:13.5px; color:var(--text); width:100%; font-family:'Inter',sans-serif; }
      .filter-box { display:flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:8px 10px; color:var(--text-muted); box-shadow:var(--shadow); }
      .filter-box select { border:none; outline:none; background:none; font-size:13px; color:var(--text); font-family:'Inter',sans-serif; }
      .primary-btn { display:flex; align-items:center; gap:6px; background:var(--primary); color:#fff; border:none; padding:10px 16px; border-radius:10px; font-weight:600; font-size:13.5px; cursor:pointer; font-family:'Inter',sans-serif; box-shadow: var(--shadow); transition: transform .1s, opacity .15s; }
      .primary-btn:hover { opacity:0.92; transform: translateY(-1px); }
      .ghost-btn { display:flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--border); color:var(--text); padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; }
      .ghost-btn.small { padding:6px 10px; font-size:12px; }
      .ghost-btn.danger { color:var(--danger); border-color: var(--danger-soft); }
      .ghost-btn:hover { background: var(--surface-2); }
      .icon-btn { display:flex; align-items:center; justify-content:center; background:var(--surface); border:1px solid var(--border); color:var(--text); width:32px; height:32px; border-radius:9px; cursor:pointer; }
      .icon-btn.tiny { width:26px; height:26px; }
      .icon-btn.danger:hover { color: var(--danger); }
      .sidebar .icon-btn { background: rgba(255,255,255,0.08); border:none; color:#EEF3FA; }

      .view-scroll { display:flex; flex-direction:column; gap: 22px; animation: fadeIn .25s ease; }
      @keyframes fadeIn { from { opacity:0; transform: translateY(4px);} to { opacity:1; transform:none; } }

      .eyebrow { font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color: var(--text-muted); font-weight:600; }
      .page-title { font-family:'Space Grotesk',sans-serif; font-size:30px; font-weight:700; margin:4px 0 6px; }
      .quote { font-style: italic; color: var(--text-muted); font-size:13.5px; }
      .page-head-row { display:flex; justify-content:space-between; align-items:flex-end; }

      .hero-row { display:flex; justify-content:space-between; align-items:center; gap: 20px; flex-wrap:wrap; }
      .today-ring { position:relative; width:120px; height:120px; flex-shrink:0; }
      .ring-svg { width:120px; height:120px; transform: rotate(-90deg); }
      .ring-bg { fill:none; stroke: var(--border); stroke-width:10; }
      .ring-fg { fill:none; stroke: var(--accent); stroke-width:10; stroke-linecap:round; transition: stroke-dashoffset .5s ease; }
      .ring-label { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
      .ring-label strong { font-family:'Space Grotesk',sans-serif; font-size:22px; }
      .ring-label span { font-size:11px; color:var(--text-muted); }

      .stat-strip { display:flex; gap:10px; flex-wrap:wrap; }
      .stat-pill { display:flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--border); padding:7px 12px; border-radius:20px; font-size:12.5px; font-weight:600; box-shadow: var(--shadow); }
      .stat-pill.warn { color: var(--danger); }
      .stat-pill.accent { color: var(--accent); }

      .htd-rail { background: linear-gradient(135deg, var(--accent-soft), transparent); border:1.5px solid var(--accent); border-radius: var(--radius); padding:16px 18px; }
      .htd-rail-head { display:flex; align-items:center; gap:8px; font-weight:700; font-family:'Space Grotesk',sans-serif; font-size:14.5px; margin-bottom:10px; }
      .htd-flame { color: var(--accent); }
      .htd-count { margin-left:auto; font-family:'IBM Plex Mono',monospace; font-size:12px; color: var(--text-muted); }
      .htd-progress { height:6px; background: var(--border); border-radius:4px; overflow:hidden; margin-bottom:12px; }
      .htd-progress-fill { height:100%; background: var(--accent); transition: width .4s ease; }
      .htd-list { display:flex; flex-direction:column; gap:6px; }

      .cat-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:16px; }
      .cat-card { background:var(--surface); border:1px solid var(--border); border-top:3px solid var(--cat-color); border-radius: var(--radius); padding:14px 16px; box-shadow: var(--shadow); display:flex; flex-direction:column; gap:8px; min-height:120px; }
      .cat-card-head { display:flex; justify-content:space-between; align-items:center; }
      .cat-title { display:flex; align-items:center; gap:7px; font-weight:700; font-size:13.5px; color: var(--cat-color); font-family:'Space Grotesk',sans-serif; }
      .cat-title.muted { color: var(--text-muted); }
      .empty-hint { color: var(--text-muted); font-size:12.5px; padding: 8px 2px; }
      .empty-hint.big { padding: 30px; text-align:center; background:var(--surface); border:1px dashed var(--border); border-radius:var(--radius); }

      .completed-strip { background: var(--surface-2); border-radius: var(--radius); padding:14px 16px; }
      .completed-list { display:flex; flex-direction:column; gap:4px; margin-top:8px; }

      .task-row { display:flex; align-items:flex-start; gap:8px; background:var(--surface); border:1px solid var(--border); border-left:3px solid var(--row-color); border-radius:10px; padding:9px 10px; cursor:default; transition: background .15s, opacity .3s; }
      .task-row.compact { padding:6px 8px; }
      .task-row.drag-over { outline:2px dashed var(--row-color); }
      .task-row.task-done { opacity:0.55; }
      .task-row.task-done .task-title { text-decoration: line-through; }
      .drag-handle { color: var(--text-muted); cursor: grab; padding-top:2px; opacity:0.5; }
      .checkbox { width:19px; height:19px; border-radius:6px; border:1.5px solid var(--border); background:var(--surface); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; margin-top:1px; color:#fff; }
      .checkbox.checked { background: var(--success); border-color: var(--success); }
      .checkbox.tiny-cb { width:15px; height:15px; }
      .task-main { flex:1; min-width:0; cursor:pointer; }
      .task-title-line { display:flex; align-items:center; gap:6px; }
      .task-title { font-size:13.5px; font-weight:600; }
      .prio-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
      .task-meta { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:3px; font-size:11px; color:var(--text-muted); }
      .task-meta span { display:flex; align-items:center; gap:3px; }
      .recur-tag { background: var(--surface-2); padding:1px 6px; border-radius:8px; }
      .tag-chip { background: var(--primary-soft); color: var(--primary); padding:1px 6px; border-radius:8px; }
      .task-notes { font-size:11px; color:var(--text-muted); margin-top:3px; display:flex; gap:4px; }
      .task-actions { display:flex; gap:3px; opacity:0; transition:opacity .15s; }
      .task-row:hover .task-actions { opacity:1; }

      .date-nav { display:flex; align-items:center; gap:10px; }
      .date-nav-label { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:18px; min-width:180px; }

      .daily-grid { display:grid; grid-template-columns: 1.6fr 1fr; gap:18px; align-items:start; }
      @media (max-width: 980px) { .daily-grid { grid-template-columns: 1fr; } }
      .timeline-card, .mini-card { background:var(--surface); border:1px solid var(--border); border-radius: var(--radius); padding:16px; box-shadow: var(--shadow); }
      .card-head { display:flex; align-items:center; gap:8px; justify-content:space-between; font-weight:700; font-family:'Space Grotesk',sans-serif; font-size:14px; margin-bottom:12px; }
      .spine-wrap { position:relative; padding-left: 14px; }
      .spine-line { position:absolute; left:57px; top:6px; bottom:6px; width:2px; background:var(--border); }
      .spine-row { display:flex; gap:12px; padding: 6px 0; position:relative; }
      .spine-hour { width:45px; font-size:11px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; padding-top:2px; text-align:right; }
      .spine-dot { width:8px; height:8px; border-radius:50%; background:var(--border); margin-top:5px; flex-shrink:0; z-index:1; }
      .spine-items { flex:1; display:flex; flex-direction:column; gap:5px; min-height: 8px; }
      .spine-task { display:flex; align-items:center; gap:7px; background: var(--surface-2); border-left:3px solid var(--row-color); border-radius:8px; padding:6px 9px; font-size:12.5px; cursor:pointer; }
      .spine-cat { margin-left:auto; font-size:10px; color:var(--text-muted); }
      .strike { text-decoration: line-through; opacity:0.6; }
      .untimed-block { margin-top:14px; padding-top:12px; border-top:1px dashed var(--border); }
      .untimed-title { font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700; margin-bottom:8px; letter-spacing:0.05em; }
      .side-col { display:flex; flex-direction:column; gap:16px; }
      .notes-area { width:100%; min-height:70px; border:1px solid var(--border); border-radius:8px; background: var(--surface-2); padding:8px 10px; font-family:'Inter',sans-serif; font-size:12.5px; color:var(--text); resize:vertical; outline:none; }

      .week-summary { display:flex; gap:8px; flex-wrap:wrap; }
      .inline-add { display:flex; gap:6px; margin-bottom:10px; }
      .inline-add input { flex:1; border:1px solid var(--border); border-radius:8px; padding:7px 10px; background:var(--surface-2); outline:none; font-size:12.5px; font-family:'Inter',sans-serif; color:var(--text); }
      .week-goal-row { display:flex; align-items:center; gap:8px; padding:5px 2px; font-size:12.5px; }
      .goal-pct { margin-left:auto; font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--text-muted); }
      .week-grid { display:grid; grid-template-columns: repeat(7, 1fr); gap:10px; }
      @media (max-width: 980px) { .week-grid { grid-template-columns: repeat(auto-fit,minmax(130px,1fr)); } }
      .week-day-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:10px; min-height:150px; box-shadow: var(--shadow); }
      .week-day-card.is-today { border-color: var(--accent); }
      .week-day-head { display:flex; justify-content:space-between; align-items:baseline; cursor:pointer; margin-bottom:8px; font-family:'Space Grotesk',sans-serif; }
      .week-day-head span { font-size:10.5px; text-transform:uppercase; color:var(--text-muted); }
      .week-mini-task { display:flex; align-items:center; gap:5px; border-left:2px solid var(--row-color); background:var(--surface-2); border-radius:6px; padding:4px 6px; font-size:11px; margin-bottom:4px; cursor:pointer; }
      .more-hint { font-size:10.5px; color:var(--text-muted); }
      .add-mini { display:flex; align-items:center; justify-content:center; width:100%; border:1px dashed var(--border); border-radius:6px; background:none; color:var(--text-muted); cursor:pointer; padding:3px; margin-top:4px; }

      /* Monthly view: a narrow sidebar (mini calendar + filters) next
         to the main grid, same structure as the reference. */
      .monthly-layout { display:grid; grid-template-columns: 250px 1fr; gap:18px; align-items:start; }
      @media (max-width: 980px) { .monthly-layout { grid-template-columns: 1fr; } }
      .monthly-sidebar { display:flex; flex-direction:column; gap:14px; position:sticky; top:0; }
      @media (max-width: 980px) { .monthly-sidebar { position:static; } }
      .monthly-main { display:flex; flex-direction:column; gap:16px; min-width:0; }

      .mini-cal { background:var(--surface); border:1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding:12px; }
      .mini-cal-head { display:flex; align-items:center; justify-content:space-between; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:12.5px; margin-bottom:8px; }
      .mini-cal-grid { display:grid; grid-template-columns: repeat(7, 1fr); gap:2px; }
      .mini-cal-dow { font-size:9.5px; font-weight:700; color:var(--text-muted); text-align:center; padding-bottom:3px; }
      .mini-cal-cell { background:none; border:none; border-radius:6px; height:26px; font-size:11.5px; color:var(--text); cursor:pointer; font-family:'Inter',sans-serif; transition: background 0.1s ease; }
      .mini-cal-cell:hover { background:var(--surface-2); }
      .mini-cal-cell.outside { color:var(--text-muted); opacity:0.5; }
      .mini-cal-cell.is-today { font-weight:700; color:var(--primary); }
      .mini-cal-cell.is-selected { background:var(--primary); color:#fff; font-weight:700; }

      .filter-panel { background:var(--surface); border:1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding:12px; display:flex; flex-direction:column; gap:12px; }
      .filter-section { display:flex; flex-direction:column; gap:6px; }
      .filter-section-head { display:flex; align-items:center; gap:6px; background:none; border:none; padding:0; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:12px; color:var(--text); cursor:pointer; text-align:left; }
      .filter-row { display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--text); cursor:pointer; padding:2px 0 2px 19px; }
      .filter-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

      .month-grid { display:grid; grid-template-columns: 26px repeat(7, 1fr); gap:6px; }
      .month-week-num { font-size:10px; color:var(--text-muted); display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono',monospace; }
      .month-dow { font-size:11px; font-weight:700; color:var(--text-muted); text-align:center; padding-bottom:4px; }
      .month-cell { background:var(--surface); border:1px solid var(--border); border-radius:10px; min-height:74px; padding:6px; cursor:pointer; display:flex; flex-direction:column; gap:4px; }
      .month-cell.empty { background:none; border:none; }
      .month-cell.is-today { border-color: var(--accent); border-width:1.5px; }
      .month-cell-date { font-size:12px; font-weight:700; font-family:'Space Grotesk',sans-serif; }
      .month-cell-dots { display:flex; gap:3px; flex-wrap:wrap; }
      .month-dot { width:6px; height:6px; border-radius:50%; }
      .month-more { font-size:9.5px; color:var(--text-muted); }

      .goals-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap:16px; }
      .goal-card { background:var(--surface); border:1px solid var(--border); border-top:3px solid var(--warning); border-radius: var(--radius); padding:16px; box-shadow: var(--shadow); }
      .goal-card-head { display:flex; justify-content:space-between; align-items:flex-start; }
      .goal-title { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:15px; }
      .goal-target { font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:4px; margin-top:3px; }
      .goal-desc { font-size:12.5px; color:var(--text-muted); margin: 8px 0; }
      .goal-progress-row { display:flex; align-items:center; gap:8px; margin: 8px 0; }
      .goal-progress-row .htd-progress { flex:1; margin:0; }
      .milestone-list { margin-top:8px; border-top:1px dashed var(--border); padding-top:6px; }
      .linked-hint { font-size:11px; color:var(--text-muted); margin-top:8px; }

      .water-row { display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:10px; }
      .water-count { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; }
      .water-count span { font-size:11px; color:var(--text-muted); font-weight:400; }
      .water-glasses { display:flex; gap:4px; justify-content:center; }
      .water-glasses svg { color: var(--border); }
      .water-glasses svg.filled { color: var(--primary); fill: var(--primary-soft); }
      .weight-list { margin-top:8px; }
      .mini-bars { display:flex; gap:8px; justify-content:space-between; align-items:flex-end; height:90px; margin-top:10px; }
      .mini-bars.tall { height:110px; }
      .mini-bar-col { display:flex; flex-direction:column; align-items:center; gap:6px; flex:1; height:100%; justify-content:flex-end; }
      .mini-bar-track { width:100%; max-width:22px; height:100%; background: var(--surface-2); border-radius:6px; display:flex; align-items:flex-end; overflow:hidden; }
      .mini-bar-fill { width:100%; background: var(--danger); border-radius:6px; transition: height .4s ease; }
      .mini-bar-fill.trend { background: var(--primary); }
      .mini-bar-col span { font-size:10px; color:var(--text-muted); }

      .stats-cards { display:grid; grid-template-columns: repeat(auto-fit,minmax(120px,1fr)); gap:12px; }
      .stat-card { background:var(--surface); border:1px solid var(--border); border-radius: var(--radius); padding:16px; text-align:center; box-shadow: var(--shadow); }
      .stat-num { display:block; font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:700; color: var(--primary); }
      .stat-label { font-size:11.5px; color:var(--text-muted); }
      .cat-bar-row { display:flex; align-items:center; gap:10px; padding:6px 0; font-size:12px; }
      .cat-bar-label { width:110px; display:flex; align-items:center; gap:6px; flex-shrink:0; }
      .cat-bar-track { flex:1; height:8px; background: var(--surface-2); border-radius:6px; overflow:hidden; }
      .cat-bar-fill { height:100%; border-radius:6px; transition: width .4s ease; }
      .cat-bar-num { font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--text-muted); width:40px; text-align:right; }

      .modal-overlay { position:fixed; inset:0; background:rgba(10,14,20,0.5); backdrop-filter: blur(2px); display:flex; align-items:center; justify-content:center; z-index:50; padding:20px; }
      .modal { background:var(--surface); width:100%; max-width:520px; max-height:88vh; overflow-y:auto; border-radius:16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
      .modal-head { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--border); }
      .modal-head h3 { font-family:'Space Grotesk',sans-serif; font-size:17px; }
      .modal-body { padding:16px 20px; display:flex; flex-direction:column; gap:12px; }
      .field { display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:600; color:var(--text-muted); flex:1; }
      .field input, .field select { border:1px solid var(--border); border-radius:8px; padding:8px 10px; background:var(--surface-2); font-size:13px; color:var(--text); outline:none; font-family:'Inter',sans-serif; }
      .field-row { display:flex; gap:10px; }
      .color-swatches { display:flex; gap:8px; }
      .swatch { width:24px; height:24px; border-radius:50%; border:2px solid var(--border); cursor:pointer; }
      .swatch.active { outline:2px solid var(--text); outline-offset:2px; }
      .modal-foot { display:flex; align-items:center; gap:8px; padding:14px 20px; border-top:1px solid var(--border); }
      .spacer { flex:1; }
      .linked-task-list { max-height:160px; overflow-y:auto; border:1px solid var(--border); border-radius:8px; padding:4px 8px; margin-top:6px; background: var(--surface-2); }

      .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background: var(--text); color: var(--bg); padding:10px 18px; border-radius:10px; font-size:13px; font-weight:600; z-index:60; box-shadow: 0 8px 24px rgba(0,0,0,0.25); }

      /* ---------- Capture screen (paper-like rapid entry) ---------- */
      .capture-screen { display:flex; flex-direction:column; height: calc(100vh - 100px); gap:16px; }
      .capture-head { display:flex; justify-content:space-between; align-items:flex-end; }
      .capture-hint-toggle { display:inline-flex; align-items:center; gap:4px; background:var(--surface-2); border:1px solid var(--border); color:var(--text-muted); font-size:11.5px; font-weight:600; cursor:pointer; padding:7px 12px; border-radius:20px; transition: background 0.15s ease, color 0.15s ease; }
      .capture-hint-toggle:hover { background:var(--border); color:var(--text); }
      .capture-hint-toggle:focus-visible { outline:2px solid var(--primary); outline-offset:2px; }
      .capture-cheatsheet { background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:10px 12px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; animation: chip-in 0.15s ease both; }
      .cheatsheet-pill { display:inline-flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:5px 10px; font-size:11px; color:var(--text-muted); }
      .cheatsheet-pill b { color:var(--text); font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:500; }
      .cheatsheet-note { font-size:11px; color:var(--text-muted); margin-left:auto; }
      .cheatsheet-note b { color:var(--text); font-family:'IBM Plex Mono',monospace; }
      .capture-body { flex:1; display:grid; grid-template-columns: 1.4fr 1fr; gap:16px; min-height:0; }
      @media (max-width: 980px) { .capture-body { grid-template-columns: 1fr; } }

      /* The writing surface is styled exactly like every other card in
         the app — same --surface/--border/--radius/--shadow tokens as
         .task-row and .capture-preview — so this screen matches the
         rest of the product instead of being a one-off skin. */
      .capture-paper {
        position:relative;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        transition: box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .capture-paper:focus-within { border-color: var(--primary); box-shadow: var(--shadow), 0 0 0 3px var(--primary-soft); }
      .capture-textarea { width:100%; height:100%; border:none; outline:none; background:transparent; padding: 18px 20px; font-family:'Inter', sans-serif; font-size:14.5px; line-height:1.75; color: var(--text); }
      .capture-editable { overflow-y:auto; white-space:pre-wrap; word-wrap:break-word; cursor:text; }
      .capture-editable:empty:before { content: attr(data-placeholder); color: var(--text-muted); font-size:14.5px; pointer-events:none; }
      /* Small outlined badges — colored text + colored border + a
         faint tint, not a solid fill — matching the compact status/
         category badge convention from the reference (INQUIRY,
         TENTATIVE, etc): understated, not "bubbly". */
      .capture-chip { display:inline-flex; align-items:center; gap:5px; vertical-align:middle; margin:0 2px; padding:1px 8px 1px 7px; border-radius:6px; font-family:'Inter', sans-serif; font-weight:600; font-size:12.5px; line-height:1.6; user-select:none; }
      .chip-category { background: color-mix(in srgb, var(--chip-color, var(--primary)) 10%, transparent); border: 1px solid color-mix(in srgb, var(--chip-color, var(--primary)) 30%, transparent); color: var(--chip-color, var(--primary)); }
      .chip-dot { width:5px; height:5px; border-radius:50%; background: var(--chip-color, var(--primary)); flex-shrink:0; }
      .chip-tag { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted); }
      .capture-quickbar { display:flex; gap:6px; flex-wrap:wrap; background: var(--surface); border:1px solid var(--border); border-radius: var(--radius); padding:7px; box-shadow: var(--shadow); }
      .quickmark-btn { display:inline-flex; align-items:center; gap:5px; min-height:32px; background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:0 11px; font-size:12px; font-weight:600; color:var(--text); cursor:pointer; font-family:'Inter', sans-serif; transition: background 0.15s ease, border-color 0.15s ease; }
      .quickmark-btn:hover { background:var(--surface-2); border-color: var(--primary); }
      .quickmark-btn:focus-visible { outline:2px solid var(--primary); outline-offset:2px; }
      .quickmark-char { font-family:'IBM Plex Mono', monospace; font-weight:700; color:var(--primary); font-size:12px; }
      .capture-suggest { position:absolute; z-index:20; background:var(--surface); border:1px solid var(--border); border-radius:8px; box-shadow: var(--shadow); padding:4px; display:flex; flex-direction:column; gap:1px; min-width:150px; max-width:240px; max-height:220px; overflow-y:auto; animation: chip-in 0.12s ease both; }
      .capture-suggest-item { display:flex; align-items:center; gap:7px; background:none; border:none; width:100%; min-height:32px; text-align:left; padding:6px 8px; border-radius:6px; font-family:'Inter', sans-serif; font-weight:500; font-size:12.5px; color:var(--text); cursor:pointer; transition: background 0.1s ease; }
      .capture-suggest-item.active, .capture-suggest-item:hover { background:var(--surface-2); }
      .suggest-swatch { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
      .suggest-hash { color:var(--text-muted); flex-shrink:0; }
      .capture-preview { background:var(--surface); border:1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding:16px; display:flex; flex-direction:column; min-height:0; }
      .capture-preview-list { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin-top:10px; }
      .capture-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; flex:1; color:var(--text-muted); text-align:center; padding:30px 16px; }
      .capture-empty svg { opacity:0.32; }
      .capture-empty p { margin:0; font-weight:600; color:var(--text); font-size:13.5px; }
      .capture-empty span { font-size:12px; max-width:220px; line-height:1.5; }
      .capture-draft-chip { display:flex; align-items:center; gap:8px; border-left:3px solid var(--row-color); background:var(--surface-2); border-radius:8px; padding:8px 10px; font-size:12.5px; animation: chip-in 0.22s ease both; animation-delay: calc(var(--row-i, 0) * 25ms); }
      .capture-draft-chip .chip-title { font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .capture-draft-chip .chip-meta { margin-left:auto; flex-shrink:0; display:flex; gap:6px; align-items:center; font-size:10.5px; color:var(--text-muted); }
      .chip-priority { padding:1px 6px; border-radius:20px; font-weight:600; text-transform:uppercase; letter-spacing:0.3px; font-size:9.5px; }
      .chip-priority.pr-high { background:var(--danger-soft); color:var(--danger); }
      .chip-priority.pr-medium { background:var(--warning-soft); color:var(--warning); }
      .chip-priority.pr-low { background:var(--secondary-soft); color:var(--secondary); }
      .capture-footer { display:flex; align-items:center; gap:10px; justify-content:space-between; flex-wrap:wrap; }
      .capture-kbd { font-family:'IBM Plex Mono',monospace; background:var(--surface-2); border:1px solid var(--border); border-radius:6px; padding:2px 6px; font-size:11px; }
      @keyframes chip-in { from { opacity:0; transform: translateY(-4px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
      @media (max-width: 640px) {
        .capture-textarea { font-size:14.5px; line-height:1.8; }
        .capture-screen { height: calc(100vh - 130px); }
        .cheatsheet-note { margin-left:0; width:100%; }
        /* The quickbar's compact desktop sizing trades away touch-target
           size for density — on a phone, where these buttons are the
           primary way to insert shorthand, that tradeoff reverses. */
        .quickmark-btn { min-height:44px; padding:0 14px; font-size:12.5px; }
        .capture-suggest-item { min-height:44px; }
      }

      /* ---------- Reminder bell ---------- */
      .reminder-bell { position: relative; }
      .reminder-bell-btn { position: relative; }
      .reminder-badge { position:absolute; top:-4px; right:-4px; background: var(--danger); color:#fff; font-size:9.5px; font-weight:700; min-width:15px; height:15px; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:0 3px; font-family:'IBM Plex Mono',monospace; }
      .reminder-panel { position:absolute; top:38px; left:0; width:280px; background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:12px; box-shadow: 0 16px 40px rgba(0,0,0,0.3); padding:12px; z-index:70; }
      .reminder-panel-head { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:13px; margin-bottom:8px; }
      .reminder-enable-btn { width:100%; justify-content:center; margin-bottom:8px; }
      .reminder-group { margin-top:8px; }
      .reminder-group-title { font-size:10.5px; text-transform:uppercase; letter-spacing:0.05em; font-weight:700; color:var(--text-muted); margin-bottom:4px; }
      .reminder-group-title.danger { color: var(--danger); }
      .reminder-row { display:flex; justify-content:space-between; gap:8px; padding:5px 4px; font-size:12px; border-radius:6px; cursor:pointer; }
      .reminder-row:hover { background: var(--surface-2); }
      .reminder-row-meta { color:var(--text-muted); font-size:10.5px; font-family:'IBM Plex Mono',monospace; flex-shrink:0; }

      /* ---------- Journal ---------- */
      .journal-compose { min-height:90px; font-family:'Space Grotesk',sans-serif; font-size:15px; line-height:1.6; }
      .journal-compose-foot { display:flex; justify-content:space-between; align-items:center; margin-top:10px; }
      .journal-search { margin: 0; }
      .journal-list { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
      .journal-entry { background:var(--surface-2); border-radius:10px; padding:10px 12px; }
      .journal-entry-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
      .journal-entry-time { font-size:10.5px; color:var(--text-muted); display:flex; align-items:center; gap:4px; font-family:'IBM Plex Mono',monospace; }
      .journal-entry-text { font-size:13px; line-height:1.55; white-space: pre-wrap; }

      /* ---------- Month events + drag ---------- */
      .month-cell-events { display:flex; flex-direction:column; gap:2px; }
      .month-event-bar { font-size:8.5px; color:#fff; border-radius:3px; padding:1px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .month-dot { cursor: grab; }
      .month-dot:active { cursor: grabbing; }
      .week-mini-task { cursor: grab; }
      .event-form { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed var(--border); }
      .event-form input[type="text"], .event-form > input { border:1px solid var(--border); border-radius:8px; padding:7px 10px; background:var(--surface-2); outline:none; font-size:12.5px; color:var(--text); font-family:'Inter',sans-serif; }
      .event-form-dates { display:flex; gap:8px; }
      .event-form-dates label { display:flex; flex-direction:column; gap:3px; font-size:10.5px; color:var(--text-muted); flex:1; }
      .event-form-dates input { border:1px solid var(--border); border-radius:8px; padding:6px 8px; background:var(--surface-2); font-size:12px; color:var(--text); font-family:'Inter',sans-serif; }

      @media print {
        .sidebar, .topbar, .task-actions, .modal-overlay, .mobile-topbar { display:none !important; }
        .main-panel { padding:0; }
        .app-root { display:block; }
      }

      /* ---------- Mobile navigation ---------- */
      .mobile-topbar { display:none; }
      .mobile-close-btn { display:none; }
      .sidebar-backdrop { display:none; }
      .brand-row-actions { display:flex; align-items:center; gap:6px; }

      @media (max-width: 760px) {
        .mobile-topbar {
          display:flex; align-items:center; gap:10px; justify-content:space-between;
          position:sticky; top:0; z-index:60; background: var(--primary); color:#EEF3FA;
          padding: 12px 14px; box-shadow: var(--shadow);
        }
        .app-root.dark .mobile-topbar { background:#0B1220; }
        .mobile-topbar .icon-btn { background: rgba(255,255,255,0.08); border:none; color:#EEF3FA; }
        .mobile-topbar-brand { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:15px; display:flex; align-items:center; gap:6px; }

        .sidebar {
          position:fixed; top:0; left:0; height:100vh; z-index:80;
          transform: translateX(-100%); transition: transform .25s ease;
          box-shadow: 0 0 40px rgba(0,0,0,0.4);
        }
        .sidebar.mobile-open { transform: translateX(0); }
        .mobile-close-btn { display:flex; }

        .sidebar-backdrop {
          display:block; position:fixed; inset:0; background: rgba(0,0,0,0.5); z-index:70;
        }

        .main-panel { padding: 16px; }
      }
    `}</style>
  );
}

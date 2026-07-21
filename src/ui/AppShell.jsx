/**
 * UI LAYER — AppShell
 * ------------------------------------------------------------------
 * This is the composition of every screen: sidebar navigation, the
 * seven views (Capture, Today, Daily, Weekly, Monthly, Goals,
 * Fitness, Stats), and the two edit modals.
 *
 * The rule this file follows throughout: components read from props
 * (data + action functions passed down), never from storage or a
 * global. That's what makes this file "just the UI" — everything it
 * needs comes in from the outside, via the `state` prop built by
 * useAgendaState (src/state). If you gut this entire file and write
 * a new layout from scratch later, useAgendaState and everything
 * below it in src/domain and src/data don't need a single edit.
 * ------------------------------------------------------------------
 */
import React, { useState } from "react";
import {
  Flame, Plus, X, Check, Trash2, Copy, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, Filter,
  Moon, Sun, Timer, Sparkles, Droplet, Weight, BarChart3, CalendarDays, CalendarRange,
  Calendar, LayoutDashboard, Tag, Clock, StickyNote, Bell, Play, Pause, RotateCcw,
  Download, GripVertical, TrendingUp, Award, Edit3, LogOut, Feather, BookOpen, Menu,
} from "lucide-react";
import { CATEGORY_KEYS, CATEGORIES, PRIORITIES, PRIORITY_KEYS, RECURRENCE_OPTIONS } from "../domain/taskModel.js";
import { generateId } from "../domain/id.js";
import { todayISO, addDays, startOfWeek, monthKey, fmtDate, weekLabel, isoWeekNumber } from "../domain/dateUtils.js";
import { eventsOnDate, eventsTouchingMonth, EVENT_COLOR_TOKENS } from "../domain/eventModel.js";
import { CATEGORY_VISUALS, PRIORITY_VISUALS, QUOTES, GlobalStyle } from "./theme.jsx";
import CaptureView from "./CaptureView.jsx";
import JournalView from "./JournalView.jsx";
import ReminderBell from "./ReminderBell.jsx";
import { useReminders } from "../state/useReminders.js";

export default function AppShell({ state, userEmail, onLogout }) {
  const {
    ready, tasks, goals, fitness, dayNotes, weekGoals, journalEntries, events, dark, streak, pomodoro, toast,
    setFitness, setDayNotes, setWeekGoals, setDark, setPomodoro,
    addTask, addTasksFromCapture, updateTask, deleteTask, duplicateTask, toggleComplete, reorderTasks, moveTaskToCategory, rescheduleTask,
    saveGoal, deleteGoal, toggleMilestone, toggleLinkedTask,
    addJournalEntry, updateJournalEntry, deleteJournalEntry,
    addEvent, deleteEvent,
  } = state;

  const [view, setView] = useState("capture");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [modal, setModal] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // pomodoro ticking now lives in useAgendaState (see src/state/useAgendaState.js)
  // so an in-progress focus session survives a page refresh instead of
  // resetting to 25:00.

  const reminders = useReminders(tasks);
  const openTaskFromReminder = (task) => setModal({ type: "task", data: task });

  const tasksForDate = (iso) => tasks.filter((t) => t.date === iso);
  const today = todayISO();
  // Undone tasks from earlier days roll onto Today automatically instead
  // of needing to be manually rescheduled. Each task's stored `date`
  // never changes here — it just also shows up in Today's list (and in
  // the Daily view when you're looking at today) until it's checked
  // off, the same way Todoist/Things handle it. Past-dated views (an
  // old Daily date, the Monthly grid) still show each task on its real
  // original day, so history stays accurate.
  //
  // Recurring tasks are deliberately excluded: the recurrence engine
  // below already generates today's own fresh occurrence of a daily/
  // weekly/etc series, so carrying yesterday's undone instance forward
  // too would show the same-titled task twice — one carried over, one
  // freshly generated. A missed occurrence of a recurring task is a
  // historical fact (visible on its real day / in Stats), not something
  // that should pile up in Today.
  const overdue = tasks.filter((t) => !t.completed && t.date < today && (!t.recurrence || t.recurrence === "none"));
  const todayTasks = [...overdue, ...tasksForDate(today)];
  const tasksForDateWithCarryover = (iso) => (iso === today ? todayTasks : tasksForDate(iso));
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const pctToday = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const quoteOfDay = QUOTES[new Date().getDate() % QUOTES.length];

  const filteredTasks = (list) => list.filter((t) => {
    const matchQ = query.trim() === "" || t.title.toLowerCase().includes(query.toLowerCase()) || t.tags.join(" ").toLowerCase().includes(query.toLowerCase());
    const matchCat = filterCat === "all" || t.category === filterCat;
    return matchQ && matchCat;
  });

  const exportCSV = () => {
    const rows = [["Title", "Category", "Priority", "Date", "Due Time", "Duration(min)", "Completed", "Tags", "Notes"]];
    tasks.forEach((t) => rows.push([t.title, CATEGORIES[t.category]?.label || t.category, t.priority, t.date, t.dueTime || "", t.duration || "", t.completed ? "Yes" : "No", (t.tags || []).join(";"), (t.notes || "").replace(/\n/g, " ")]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agenda-export-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const exportPDF = () => window.print();

  if (!ready) {
    return <div className="app-root loading-screen"><GlobalStyle /><Sparkles size={28} className="spin-slow" /><span>Loading your agenda…</span></div>;
  }

  return (
    <div className={"app-root" + (dark ? " dark" : "")}>
      <GlobalStyle />

      <div className="mobile-topbar">
        <button className="icon-btn" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
        <span className="mobile-topbar-brand"><span className="brand-mark">◆</span> Agenda</span>
        <ReminderBell {...reminders} onTaskClick={openTaskFromReminder} />
      </div>
      {mobileNavOpen && <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <Sidebar view={view} setView={(v) => { setView(v); setMobileNavOpen(false); }} dark={dark} setDark={setDark} pomodoro={pomodoro} setPomodoro={setPomodoro}
        streak={streak} exportCSV={exportCSV} exportPDF={exportPDF} userEmail={userEmail} onLogout={onLogout}
        reminders={reminders} onReminderTaskClick={openTaskFromReminder}
        mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

      <main className="main-panel">
        {view !== "capture" && (
          <TopBar query={query} setQuery={setQuery} filterCat={filterCat} setFilterCat={setFilterCat}
            onNewTask={() => setModal({ type: "task", data: { date: view === "today" ? today : selectedDate } })} />
        )}

        {view === "capture" && <CaptureView addTasksFromCapture={addTasksFromCapture} tasks={tasks} />}

        {view === "journal" && (
          <JournalView journalEntries={journalEntries} addJournalEntry={addJournalEntry} deleteJournalEntry={deleteJournalEntry} />
        )}

        {view === "today" && (
          <TodayView
            today={today} todayTasks={filteredTasks(todayTasks)} pctToday={pctToday} completedToday={completedToday}
            overdue={overdue} quote={quoteOfDay} streak={streak}
            onToggle={toggleComplete} onEdit={(t) => setModal({ type: "task", data: t })}
            onDelete={deleteTask} onDuplicate={duplicateTask} onAdd={(cat) => setModal({ type: "task", data: { category: cat, date: today } })}
            onReorder={reorderTasks} onMoveToCategory={moveTaskToCategory}
          />
        )}

        {view === "daily" && (
          <DailyPlanner
            date={selectedDate} setDate={setSelectedDate}
            tasks={filteredTasks(tasksForDateWithCarryover(selectedDate))}
            onToggle={toggleComplete} onEdit={(t) => setModal({ type: "task", data: t })}
            onAdd={() => setModal({ type: "task", data: { date: selectedDate } })}
            notes={dayNotes[selectedDate] || { notes: "", reflection: "" }}
            setNotes={(patch) => setDayNotes((p) => ({ ...p, [selectedDate]: { ...(p[selectedDate] || { notes: "", reflection: "" }), ...patch } }))}
            quote={QUOTES[new Date(selectedDate).getDate() % QUOTES.length]}
          />
        )}

        {view === "weekly" && (
          <WeeklyPlanner
            weekStart={startOfWeek(selectedDate)} setSelectedDate={setSelectedDate}
            tasks={tasks} onToggle={toggleComplete} onEdit={(t) => setModal({ type: "task", data: t })}
            onAdd={(iso) => setModal({ type: "task", data: { date: iso } })}
            onReschedule={rescheduleTask}
            weekGoals={weekGoals} setWeekGoals={setWeekGoals}
          />
        )}

        {view === "monthly" && (
          <MonthlyPlanner
            month={monthKey(selectedDate)} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            tasks={tasks} goals={goals} events={events} addEvent={addEvent} deleteEvent={deleteEvent}
            onReschedule={rescheduleTask}
            onDayClick={(iso) => { setSelectedDate(iso); setView("daily"); }}
          />
        )}

        {view === "goals" && (
          <GoalsView goals={goals} tasks={tasks}
            onAdd={() => setModal({ type: "goal", data: {} })}
            onEdit={(g) => setModal({ type: "goal", data: g })}
            onDelete={deleteGoal}
            onToggleMilestone={toggleMilestone}
          />
        )}

        {view === "fitness" && (
          <FitnessView tasks={tasks} fitness={fitness} setFitness={setFitness} today={today}
            onToggle={toggleComplete} onAdd={() => setModal({ type: "task", data: { category: "fitness", date: today } })} onEdit={(t) => setModal({ type: "task", data: t })}
          />
        )}

        {view === "stats" && <StatsView tasks={tasks} goals={goals} streak={streak} />}
      </main>

      {modal?.type === "task" && (
        <TaskModal data={modal.data} onClose={() => setModal(null)}
          onSave={(t) => { t.id ? updateTask(t.id, t) : addTask(t); setModal(null); }}
          onDelete={(id) => { deleteTask(id); setModal(null); }}
        />
      )}
      {modal?.type === "goal" && (
        <GoalModal data={modal.data} tasks={tasks} onClose={() => setModal(null)}
          onSave={(g) => { saveGoal(g); setModal(null); }}
          onDelete={(id) => { deleteGoal(id); setModal(null); }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ============================== SIDEBAR ============================== */
function Sidebar({ view, setView, dark, setDark, pomodoro, setPomodoro, streak, exportCSV, exportPDF, userEmail, onLogout, reminders, onReminderTaskClick, mobileOpen, onCloseMobile }) {
  const nav = [
    { key: "capture", label: "Capture", icon: Feather, highlight: true },
    { key: "today", label: "Today", icon: LayoutDashboard },
    { key: "journal", label: "Journal", icon: BookOpen },
    { key: "daily", label: "Daily", icon: CalendarDays },
    { key: "weekly", label: "Weekly", icon: CalendarRange },
    { key: "monthly", label: "Monthly", icon: Calendar },
    { key: "goals", label: "Goals", icon: Flame },
    { key: "fitness", label: "Fitness", icon: Weight },
    { key: "stats", label: "Stats", icon: BarChart3 },
  ];
  const mins = String(Math.floor(pomodoro.secs / 60)).padStart(2, "0");
  const secs = String(pomodoro.secs % 60).padStart(2, "0");
  return (
    <aside className={"sidebar" + (mobileOpen ? " mobile-open" : "")}>
      <div className="brand-row">
        <div className="brand"><span className="brand-mark">◆</span><span>Agenda</span></div>
        <div className="brand-row-actions">
          <ReminderBell {...reminders} onTaskClick={onReminderTaskClick} />
          <button className="icon-btn mobile-close-btn" onClick={onCloseMobile} aria-label="Close menu"><X size={16} /></button>
        </div>
      </div>

      <nav className="nav">
        {nav.map((n) => (
          <button key={n.key} className={"nav-item" + (view === n.key ? " active" : "") + (n.highlight && view !== n.key ? " highlight" : "")} onClick={() => setView(n.key)}>
            <n.icon size={17} strokeWidth={2} /> <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-block">
        <div className="sidebar-block-title"><Timer size={14} /> Focus timer</div>
        <div className="pomo-time">{mins}:{secs}</div>
        <div className="pomo-mode">{pomodoro.mode === "focus" ? "Focus session" : "Short break"}</div>
        <div className="pomo-controls">
          <button className="icon-btn" onClick={() => setPomodoro((p) => ({ ...p, running: !p.running }))}>
            {pomodoro.running ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button className="icon-btn" onClick={() => setPomodoro({ secs: 25 * 60, running: false, mode: "focus" })}><RotateCcw size={15} /></button>
        </div>
      </div>

      <div className="sidebar-block">
        <div className="sidebar-block-title"><Award size={14} /> Streak</div>
        <div className="streak-value">{streak} day{streak === 1 ? "" : "s"}</div>
      </div>

      <div className="sidebar-block export-block">
        <div className="sidebar-block-title"><Download size={14} /> Export</div>
        <button className="ghost-btn small" onClick={exportCSV}>CSV</button>
        <button className="ghost-btn small" onClick={exportPDF}>PDF (print)</button>
      </div>

      {userEmail && (
        <div className="sidebar-block account-block">
          <div className="sidebar-block-title">Account</div>
          <div className="account-email" title={userEmail}>{userEmail}</div>
          <button className="theme-toggle logout-btn" onClick={onLogout}>
            <LogOut size={16} /> <span>Log out</span>
          </button>
        </div>
      )}

      <button className="theme-toggle" onClick={() => setDark((d) => !d)}>
        {dark ? <Sun size={16} /> : <Moon size={16} />} <span>{dark ? "Light mode" : "Dark mode"}</span>
      </button>
    </aside>
  );
}

/* ============================== TOP BAR ============================== */
function TopBar({ query, setQuery, filterCat, setFilterCat, onNewTask }) {
  return (
    <div className="topbar">
      <div className="search-box">
        <Search size={15} />
        <input placeholder="Search tasks, tags…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="filter-box">
        <Filter size={14} />
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORY_KEYS.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
        </select>
      </div>
      <button className="ghost-btn" onClick={onNewTask}><Plus size={16} /> New task (precise)</button>
    </div>
  );
}

/* ============================== TODAY VIEW ============================== */
// Completed tasks aren't pulled out of their category — they just sink to
// the bottom of it (still checked off, still visible) so everything for a
// given category stays together instead of jumping into a separate section
// far down the page. Array.prototype.sort is stable, so within "still
// active" and "already done" the original order is preserved.
const sortDoneToBottom = (list) => [...list].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

function TodayView({ today, todayTasks, pctToday, completedToday, overdue, quote, streak, onToggle, onEdit, onDelete, onDuplicate, onAdd, onReorder, onMoveToCategory }) {
  const haveToDo = sortDoneToBottom(todayTasks.filter((t) => t.category === "haveToDo")).slice(0, 5);
  const htdDone = haveToDo.filter((t) => t.completed).length;
  const [htdDragOver, setHtdDragOver] = useState(false);

  return (
    <div className="view-scroll">
      <div className="hero-row">
        <div>
          <div className="eyebrow">{fmtDate(today)}</div>
          <h1 className="page-title">Today's agenda</h1>
          <p className="quote">"{quote}"</p>
        </div>
        <div className="today-ring">
          <svg viewBox="0 0 120 120" className="ring-svg">
            <circle cx="60" cy="60" r="52" className="ring-bg" />
            <circle cx="60" cy="60" r="52" className="ring-fg" style={{ strokeDasharray: 326.7, strokeDashoffset: 326.7 - (326.7 * pctToday) / 100 }} />
          </svg>
          <div className="ring-label"><strong>{pctToday}%</strong><span>done</span></div>
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat-pill"><Check size={14} /> {completedToday}/{todayTasks.length} tasks</div>
        <div className="stat-pill warn"><Bell size={14} /> {overdue.length} overdue</div>
        <div className="stat-pill accent"><Award size={14} /> {streak}-day streak</div>
      </div>

      {haveToDo.length > 0 && (
        <section className="htd-rail">
          <div className="htd-rail-head">
            <Flame size={16} className="htd-flame" />
            <span>Have To Do — non-negotiables</span>
            <span className="htd-count">{htdDone}/{haveToDo.length}</span>
          </div>
          <div className="htd-progress"><div className="htd-progress-fill" style={{ width: `${haveToDo.length ? (htdDone / haveToDo.length) * 100 : 0}%` }} /></div>
          <div
            className={"htd-list" + (htdDragOver ? " drag-over" : "")}
            onDragOver={(e) => { e.preventDefault(); setHtdDragOver(true); }}
            onDragLeave={() => setHtdDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setHtdDragOver(false); const fromId = e.dataTransfer.getData("text/plain"); if (fromId && onMoveToCategory) onMoveToCategory(fromId, "haveToDo"); }}
          >
            {haveToDo.map((t) => <TaskRow key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onReorder={onReorder} compact htd todayIso={today} />)}
          </div>
        </section>
      )}

      <div className="cat-grid">
        {CATEGORY_KEYS.filter((c) => c !== "haveToDo").map((c) => (
          <CategoryCard
            key={c} category={c} tasks={todayTasks.filter((t) => t.category === c)} today={today}
            onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate}
            onReorder={onReorder} onMoveToCategory={onMoveToCategory} onAdd={onAdd}
          />
        ))}
      </div>
    </div>
  );
}

/* ============================== CATEGORY CARD (drag-and-drop target) ============================== */
function CategoryCard({ category, tasks, today, onToggle, onEdit, onDelete, onDuplicate, onReorder, onMoveToCategory, onAdd }) {
  const [dragOver, setDragOver] = useState(false);
  const list = sortDoneToBottom(tasks);
  const Icon = CATEGORY_VISUALS[category].icon;
  return (
    <section
      className={"cat-card" + (dragOver ? " drag-over" : "")}
      style={{ "--cat-color": CATEGORY_VISUALS[category].color, "--cat-soft": CATEGORY_VISUALS[category].soft }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const fromId = e.dataTransfer.getData("text/plain"); if (fromId && onMoveToCategory) onMoveToCategory(fromId, category); }}
    >
      <div className="cat-card-head">
        <div className="cat-title"><Icon size={16} /> {CATEGORIES[category].label}</div>
        <button className="icon-btn tiny" onClick={() => onAdd(category)}><Plus size={14} /></button>
      </div>
      {list.length === 0 ? <div className="empty-hint">Drag a task here, or nothing's here yet.</div> :
        list.map((t) => <TaskRow key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onReorder={onReorder} todayIso={today} />)}
    </section>
  );
}

/* ============================== TASK ROW ============================== */
function TaskRow({ task, onToggle, onEdit, onDelete, onDuplicate, onReorder, compact, todayIso }) {
  const visuals = CATEGORY_VISUALS[task.category] || CATEGORY_VISUALS.personal;
  const [dragOver, setDragOver] = useState(false);
  // todayIso is only passed in by views showing "today's list" — if the
  // task's real date doesn't match, it rolled over from an earlier day.
  const carriedOver = todayIso && task.date !== todayIso;
  return (
    <div
      className={"task-row" + (task.completed ? " task-done" : "") + (compact ? " compact" : "") + (dragOver ? " drag-over" : "")}
      style={{ "--row-color": task.color || visuals.color }}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); const fromId = e.dataTransfer.getData("text/plain"); if (fromId && onReorder) onReorder(fromId, task.id); }}
    >
      <span className="drag-handle"><GripVertical size={13} /></span>
      <button className={"checkbox" + (task.completed ? " checked" : "")} onClick={() => onToggle(task.id)}>
        {task.completed && <Check size={12} strokeWidth={3} />}
      </button>
      <div className="task-main" onClick={() => onEdit(task)}>
        <div className="task-title-line">
          <span className="task-title">{task.title}</span>
          {task.priority && <span className="prio-dot" style={{ background: PRIORITY_VISUALS[task.priority]?.color }} title={PRIORITIES[task.priority]?.label} />}
        </div>
        <div className="task-meta">
          {carriedOver && <span className="carried-tag" title={`Originally scheduled for ${task.date}`}><Bell size={10} /> Carried over</span>}
          {task.dueTime && <span><Clock size={11} /> {task.dueTime}</span>}
          {task.duration ? <span>{task.duration}m</span> : null}
          {task.recurrence && task.recurrence !== "none" && <span className="recur-tag">{RECURRENCE_OPTIONS.find((r) => r.key === task.recurrence)?.label}</span>}
          {(task.tags || []).map((tag) => <span key={tag} className="tag-chip">#{tag}</span>)}
        </div>
        {task.notes && !compact && <div className="task-notes"><StickyNote size={11} /> {task.notes}</div>}
      </div>
      <div className="task-actions">
        <button className="icon-btn tiny" onClick={() => onDuplicate(task.id)} title="Duplicate"><Copy size={13} /></button>
        <button className="icon-btn tiny" onClick={() => onEdit(task)} title="Edit"><Edit3 size={13} /></button>
        <button className="icon-btn tiny danger" onClick={() => onDelete(task.id)} title="Delete"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

/* ============================== DAILY PLANNER ============================== */
function DailyPlanner({ date, setDate, tasks, onToggle, onEdit, onAdd, notes, setNotes, quote }) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 6);
  const timed = tasks.filter((t) => t.dueTime);
  const untimed = tasks.filter((t) => !t.dueTime);
  // Only flag carried-over tasks when actually looking at today — an
  // old Daily date should read as an accurate historical record, not
  // get flagged against itself.
  const todayIso = date === todayISO() ? date : undefined;
  return (
    <div className="view-scroll">
      <DateNav date={date} setDate={setDate} label={fmtDate(date)} />
      <p className="quote">"{quote}"</p>
      <div className="daily-grid">
        <div className="timeline-card">
          <div className="card-head"><span>Timeline schedule</span><button className="ghost-btn small" onClick={onAdd}><Plus size={13} /> Add</button></div>
          <div className="spine-wrap">
            <div className="spine-line" />
            {hours.map((h) => {
              const label = h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
              const items = timed.filter((t) => parseInt(t.dueTime.split(":")[0], 10) === h);
              return (
                <div className="spine-row" key={h}>
                  <div className="spine-hour">{label}</div>
                  <div className="spine-dot" />
                  <div className="spine-items">
                    {items.map((t) => (
                      <div key={t.id} className="spine-task" style={{ "--row-color": CATEGORY_VISUALS[t.category]?.color }} onClick={() => onEdit(t)}>
                        <button className={"checkbox tiny-cb" + (t.completed ? " checked" : "")} onClick={(e) => { e.stopPropagation(); onToggle(t.id); }}>{t.completed && <Check size={10} strokeWidth={3} />}</button>
                        <span className={t.completed ? "strike" : ""}>{t.title}</span>
                        {todayIso && t.date !== todayIso && <span className="carried-tag" title={`Originally scheduled for ${t.date}`}><Bell size={9} /></span>}
                        <span className="spine-cat">{CATEGORIES[t.category]?.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {untimed.length > 0 && (
            <div className="untimed-block">
              <div className="untimed-title">Anytime today</div>
              {untimed.map((t) => <TaskRow key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={() => {}} onDuplicate={() => {}} compact todayIso={todayIso} />)}
            </div>
          )}
        </div>

        <div className="side-col">
          <div className="mini-card">
            <div className="card-head"><span>Priority tasks</span></div>
            {tasks.filter((t) => t.priority === "high").length === 0 ? <div className="empty-hint">No high-priority tasks.</div> :
              tasks.filter((t) => t.priority === "high").map((t) => <TaskRow key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={() => {}} onDuplicate={() => {}} compact todayIso={todayIso} />)}
          </div>
          <div className="mini-card">
            <div className="card-head"><StickyNote size={14} /><span>Daily notes</span></div>
            <textarea className="notes-area" placeholder="Jot down anything for today…" value={notes.notes} onChange={(e) => setNotes({ notes: e.target.value })} />
          </div>
          <div className="mini-card">
            <div className="card-head"><Sparkles size={14} /><span>End-of-day reflection</span></div>
            <textarea className="notes-area" placeholder="What went well? What would you change?" value={notes.reflection} onChange={(e) => setNotes({ reflection: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DateNav({ date, setDate, label }) {
  return (
    <div className="date-nav">
      <button className="icon-btn" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={16} /></button>
      <div className="date-nav-label">{label}</div>
      <button className="icon-btn" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></button>
      <button className="ghost-btn small" onClick={() => setDate(todayISO())}>Today</button>
    </div>
  );
}

/* ============================== WEEKLY PLANNER ============================== */
function WeeklyPlanner({ weekStart, setSelectedDate, tasks, onToggle, onEdit, onAdd, onReschedule, weekGoals, setWeekGoals }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekTasks = tasks.filter((t) => days.includes(t.date));
  const doneCount = weekTasks.filter((t) => t.completed).length;
  const thisWeekGoals = weekGoals.filter((g) => g.weekStart === weekStart);
  const [newGoal, setNewGoal] = useState("");

  const catCounts = CATEGORY_KEYS.map((c) => ({ c, total: weekTasks.filter((t) => t.category === c).length, done: weekTasks.filter((t) => t.category === c && t.completed).length }));

  return (
    <div className="view-scroll">
      <DateNav date={weekStart} setDate={(d) => setSelectedDate(d)} label={weekLabel(weekStart)} />
      <span className="empty-hint">Drag a task onto another day to reschedule it.</span>
      <div className="week-summary">
        <div className="stat-pill"><Check size={14} /> {doneCount}/{weekTasks.length} tasks this week</div>
        {catCounts.filter((c) => c.total > 0).map((c) => (
          <div className="stat-pill" key={c.c} style={{ borderColor: CATEGORY_VISUALS[c.c].color }}>{React.createElement(CATEGORY_VISUALS[c.c].icon, { size: 12 })} {c.done}/{c.total}</div>
        ))}
      </div>

      <div className="mini-card">
        <div className="card-head"><Flame size={14} /><span>Weekly goals</span></div>
        <div className="inline-add">
          <input placeholder="Add a goal for this week…" value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newGoal.trim()) { setWeekGoals((p) => [...p, { id: generateId(), title: newGoal.trim(), weekStart, done: false }]); setNewGoal(""); } }} />
          <button className="ghost-btn small" onClick={() => { if (newGoal.trim()) { setWeekGoals((p) => [...p, { id: generateId(), title: newGoal.trim(), weekStart, done: false }]); setNewGoal(""); } }}>Add</button>
        </div>
        {thisWeekGoals.map((g) => (
          <div key={g.id} className="week-goal-row">
            <button className={"checkbox" + (g.done ? " checked" : "")} onClick={() => setWeekGoals((p) => p.map((x) => x.id === g.id ? { ...x, done: !x.done } : x))}>{g.done && <Check size={12} strokeWidth={3} />}</button>
            <span className={g.done ? "strike" : ""}>{g.title}</span>
          </div>
        ))}
      </div>

      <div className="week-grid">
        {days.map((iso) => {
          const dayTasks = weekTasks.filter((t) => t.date === iso);
          const isToday = iso === todayISO();
          return (
            <div key={iso} className={"week-day-card" + (isToday ? " is-today" : "")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const taskId = e.dataTransfer.getData("text/plain"); if (taskId) onReschedule(taskId, iso); }}
            >
              <div className="week-day-head" onClick={() => setSelectedDate(iso)}>
                <span>{new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}</span>
                <strong>{new Date(iso + "T00:00:00").getDate()}</strong>
              </div>
              <div className="week-day-tasks">
                {dayTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="week-mini-task" style={{ "--row-color": CATEGORY_VISUALS[t.category]?.color }}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    onClick={() => onEdit(t)}
                  >
                    <button className={"checkbox tiny-cb" + (t.completed ? " checked" : "")} onClick={(e) => { e.stopPropagation(); onToggle(t.id); }}>{t.completed && <Check size={9} strokeWidth={3} />}</button>
                    <span className={t.completed ? "strike" : ""}>{t.title}</span>
                  </div>
                ))}
                {dayTasks.length > 5 && <div className="more-hint">+{dayTasks.length - 5} more</div>}
                <button className="add-mini" onClick={() => onAdd(iso)}><Plus size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== MONTHLY PLANNER ============================== */
// Compact date-picker: shows the same month as the main grid, plus
// dimmed overflow days from the adjacent months so the grid always
// fills a clean 6x7 block — same convention as the reference. Purely
// a navigation aid: clicking a day moves the shared selectedDate/month
// without leaving the Monthly view (unlike clicking a big-grid cell,
// which drills into that day).
function MiniCalendar({ month, selectedDate, onSelect, onShiftMonth }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const prevMonthDays = new Date(y, m - 1, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dm = new Date(y, m - 2, d);
    cells.push({ iso: dm.toISOString().slice(0, 10), day: d, outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: `${month}-${String(d).padStart(2, "0")}`, day: d, outside: false });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const dm = new Date(y, m, nextDay);
    cells.push({ iso: dm.toISOString().slice(0, 10), day: nextDay, outside: true });
    nextDay++;
    if (cells.length >= 42) break;
  }

  const today = todayISO();
  return (
    <div className="mini-cal">
      <div className="mini-cal-head">
        <button className="icon-btn tiny" onClick={() => onShiftMonth(-1)}><ChevronLeft size={13} /></button>
        <span>{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <button className="icon-btn tiny" onClick={() => onShiftMonth(1)}><ChevronRight size={13} /></button>
      </div>
      <div className="mini-cal-grid">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d} className="mini-cal-dow">{d}</div>)}
        {cells.map((c) => (
          <button
            key={c.iso}
            className={
              "mini-cal-cell" +
              (c.outside ? " outside" : "") +
              (c.iso === today ? " is-today" : "") +
              (c.iso === selectedDate ? " is-selected" : "")
            }
            onClick={() => onSelect(c.iso)}
          >
            {c.day}
          </button>
        ))}
      </div>
    </div>
  );
}

// Collapsible checkbox groups for narrowing what the big grid shows —
// same "Status / Spaces" filter-panel pattern as the reference, applied
// to this app's actual data: category and priority instead of booking
// status and physical spaces.
function MonthlyFilters({ activeCategories, onToggleCategory, activePriorities, onTogglePriority }) {
  const [openCat, setOpenCat] = useState(true);
  const [openPri, setOpenPri] = useState(true);
  return (
    <div className="filter-panel">
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => setOpenCat((s) => !s)}>
          {openCat ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Category
        </button>
        {openCat && CATEGORY_KEYS.map((key) => (
          <label key={key} className="filter-row">
            <button
              type="button"
              className={"checkbox tiny-cb" + (activeCategories.has(key) ? " checked" : "")}
              onClick={() => onToggleCategory(key)}
            >
              {activeCategories.has(key) && <Check size={9} strokeWidth={3} />}
            </button>
            <span className="filter-dot" style={{ background: CATEGORY_VISUALS[key]?.color }} />
            {CATEGORIES[key].label}
          </label>
        ))}
      </div>
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => setOpenPri((s) => !s)}>
          {openPri ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Priority
        </button>
        {openPri && PRIORITY_KEYS.map((key) => (
          <label key={key} className="filter-row">
            <button
              type="button"
              className={"checkbox tiny-cb" + (activePriorities.has(key) ? " checked" : "")}
              onClick={() => onTogglePriority(key)}
            >
              {activePriorities.has(key) && <Check size={9} strokeWidth={3} />}
            </button>
            <span className="filter-dot" style={{ background: PRIORITY_VISUALS[key]?.color }} />
            {PRIORITIES[key].label}
          </label>
        ))}
      </div>
    </div>
  );
}

function MonthlyPlanner({ month, selectedDate, setSelectedDate, tasks, goals, events, addEvent, deleteEvent, onReschedule, onDayClick }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  // Chunk into weeks so each row can carry its own ISO week number,
  // matching the numbered rail down the side of the reference grid.
  const weekRows = [];
  for (let i = 0; i < cells.length; i += 7) weekRows.push(cells.slice(i, i + 7));

  const [activeCategories, setActiveCategories] = useState(() => new Set(CATEGORY_KEYS));
  const [activePriorities, setActivePriorities] = useState(() => new Set(PRIORITY_KEYS));
  const toggleCategory = (key) => setActiveCategories((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const togglePriority = (key) => setActivePriorities((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const visibleTasks = tasks.filter((t) => activeCategories.has(t.category) && activePriorities.has(t.priority));

  const monthTasks = visibleTasks.filter((t) => t.date.startsWith(month));
  const done = monthTasks.filter((t) => t.completed).length;
  const monthGoals = goals.filter((g) => g.targetDate && g.targetDate.startsWith(month));
  const recurringActive = monthTasks.filter((t) => t.recurrence && t.recurrence !== "none");
  const monthEventList = eventsTouchingMonth(events, month);

  const [eventForm, setEventForm] = useState({ title: "", startDate: selectedDate, endDate: selectedDate, colorToken: "primary" });
  const submitEvent = () => {
    if (!eventForm.title.trim()) return;
    addEvent(eventForm);
    setEventForm({ title: "", startDate: selectedDate, endDate: selectedDate, colorToken: "primary" });
  };

  const shiftMonth = (delta) => {
    const nd = new Date(y, m - 1 + delta, 1);
    setSelectedDate(nd.toISOString().slice(0, 10));
  };

  return (
    <div className="view-scroll">
      <div><div className="eyebrow">Calendar</div><h1 className="page-title">Monthly</h1></div>
      <div className="monthly-layout">
        <aside className="monthly-sidebar">
          <MiniCalendar month={month} selectedDate={selectedDate} onSelect={setSelectedDate} onShiftMonth={shiftMonth} />
          <MonthlyFilters
            activeCategories={activeCategories} onToggleCategory={toggleCategory}
            activePriorities={activePriorities} onTogglePriority={togglePriority}
          />
        </aside>

        <div className="monthly-main">
          <div className="date-nav">
            <button className="icon-btn" onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></button>
            <div className="date-nav-label">{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
            <button className="icon-btn" onClick={() => shiftMonth(1)}><ChevronRight size={16} /></button>
            <span className="empty-hint">Drag a task's dot onto another day to reschedule it.</span>
          </div>

          <div className="week-summary">
            <div className="stat-pill"><Check size={14} /> {done}/{monthTasks.length} tasks this month</div>
            <div className="stat-pill">{monthGoals.length} goals due</div>
            <div className="stat-pill"><RotateCcw size={14} /> {recurringActive.length} recurring</div>
          </div>

          <div className="month-grid">
            <div className="month-week-num" />
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="month-dow">{d}</div>)}
            {weekRows.map((row, ri) => {
              const anchor = row.find((iso) => iso);
              return (
                <React.Fragment key={ri}>
                  <div className="month-week-num">{anchor ? isoWeekNumber(anchor) : ""}</div>
                  {row.map((iso, idx) => {
                    if (!iso) return <div key={ri + "-" + idx} className="month-cell empty" />;
                    const dayTasks = visibleTasks.filter((t) => t.date === iso);
                    const dayEvents = eventsOnDate(events, iso);
                    const isToday = iso === todayISO();
                    return (
                      <div key={iso} className={"month-cell" + (isToday ? " is-today" : "")}
                        onClick={() => onDayClick(iso)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const taskId = e.dataTransfer.getData("text/plain"); if (taskId) onReschedule(taskId, iso); }}
                      >
                        <div className="month-cell-date">{parseInt(iso.slice(-2), 10)}</div>
                        {dayEvents.length > 0 && (
                          <div className="month-cell-events">
                            {dayEvents.slice(0, 2).map((e) => (
                              <div key={e.id} className="month-event-bar" style={{ background: `var(--${e.colorToken})` }} title={e.title}>{e.title}</div>
                            ))}
                          </div>
                        )}
                        <div className="month-cell-dots">
                          {dayTasks.slice(0, 4).map((t) => (
                            <span key={t.id} className="month-dot" draggable
                              style={{ background: CATEGORY_VISUALS[t.category]?.color, opacity: t.completed ? 0.35 : 1 }}
                              onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("text/plain", t.id); }}
                              title={t.title}
                            />
                          ))}
                        </div>
                        {dayTasks.length > 4 && <div className="month-more">+{dayTasks.length - 4}</div>}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>

          <div className="daily-grid">
            <div className="mini-card">
              <div className="card-head"><CalendarDays size={14} /><span>Events</span></div>
              <div className="event-form">
                <input placeholder="Event title…" value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} />
                <div className="event-form-dates">
                  <label><span>Starts</span><input type="date" value={eventForm.startDate} onChange={(e) => setEventForm((f) => ({ ...f, startDate: e.target.value }))} /></label>
                  <label><span>Ends</span><input type="date" value={eventForm.endDate} onChange={(e) => setEventForm((f) => ({ ...f, endDate: e.target.value }))} /></label>
                </div>
                <div className="color-swatches">
                  {EVENT_COLOR_TOKENS.map((tk) => (
                    <button key={tk} className={"swatch" + (eventForm.colorToken === tk ? " active" : "")} style={{ background: `var(--${tk})` }} onClick={() => setEventForm((f) => ({ ...f, colorToken: tk }))} />
                  ))}
                </div>
                <button className="ghost-btn small" onClick={submitEvent}>Add event</button>
              </div>
              {monthEventList.map((e) => (
                <div key={e.id} className="week-goal-row">
                  <span className="month-dot" style={{ background: `var(--${e.colorToken})` }} />
                  <span style={{ flex: 1 }}>{e.title}</span>
                  <span className="goal-pct">{e.startDate === e.endDate ? e.startDate.slice(5) : `${e.startDate.slice(5)}–${e.endDate.slice(5)}`}</span>
                  <button className="icon-btn tiny danger" onClick={() => deleteEvent(e.id)}><X size={12} /></button>
                </div>
              ))}
              {monthEventList.length === 0 && <div className="empty-hint">No events this month.</div>}
            </div>
            <div className="mini-card">
              <div className="card-head"><span>Monthly goals</span></div>
              {monthGoals.length === 0 ? <div className="empty-hint">No goals due this month.</div> :
                monthGoals.map((g) => (
                  <div key={g.id} className="week-goal-row">
                    <span style={{ flex: 1 }}>{g.title}</span>
                    <span className="goal-pct">{g.progress || 0}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== GOALS VIEW ============================== */
function GoalsView({ goals, tasks, onAdd, onEdit, onDelete, onToggleMilestone }) {
  return (
    <div className="view-scroll">
      <div className="page-head-row">
        <div><div className="eyebrow">Long-term</div><h1 className="page-title">Goals</h1></div>
        <button className="primary-btn" onClick={onAdd}><Plus size={16} /> New goal</button>
      </div>
      {goals.length === 0 && <div className="empty-hint big">No goals yet. Add one to start tracking progress toward something bigger.</div>}
      <div className="goals-grid">
        {goals.map((g) => {
          const linked = tasks.filter((t) => (g.linkedTaskIds || []).includes(t.id));
          const linkedDone = linked.filter((t) => t.completed).length;
          const msDone = (g.milestones || []).filter((m) => m.done).length;
          const pct = g.milestones?.length ? Math.round((msDone / g.milestones.length) * 100) : (g.progress || 0);
          return (
            <div className="goal-card" key={g.id}>
              <div className="goal-card-head">
                <div>
                  <div className="goal-title">{g.title}</div>
                  {g.targetDate && <div className="goal-target"><Clock size={11} /> by {new Date(g.targetDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>}
                </div>
                <div className="goal-actions">
                  <button className="icon-btn tiny" onClick={() => onEdit(g)}><Edit3 size={13} /></button>
                  <button className="icon-btn tiny danger" onClick={() => onDelete(g.id)}><Trash2 size={13} /></button>
                </div>
              </div>
              {g.description && <p className="goal-desc">{g.description}</p>}
              <div className="goal-progress-row"><div className="htd-progress"><div className="htd-progress-fill" style={{ width: `${pct}%`, background: "var(--warning)" }} /></div><span>{pct}%</span></div>
              {g.milestones?.length > 0 && (
                <div className="milestone-list">
                  {g.milestones.map((m) => (
                    <div key={m.id} className="week-goal-row">
                      <button className={"checkbox" + (m.done ? " checked" : "")} onClick={() => onToggleMilestone(g.id, m.id)}>{m.done && <Check size={12} strokeWidth={3} />}</button>
                      <span className={m.done ? "strike" : ""}>{m.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {linked.length > 0 && <div className="linked-hint">{linkedDone}/{linked.length} linked tasks complete</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== FITNESS VIEW ============================== */
function FitnessView({ tasks, fitness, setFitness, today, onToggle, onAdd, onEdit }) {
  const workouts = tasks.filter((t) => t.category === "fitness" && t.date === today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i));
  const weekWorkouts = tasks.filter((t) => t.category === "fitness" && weekDays.includes(t.date));
  const weekDone = weekWorkouts.filter((t) => t.completed).length;
  const water = fitness.water[today] || 0;
  const weightLog = fitness.weight || [];
  const [newWeight, setNewWeight] = useState("");

  const setWater = (n) => setFitness((p) => ({ ...p, water: { ...p.water, [today]: Math.max(0, n) } }));
  const addWeight = () => {
    if (!newWeight) return;
    setFitness((p) => ({ ...p, weight: [...(p.weight || []), { date: today, value: parseFloat(newWeight) }] }));
    setNewWeight("");
  };

  return (
    <div className="view-scroll">
      <div className="page-head-row">
        <div><div className="eyebrow">Health</div><h1 className="page-title">Fitness</h1></div>
        <button className="primary-btn" onClick={onAdd}><Plus size={16} /> Log workout</button>
      </div>

      <div className="daily-grid">
        <div className="mini-card">
          <div className="card-head"><span>Today's workouts</span></div>
          {workouts.length === 0 ? <div className="empty-hint">No workouts logged today.</div> :
            workouts.map((t) => <TaskRow key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={() => {}} onDuplicate={() => {}} compact />)}
        </div>

        <div className="side-col">
          <div className="mini-card">
            <div className="card-head"><Droplet size={14} /><span>Water tracker</span></div>
            <div className="water-row">
              <button className="icon-btn" onClick={() => setWater(water - 1)}>−</button>
              <div className="water-count">{water} <span>cups</span></div>
              <button className="icon-btn" onClick={() => setWater(water + 1)}>+</button>
            </div>
            <div className="water-glasses">{Array.from({ length: 8 }, (_, i) => <Droplet key={i} size={16} className={i < water ? "filled" : ""} />)}</div>
          </div>

          <div className="mini-card">
            <div className="card-head"><Weight size={14} /><span>Weight tracker</span></div>
            <div className="inline-add">
              <input type="number" placeholder="Log today's weight" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWeight()} />
              <button className="ghost-btn small" onClick={addWeight}>Log</button>
            </div>
            {weightLog.length > 0 && (
              <div className="weight-list">
                {weightLog.slice(-5).reverse().map((w, i) => <div key={i} className="week-goal-row"><span>{w.date}</span><span>{w.value} lb</span></div>)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mini-card">
        <div className="card-head"><TrendingUp size={14} /><span>Weekly workout summary</span></div>
        <div className="week-summary">
          <div className="stat-pill"><Check size={14} /> {weekDone}/{weekWorkouts.length} sessions this week</div>
        </div>
        <div className="mini-bars">
          {weekDays.map((iso) => {
            const dTasks = tasks.filter((t) => t.category === "fitness" && t.date === iso);
            const dDone = dTasks.filter((t) => t.completed).length;
            const h = dTasks.length ? (dDone / dTasks.length) * 100 : 0;
            return (
              <div className="mini-bar-col" key={iso}>
                <div className="mini-bar-track"><div className="mini-bar-fill" style={{ height: `${h}%` }} /></div>
                <span>{new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "narrow" })}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================== STATS VIEW ============================== */
function StatsView({ tasks, goals, streak }) {
  const today = todayISO();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i));
  const monthPrefix = monthKey(today);

  const doneToday = tasks.filter((t) => t.date === today && t.completed).length;
  const totalToday = tasks.filter((t) => t.date === today).length;
  const doneWeek = tasks.filter((t) => weekDays.includes(t.date) && t.completed).length;
  const totalWeek = tasks.filter((t) => weekDays.includes(t.date)).length;
  const doneMonth = tasks.filter((t) => t.date.startsWith(monthPrefix) && t.completed).length;
  const totalMonth = tasks.filter((t) => t.date.startsWith(monthPrefix)).length;
  const completionRate = tasks.length ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100) : 0;

  const catBreak = CATEGORY_KEYS.map((c) => ({ c, total: tasks.filter((t) => t.category === c).length, done: tasks.filter((t) => t.category === c && t.completed).length }));
  const maxCat = Math.max(1, ...catBreak.map((c) => c.total));

  const trend = weekDays.map((iso) => {
    const list = tasks.filter((t) => t.date === iso);
    return { iso, pct: list.length ? Math.round((list.filter((t) => t.completed).length / list.length) * 100) : 0 };
  });

  return (
    <div className="view-scroll">
      <div className="eyebrow">Insights</div>
      <h1 className="page-title">Statistics</h1>

      <div className="stats-cards">
        <div className="stat-card"><span className="stat-num">{doneToday}/{totalToday}</span><span className="stat-label">Today</span></div>
        <div className="stat-card"><span className="stat-num">{doneWeek}/{totalWeek}</span><span className="stat-label">This week</span></div>
        <div className="stat-card"><span className="stat-num">{doneMonth}/{totalMonth}</span><span className="stat-label">This month</span></div>
        <div className="stat-card"><span className="stat-num">{completionRate}%</span><span className="stat-label">Completion rate</span></div>
        <div className="stat-card"><span className="stat-num">{streak}</span><span className="stat-label">Day streak</span></div>
      </div>

      <div className="daily-grid">
        <div className="mini-card">
          <div className="card-head"><BarChart3 size={14} /><span>Category breakdown</span></div>
          {catBreak.map((c) => (
            <div className="cat-bar-row" key={c.c}>
              <span className="cat-bar-label">{React.createElement(CATEGORY_VISUALS[c.c].icon, { size: 13 })} {CATEGORIES[c.c].label}</span>
              <div className="cat-bar-track"><div className="cat-bar-fill" style={{ width: `${(c.total / maxCat) * 100}%`, background: CATEGORY_VISUALS[c.c].color }} /></div>
              <span className="cat-bar-num">{c.done}/{c.total}</span>
            </div>
          ))}
        </div>
        <div className="mini-card">
          <div className="card-head"><TrendingUp size={14} /><span>Productivity trend (7 days)</span></div>
          <div className="mini-bars tall">
            {trend.map((d) => (
              <div className="mini-bar-col" key={d.iso}>
                <div className="mini-bar-track"><div className="mini-bar-fill trend" style={{ height: `${d.pct}%` }} /></div>
                <span>{new Date(d.iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "narrow" })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mini-card">
        <div className="card-head"><span>Goal progress</span></div>
        {goals.length === 0 ? <div className="empty-hint">No goals yet.</div> : goals.map((g) => {
          const msDone = (g.milestones || []).filter((m) => m.done).length;
          const pct = g.milestones?.length ? Math.round((msDone / g.milestones.length) * 100) : (g.progress || 0);
          return (
            <div className="cat-bar-row" key={g.id}>
              <span className="cat-bar-label">{g.title}</span>
              <div className="cat-bar-track"><div className="cat-bar-fill" style={{ width: `${pct}%`, background: "var(--warning)" }} /></div>
              <span className="cat-bar-num">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== TASK MODAL ============================== */
function TaskModal({ data, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    id: data.id || null, title: data.title || "", category: data.category || "personal",
    priority: data.priority || "medium", dueTime: data.dueTime || "", duration: data.duration || "",
    notes: data.notes || "", tags: (data.tags || []).join(", "), color: data.color || "",
    recurrence: data.recurrence || "none", date: data.date || todayISO(), progress: data.progress || 0,
    completed: data.completed || false,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), duration: form.duration ? parseInt(form.duration, 10) : null });
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{form.id ? "Edit task" : "New task"}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="field"><span>Title</span><input autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="What needs to get done?" /></label>

          <div className="field-row">
            <label className="field"><span>Category</span>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}>{CATEGORY_KEYS.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}</select>
            </label>
            <label className="field"><span>Priority</span>
              <select value={form.priority} onChange={(e) => set("priority", e.target.value)}>{Object.keys(PRIORITIES).map((p) => <option key={p} value={p}>{PRIORITIES[p].label}</option>)}</select>
            </label>
          </div>

          <div className="field-row">
            <label className="field"><span>Date</span><input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
            <label className="field"><span>Due time</span><input type="time" value={form.dueTime} onChange={(e) => set("dueTime", e.target.value)} /></label>
            <label className="field"><span>Duration (min)</span><input type="number" min="0" value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="30" /></label>
          </div>

          <label className="field"><span>Recurrence</span>
            <select value={form.recurrence} onChange={(e) => set("recurrence", e.target.value)}>{RECURRENCE_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select>
          </label>

          <label className="field"><span>Tags (comma separated)</span><input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="deadline, client" /></label>

          <label className="field"><span>Color override</span>
            <div className="color-swatches">
              {["", "var(--primary)", "var(--secondary)", "var(--accent)", "var(--warning)", "var(--danger)"].map((c) => (
                <button key={c || "none"} className={"swatch" + (form.color === c ? " active" : "")} style={{ background: c || "transparent", borderStyle: c ? "solid" : "dashed" }} onClick={() => set("color", c)} />
              ))}
            </div>
          </label>

          <label className="field"><span>Notes</span><textarea className="notes-area" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional details…" /></label>

          <label className="field"><span>Progress: {form.progress}%</span>
            <input type="range" min="0" max="100" value={form.progress} onChange={(e) => set("progress", parseInt(e.target.value, 10))} />
          </label>
        </div>
        <div className="modal-foot">
          {form.id && <button className="ghost-btn danger" onClick={() => onDelete(form.id)}><Trash2 size={14} /> Delete</button>}
          <div className="spacer" />
          <button className="ghost-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" onClick={submit}><Check size={15} /> Save task</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== GOAL MODAL ============================== */
function GoalModal({ data, tasks, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    id: data.id || null, title: data.title || "", description: data.description || "",
    targetDate: data.targetDate || "", progress: data.progress || 0,
    milestones: data.milestones || [], linkedTaskIds: data.linkedTaskIds || [],
  });
  const [msInput, setMsInput] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const addMilestone = () => { if (!msInput.trim()) return; setForm((p) => ({ ...p, milestones: [...p.milestones, { id: generateId(), title: msInput.trim(), done: false }] })); setMsInput(""); };
  const toggleLink = (taskId) => {
    setForm((p) => {
      const linked = p.linkedTaskIds || [];
      const next = linked.includes(taskId) ? linked.filter((id) => id !== taskId) : [...linked, taskId];
      return { ...p, linkedTaskIds: next };
    });
  };
  const visibleTasks = (tasks || [])
    .filter((t) => !taskFilter.trim() || t.title.toLowerCase().includes(taskFilter.toLowerCase()))
    .slice(0, 50); // a hard cap keeps this usable even with a very large task history
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{form.id ? "Edit goal" : "New goal"}</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <label className="field"><span>Title</span><input autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Learn C#" /></label>
          <label className="field"><span>Description</span><textarea className="notes-area" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Why does this matter?" /></label>
          <label className="field"><span>Target date</span><input type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)} /></label>
          <label className="field"><span>Overall progress: {form.progress}%</span><input type="range" min="0" max="100" value={form.progress} onChange={(e) => set("progress", parseInt(e.target.value, 10))} /></label>
          <label className="field"><span>Milestones</span>
            <div className="inline-add">
              <input value={msInput} onChange={(e) => setMsInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMilestone()} placeholder="Add a milestone…" />
              <button className="ghost-btn small" onClick={addMilestone}>Add</button>
            </div>
            {form.milestones.map((m) => (
              <div key={m.id} className="week-goal-row">
                <button className={"checkbox" + (m.done ? " checked" : "")} onClick={() => set("milestones", form.milestones.map((x) => x.id === m.id ? { ...x, done: !x.done } : x))}>{m.done && <Check size={12} strokeWidth={3} />}</button>
                <span className={m.done ? "strike" : ""} style={{ flex: 1 }}>{m.title}</span>
                <button className="icon-btn tiny danger" onClick={() => set("milestones", form.milestones.filter((x) => x.id !== m.id))}><X size={12} /></button>
              </div>
            ))}
          </label>
          <label className="field"><span>Linked tasks ({form.linkedTaskIds.length} selected)</span>
            <input placeholder="Search your tasks…" value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)} />
            <div className="linked-task-list">
              {visibleTasks.length === 0 && <div className="empty-hint">No matching tasks.</div>}
              {visibleTasks.map((t) => (
                <div key={t.id} className="week-goal-row" onClick={() => toggleLink(t.id)} style={{ cursor: "pointer" }}>
                  <button className={"checkbox" + (form.linkedTaskIds.includes(t.id) ? " checked" : "")} onClick={(e) => { e.stopPropagation(); toggleLink(t.id); }}>
                    {form.linkedTaskIds.includes(t.id) && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span className={t.completed ? "strike" : ""} style={{ flex: 1 }}>{t.title}</span>
                  <span className="reminder-row-meta">{t.date}</span>
                </div>
              ))}
            </div>
          </label>
        </div>
        <div className="modal-foot">
          {form.id && <button className="ghost-btn danger" onClick={() => onDelete(form.id)}><Trash2 size={14} /> Delete</button>}
          <div className="spacer" />
          <button className="ghost-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" onClick={() => form.title.trim() && onSave(form)}><Check size={15} /> Save goal</button>
        </div>
      </div>
    </div>
  );
}

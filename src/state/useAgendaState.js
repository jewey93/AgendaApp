/**
 * STATE LAYER — useAgendaState
 * ------------------------------------------------------------------
 * This hook is the "wiring closet" of the app. It's the only place
 * that:
 *   - holds the actual React state
 *   - decides WHEN to load/save (on mount, debounced on change)
 *   - calls domain functions (createTask, parseCaptureText) to apply
 *     business rules
 *   - calls the repository (src/data) to persist
 *
 * UI components never call the repository directly, and never
 * construct a task object by hand — they call the actions this hook
 * returns (addTask, addTasksFromCapture, toggleComplete, ...). That
 * means if a rule ever changes ("tasks need a default duration of 15
 * minutes," say), you change it in ONE place — the domain layer, used
 * by this hook — and every screen that creates tasks picks it up
 * automatically.
 *
 * If you redesign the UI later, this file doesn't change. The new UI
 * just calls the same actions.
 * ------------------------------------------------------------------
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { loadAgendaData, saveAgendaData } from "../data/taskRepository.js";
import { createTask, computeStreak } from "../domain/taskModel.js";
import { parseCaptureText } from "../domain/captureParser.js";
import { todayISO } from "../domain/dateUtils.js";
import { createJournalEntry } from "../domain/journalModel.js";
import { createEvent } from "../domain/eventModel.js";
import { generateDueOccurrences } from "../domain/recurrenceModel.js";
import { generateId } from "../domain/id.js";

const DEFAULT_POMODORO = { secs: 25 * 60, running: false, mode: "focus" };

function seedTasks() {
  const t = todayISO();
  return [
    createTask({ title: "Ship weekly report", category: "work", priority: "high", dueTime: "11:00", duration: 45, tags: ["deadline"], date: t }),
    createTask({ title: "30 min run", category: "fitness", priority: "medium", dueTime: "07:00", duration: 30, recurrence: "daily", date: t }),
    createTask({ title: "Reply to client emails", category: "haveToDo", priority: "high", dueTime: "09:30", duration: 20, recurrence: "weekdays", date: t }),
    createTask({ title: "Grocery run", category: "personal", priority: "low", dueTime: "18:00", duration: 40, notes: "Milk, eggs, greens", tags: ["errand"], date: t }),
  ];
}

export function useAgendaState(encryptionKey) {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [fitness, setFitness] = useState({ water: {}, weight: [] });
  const [dayNotes, setDayNotes] = useState({});
  const [weekGoals, setWeekGoals] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [events, setEvents] = useState([]);
  const [dark, setDark] = useState(false);
  const [streak, setStreak] = useState(0);
  const [pomodoro, setPomodoro] = useState(DEFAULT_POMODORO);
  const [toast, setToast] = useState(null);
  const recurrenceCheckedRef = useRef(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // ---- load once on mount (waits for the encryption key) ----
  useEffect(() => {
    if (!encryptionKey) return;
    (async () => {
      try {
        const d = await loadAgendaData(encryptionKey);
        if (d) {
          setTasks(d.tasks?.length ? d.tasks : seedTasks());
          setGoals(d.goals || []);
          setFitness(d.fitness || { water: {}, weight: [] });
          setDayNotes(d.dayNotes || {});
          setWeekGoals(d.weekGoals || []);
          setJournalEntries(d.journalEntries || []);
          setEvents(d.events || []);
          setDark(!!d.dark);
          // pomodoro is restored as-is (including a possibly-mid-countdown
          // state) rather than reset, so a page refresh no longer wipes an
          // in-progress focus session back to 25:00.
          setPomodoro(d.pomodoro || DEFAULT_POMODORO);
          // streak is recomputed below from actual task history rather
          // than trusted from storage, so stale/incorrect saved values
          // from before this fix self-correct automatically.
        } else {
          setTasks(seedTasks());
        }
      } catch (e) {
        // EncryptionGate already verified the passphrase before this hook
        // ever ran, so reaching here means something unexpected happened
        // (corrupted data, etc) — leave state empty rather than silently
        // replacing real data with demo tasks.
        console.error("Failed to load agenda data:", e);
      }
      setReady(true);
    })();
  }, [encryptionKey]);

  // ---- debounced save on any change ----
  useEffect(() => {
    if (!ready || !encryptionKey) return;
    const h = setTimeout(() => {
      saveAgendaData({ tasks, goals, fitness, dayNotes, weekGoals, journalEntries, events, dark, streak, pomodoro }, encryptionKey).catch(() => {});
    }, 400);
    return () => clearTimeout(h);
  }, [tasks, goals, fitness, dayNotes, weekGoals, journalEntries, events, dark, streak, pomodoro, ready, encryptionKey]);

  // ---- pomodoro ticking ----
  // Lives here (rather than in the UI) so it's part of the same state
  // object that gets persisted above — a refresh mid-countdown now
  // resumes instead of resetting.
  useEffect(() => {
    if (!pomodoro.running) return;
    const t = setInterval(() => {
      setPomodoro((p) => {
        if (p.secs <= 1) {
          const nextMode = p.mode === "focus" ? "break" : "focus";
          return { secs: nextMode === "focus" ? 25 * 60 : 5 * 60, running: false, mode: nextMode };
        }
        return { ...p, secs: p.secs - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pomodoro.running]);

  // ---- recurring task generation ----
  // Runs once per session, right after the real data has loaded: checks
  // every recurring series and adds today's occurrence if it's due and
  // doesn't already exist. See domain/recurrenceModel.js for the rules.
  useEffect(() => {
    if (!ready || recurrenceCheckedRef.current) return;
    recurrenceCheckedRef.current = true;
    const due = generateDueOccurrences(tasks, todayISO());
    if (due.length > 0) setTasks((prev) => [...prev, ...due]);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- task actions ----
  const addTask = useCallback((partial) => {
    setTasks((prev) => [...prev, createTask(partial)]);
    showToast("Task added");
  }, []);

  /**
   * The action behind the new Capture screen. Delegates the actual
   * text-parsing to the domain layer (parseCaptureText), then turns
   * each draft into a real task via createTask so every task -
   * however it was authored - ends up with the same shape and
   * defaults. Returns how many tasks were created, so the UI can
   * show a confirmation without needing to know HOW parsing works.
   */
  const addTasksFromCapture = useCallback((rawText, date = todayISO()) => {
    const drafts = parseCaptureText(rawText);
    if (!drafts.length) return 0;
    setTasks((prev) => [...prev, ...drafts.map((d) => createTask({ ...d, date }))]);
    showToast(`${drafts.length} task${drafts.length === 1 ? "" : "s"} captured`);
    return drafts.length;
  }, []);

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast("Task deleted");
  }, []);

  const duplicateTask = useCallback((id) => {
    setTasks((prev) => {
      const orig = prev.find((t) => t.id === id);
      if (!orig) return prev;
      return [...prev, createTask({ ...orig, id: undefined, seriesId: undefined, title: orig.title + " (copy)", completed: false })];
    });
    showToast("Task duplicated");
  }, []);

  const toggleComplete = useCallback((id) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const completed = !t.completed;
      return { ...t, completed, completedAt: completed ? Date.now() : null, progress: completed ? 100 : t.progress };
    }));
  }, []);

  const reorderTasks = useCallback((fromId, toId) => {
    setTasks((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((t) => t.id === fromId);
      const toIdx = arr.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  }, []);

  /**
   * Drag-and-drop reschedule: moves a task to a different date without
   * touching any other field. Kept as its own named action (rather than
   * having the UI call updateTask directly) so the "what does it mean to
   * reschedule a task" decision — currently just swapping the date, but
   * could later e.g. clear a now-stale dueTime — lives in one place.
   */
  const rescheduleTask = useCallback((id, newDate) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, date: newDate } : t)));
    showToast("Task rescheduled");
  }, []);

  // ---- goal actions ----
  const saveGoal = useCallback((g) => {
    setGoals((prev) => (g.id ? prev.map((x) => (x.id === g.id ? g : x)) : [...prev, { ...g, id: generateId(), milestones: g.milestones || [], linkedTaskIds: g.linkedTaskIds || [] }]));
    showToast("Goal saved");
  }, []);
  const deleteGoal = useCallback((id) => setGoals((prev) => prev.filter((g) => g.id !== id)), []);
  const toggleMilestone = useCallback((goalId, milestoneId) => {
    setGoals((prev) => prev.map((g) => (g.id !== goalId ? g : { ...g, milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)) })));
  }, []);
  const toggleLinkedTask = useCallback((goalId, taskId) => {
    setGoals((prev) => prev.map((g) => {
      if (g.id !== goalId) return g;
      const linked = g.linkedTaskIds || [];
      const next = linked.includes(taskId) ? linked.filter((id) => id !== taskId) : [...linked, taskId];
      return { ...g, linkedTaskIds: next };
    }));
  }, []);

  // ---- journal actions ----
  const addJournalEntry = useCallback((partial) => {
    setJournalEntries((prev) => [...prev, createJournalEntry(partial)]);
    showToast("Journal entry saved");
  }, []);
  const updateJournalEntry = useCallback((id, patch) => {
    setJournalEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)));
  }, []);
  const deleteJournalEntry = useCallback((id) => {
    setJournalEntries((prev) => prev.filter((e) => e.id !== id));
    showToast("Entry deleted");
  }, []);

  // ---- event actions ----
  const addEvent = useCallback((partial) => {
    setEvents((prev) => [...prev, createEvent(partial)]);
    showToast("Event added");
  }, []);
  const deleteEvent = useCallback((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ---- streak: recomputed from real task history whenever tasks change ----
  useEffect(() => {
    setStreak(computeStreak(tasks, todayISO()));
  }, [tasks]);

  return {
    ready, tasks, goals, fitness, dayNotes, weekGoals, journalEntries, events, dark, streak, pomodoro, toast,
    setFitness, setDayNotes, setWeekGoals, setDark, setPomodoro,
    addTask, addTasksFromCapture, updateTask, deleteTask, duplicateTask, toggleComplete, reorderTasks, rescheduleTask,
    saveGoal, deleteGoal, toggleMilestone, toggleLinkedTask,
    addJournalEntry, updateJournalEntry, deleteJournalEntry,
    addEvent, deleteEvent,
  };
}

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
/* eslint-disable react-hooks/exhaustive-deps */
import { loadAgendaData, saveAgendaData } from "../data/taskRepository.js";
import { createTask, computeStreak } from "../domain/taskModel.js";
import { parseCaptureText } from "../domain/captureParser.js";
import { todayISO } from "../domain/dateUtils.js";
import { createJournalEntry } from "../domain/journalModel.js";
import { createEvent } from "../domain/eventModel.js";
import { generateDueOccurrences } from "../domain/recurrenceModel.js";
import { generateId } from "../domain/id.js";

const DEFAULT_POMODORO = { secs: 60 * 60, running: false, mode: "focus" };

function seedTasks() {
  const t = todayISO();
  return [
    createTask({ title: "Ship weekly report", category: "work", priority: "high", dueTime: "11:00", duration: 45, tags: ["deadline"], date: t }),
    createTask({ title: "30 min run", category: "fitness", priority: "medium", dueTime: "07:00", duration: 30, recurrence: "daily", date: t }),
    createTask({ title: "Reply to client emails", category: "haveToDo", priority: "high", dueTime: "09:30", duration: 20, recurrence: "weekdays", date: t }),
    createTask({ title: "Grocery run", category: "personal", priority: "low", dueTime: "18:00", duration: 40, notes: "Milk, eggs, greens", tags: ["errand"], date: t }),
  ];
}

export function useAgendaState() {
  const [ready, setReady] = useState(false);
  // True only when the initial load failed. The UI shows a "couldn't load /
  // retry" screen instead of an empty agenda, so a transient error can never
  // be mistaken for "my data is gone" and — critically — the save effect
  // below never runs, so we never overwrite real stored data with blanks.
  const [loadError, setLoadError] = useState(false);
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
  // React.StrictMode (see main.jsx) mounts every component twice in dev to
  // surface effects that aren't safe to run more than once. This guard
  // makes the initial load run exactly once so a redundant second load
  // can't resolve late and clobber state the recurrence effect already
  // updated (which used to pile up duplicate generated tasks).
  const loadedRef = useRef(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // ---- load (runs once on mount; also re-runnable via retryLoad) ----
  const loadData = useCallback(async () => {
    setLoadError(false);
    try {
      const d = await loadAgendaData();
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
      // Only now is it safe to persist: we have confirmed what's in storage
      // (either real data or genuinely none). Flipping `ready` here — and
      // ONLY here, never in the error path — is what lets the debounced save
      // run. A failed load leaves `ready` false, so the save effect can never
      // overwrite the user's stored tasks with empty/seed state.
      setReady(true);
    } catch (e) {
      console.error("Failed to load agenda data:", e);
      // Do NOT flip `ready` and do NOT seed — surface a retry screen instead.
      // This is the fix for tasks silently vanishing: a transient load error
      // used to fall through to an empty state that the save effect then
      // wrote back over the real data.
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadData();
  }, [loadData]);

  // Manual retry for the error screen. Resets the once-only guard so the
  // load can actually run again.
  const retryLoad = useCallback(() => {
    loadedRef.current = true;
    loadData();
  }, [loadData]);

  // ---- debounced save on any change ----
  useEffect(() => {
    // `ready` is true only after a *successful* load, so this never fires
    // while the initial read is pending or has failed — the save can't race
    // ahead of the load and blank out stored data.
    if (!ready) return;
    const h = setTimeout(() => {
      // A failed save used to fail completely silently, which made
      // symptoms like "my changes don't survive a refresh" impossible to
      // diagnose from the console. Now it's at least logged.
      saveAgendaData({ tasks, goals, fitness, dayNotes, weekGoals, journalEntries, events, dark, streak, pomodoro })
        .catch((e) => console.error("Failed to save agenda data:", e));
    }, 400);
    return () => clearTimeout(h);
  }, [tasks, goals, fitness, dayNotes, weekGoals, journalEntries, events, dark, streak, pomodoro, ready]);

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
          return { secs: nextMode === "focus" ? 60 * 60 : 5 * 60, running: false, mode: nextMode };
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

  /**
   * Deleting a task that belongs to a recurring series removes the
   * WHOLE series, not just today's instance. Without this, the
   * recurrence engine (see domain/recurrenceModel.js) has no concept
   * of "this series was cancelled" — on the next load it just sees a
   * series with no occurrence dated today and regenerates one, so a
   * deleted recurring task would silently reappear after a refresh.
   * Deleting every instance sharing the same seriesId closes that gap:
   * there's no root left for the generator to regenerate from.
   */
  const deleteTask = useCallback((id) => {
    setTasks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      const isRecurring = target.recurrence && target.recurrence !== "none";
      if (!isRecurring) return prev.filter((t) => t.id !== id);
      const seriesId = target.seriesId || target.id;
      return prev.filter((t) => (t.seriesId || t.id) !== seriesId);
    });
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

  /**
   * Drag-and-drop reorder. Dropping a task onto another task's row
   * moves it next to that task — and if the target belongs to a
   * different category, the dragged task is reassigned to that
   * category too. That's what makes dragging a task from the "Work"
   * card onto the "Personal" card actually move it into Personal,
   * instead of just shuffling its position while the category label
   * stays the same.
   */
  const reorderTasks = useCallback((fromId, toId) => {
    setTasks((prev) => {
      if (fromId === toId) return prev;
      const arr = [...prev];
      const fromIdx = arr.findIndex((t) => t.id === fromId);
      const toIdx = arr.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const toTask = arr[toIdx];
      const [moved] = arr.splice(fromIdx, 1);
      const updated = moved.category === toTask.category ? moved : { ...moved, category: toTask.category };
      const insertAt = arr.findIndex((t) => t.id === toId);
      arr.splice(insertAt, 0, updated);
      return arr;
    });
  }, []);

  /**
   * Companion to reorderTasks for dropping a task onto a category card
   * itself (empty space, not a specific row) — reassigns its category
   * and settles it at the end of that category's group so it lands
   * visually at the bottom of the target card.
   */
  const moveTaskToCategory = useCallback((id, category) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0 || prev[idx].category === category) return prev;
      const arr = [...prev];
      const [moved] = arr.splice(idx, 1);
      const updated = { ...moved, category };
      let insertAt = arr.length;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].category === category) { insertAt = i + 1; break; }
      }
      arr.splice(insertAt, 0, updated);
      return arr;
    });
    showToast("Task moved");
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
    ready, loadError, retryLoad,
    tasks, goals, fitness, dayNotes, weekGoals, journalEntries, events, dark, streak, pomodoro, toast,
    setFitness, setDayNotes, setWeekGoals, setDark, setPomodoro,
    addTask, addTasksFromCapture, updateTask, deleteTask, duplicateTask, toggleComplete, reorderTasks, moveTaskToCategory, rescheduleTask,
    saveGoal, deleteGoal, toggleMilestone, toggleLinkedTask,
    addJournalEntry, updateJournalEntry, deleteJournalEntry,
    addEvent, deleteEvent,
  };
}

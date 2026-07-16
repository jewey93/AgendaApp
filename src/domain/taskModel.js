/**
 * DOMAIN LAYER — Task model & business rules
 * ------------------------------------------------------------------
 * This file answers "what IS a task, and what are the rules around
 * it" — nothing about how it's drawn on screen, nothing about how
 * it's saved. Deliberately: colors and icons are a *presentation*
 * decision (they live in src/ui/theme.js), not a business rule. A
 * task's category is "work" — whether "work" renders as blue with a
 * briefcase icon is a UI concern that could change with a redesign
 * without touching this file at all.
 * ------------------------------------------------------------------
 */

// Stable identifiers only. No colors, no icons, no JSX.
export const CATEGORY_KEYS = ["haveToDo", "work", "personal", "fitness", "goals"];

export const CATEGORIES = {
  haveToDo: { key: "haveToDo", label: "Have To Do" },
  work: { key: "work", label: "Work" },
  personal: { key: "personal", label: "Personal" },
  fitness: { key: "fitness", label: "Fitness" },
  goals: { key: "goals", label: "Goals" },
};

export const PRIORITY_KEYS = ["high", "medium", "low"];

export const PRIORITIES = {
  high: { key: "high", label: "High", weight: 3 },
  medium: { key: "medium", label: "Medium", weight: 2 },
  low: { key: "low", label: "Low", weight: 1 },
};

export const RECURRENCE_OPTIONS = [
  { key: "none", label: "Does not repeat" },
  { key: "daily", label: "Daily" },
  { key: "weekdays", label: "Weekdays only" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Every two weeks" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

import { generateId } from "./id.js";

/**
 * The single source of truth for "what fields does a task have, and
 * what are sane defaults." Every task in the app — whether typed by
 * hand in a form, or generated from the rapid-capture parser — passes
 * through this factory. That guarantees every task object has the
 * same shape, so UI components never have to guess whether `tags`
 * might be undefined.
 */
export function createTask(partial = {}) {
  const id = partial.id || generateId();
  return {
    id,
    title: partial.title?.trim() || "Untitled task",
    category: CATEGORY_KEYS.includes(partial.category) ? partial.category : "personal",
    priority: PRIORITY_KEYS.includes(partial.priority) ? partial.priority : "medium",
    date: partial.date || todayISODefault(),
    dueTime: partial.dueTime || null,
    duration: partial.duration ?? null,
    notes: partial.notes || "",
    tags: partial.tags || [],
    color: partial.color || null,
    recurrence: partial.recurrence || "none",
    // Every task that's part of a recurring series shares the same
    // seriesId (defaulting to its own id when first created). This is
    // what lets the recurrence engine tell "another occurrence of this
    // same series" apart from "a coincidentally similar task" without
    // fragile title-matching. See domain/recurrenceModel.js.
    seriesId: partial.seriesId || id,
    progress: partial.progress ?? 0,
    completed: partial.completed ?? false,
    completedAt: partial.completedAt ?? null,
    createdAt: partial.createdAt || Date.now(),
  };
}

// Avoids importing dateUtils just for a default — keeps this module dependency-light.
function todayISODefault() {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(task, todayIso) {
  return !task.completed && task.date < todayIso;
}

export function completionStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pct };
}

export function sortByPriority(tasks) {
  return [...tasks].sort((a, b) => (PRIORITIES[b.priority]?.weight || 0) - (PRIORITIES[a.priority]?.weight || 0));
}

/**
 * Counts consecutive fully-completed days ending at today (if today's
 * tasks are already all done) or ending at yesterday (if today isn't
 * finished yet — an in-progress day shouldn't break the streak before
 * it's even over). A day only counts if it had at least one task AND
 * every task on it is completed. Previously this was a stub that only
 * ever showed 0 or 1 regardless of actual history — this recomputes
 * the real streak from task history every time tasks change.
 */
export function computeStreak(tasks, todayIso) {
  const byDate = new Map();
  for (const t of tasks) {
    if (!byDate.has(t.date)) byDate.set(t.date, []);
    byDate.get(t.date).push(t);
  }
  const isDayComplete = (iso) => {
    const list = byDate.get(iso);
    return !!list && list.length > 0 && list.every((t) => t.completed);
  };
  const shiftIso = (iso, days) => {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  let streak = 0;
  let cursor = isDayComplete(todayIso) ? todayIso : shiftIso(todayIso, -1);
  while (isDayComplete(cursor)) {
    streak += 1;
    cursor = shiftIso(cursor, -1);
  }
  return streak;
}

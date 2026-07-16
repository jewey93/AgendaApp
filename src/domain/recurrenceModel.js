/**
 * DOMAIN LAYER — Recurrence rules
 * ------------------------------------------------------------------
 * Previously, setting a task's recurrence to "Daily" or "Weekly" just
 * stored that label — nothing ever generated tomorrow's occurrence.
 * This file is the missing piece: pure functions that decide whether
 * a series should have an occurrence on a given date, and produce the
 * list of new task drafts needed to catch a series up to today.
 *
 * Design choice: generation happens client-side, on load, rather than
 * via a server-side scheduled job. That means occurrences only appear
 * once someone actually opens the app on or after their due date —
 * acceptable for a personal planner, but worth knowing if this ever
 * needs to notify someone who hasn't opened the app in days (a
 * server-side cron/edge function would be the next step for that).
 * ------------------------------------------------------------------
 */
import { createTask } from "./taskModel.js";

function daysBetween(fromIso, toIso) {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  return Math.round((to - from) / 86_400_000);
}

/**
 * Given a series' recurrence rule and the date its FIRST occurrence
 * was created on, does this series land on targetDateIso?
 */
export function shouldOccurOn(recurrence, originalDateIso, targetDateIso) {
  if (!recurrence || recurrence === "none") return false;
  if (targetDateIso < originalDateIso) return false;

  const original = new Date(originalDateIso + "T00:00:00");
  const target = new Date(targetDateIso + "T00:00:00");
  const targetDow = target.getDay();

  switch (recurrence) {
    case "daily":
      return true;
    case "weekdays":
      return targetDow >= 1 && targetDow <= 5;
    case "weekly":
      return targetDow === original.getDay();
    case "biweekly":
      return targetDow === original.getDay() && daysBetween(originalDateIso, targetDateIso) % 14 === 0;
    case "monthly":
      return target.getDate() === original.getDate();
    case "yearly":
      return target.getDate() === original.getDate() && target.getMonth() === original.getMonth();
    default:
      return false;
  }
}

/**
 * Looks across all tasks, groups them by seriesId, and for each
 * recurring series whose earliest occurrence implies it should exist
 * on todayIso — but doesn't yet — produces a new task draft for it.
 * Returns an array of ready-to-add Task objects (already run through
 * createTask), which the caller just needs to append to state.
 */
export function generateDueOccurrences(tasks, todayIso) {
  const bySeries = new Map();
  for (const t of tasks) {
    const key = t.seriesId || t.id;
    if (!bySeries.has(key)) bySeries.set(key, []);
    bySeries.get(key).push(t);
  }

  const newTasks = [];
  for (const [seriesId, instances] of bySeries) {
    const root = instances.reduce((earliest, t) => (t.date < earliest.date ? t : earliest));
    if (!root.recurrence || root.recurrence === "none") continue;
    const alreadyHasToday = instances.some((t) => t.date === todayIso);
    if (alreadyHasToday) continue;
    if (!shouldOccurOn(root.recurrence, root.date, todayIso)) continue;

    newTasks.push(
      createTask({
        title: root.title,
        category: root.category,
        priority: root.priority,
        dueTime: root.dueTime,
        duration: root.duration,
        notes: root.notes,
        tags: root.tags,
        color: root.color,
        recurrence: root.recurrence,
        seriesId,
        date: todayIso,
      })
    );
  }
  return newTasks;
}

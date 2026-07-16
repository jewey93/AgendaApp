/**
 * DOMAIN LAYER — Reminder rules
 * ------------------------------------------------------------------
 * Pure logic for "what deserves the person's attention right now,"
 * given a list of tasks and the current moment. This file has no idea
 * HOW that attention gets delivered — no Notification API, no toast,
 * no bell icon. That's intentional: the rule "due within 30 minutes
 * counts as due-soon" shouldn't be tangled up with browser permission
 * prompts or UI badge counts.
 * ------------------------------------------------------------------
 */
import { isOverdue } from "./taskModel.js";

export function isDueSoon(task, now, windowMinutes = 30) {
  if (task.completed || !task.dueTime) return false;
  const due = new Date(`${task.date}T${task.dueTime}:00`);
  const diffMinutes = (due.getTime() - now.getTime()) / 60000;
  // small negative grace window so a reminder doesn't vanish the instant the clock ticks past it
  return diffMinutes >= -2 && diffMinutes <= windowMinutes;
}

export function getReminders(tasks, now, windowMinutes = 30) {
  const todayIso = now.toISOString().slice(0, 10);
  const dueSoon = tasks.filter((t) => isDueSoon(t, now, windowMinutes));
  const overdue = tasks.filter((t) => isOverdue(t, todayIso));
  return { dueSoon, overdue };
}

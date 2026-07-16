/**
 * STATE LAYER — useReminders
 * ------------------------------------------------------------------
 * Deliberately a separate hook from useAgendaState: this one polls the
 * clock and triggers a side effect (a browser notification), which is
 * a different kind of concern than "own the data and persist it."
 * Keeping it separate means you could delete this hook entirely (say,
 * you decide reminders should be a server-side push notification
 * system instead) without touching how tasks are stored at all.
 *
 * It composes the same way everything else does: domain layer decides
 * WHAT counts as due-soon, data layer (notifier) knows HOW to alert,
 * this hook decides WHEN and de-duplicates so the same task doesn't
 * notify twice.
 * ------------------------------------------------------------------
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { getReminders } from "../domain/reminderModel.js";
import { notifier } from "../data/notifier.js";

const POLL_INTERVAL_MS = 30_000;
const DUE_SOON_WINDOW_MINUTES = 30;

export function useReminders(tasks) {
  const [now, setNow] = useState(() => new Date());
  const [permission, setPermission] = useState(notifier.permission());
  const notifiedIds = useRef(new Set());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const { dueSoon, overdue } = getReminders(tasks, now, DUE_SOON_WINDOW_MINUTES);

  useEffect(() => {
    dueSoon.forEach((task) => {
      if (notifiedIds.current.has(task.id)) return;
      notifiedIds.current.add(task.id);
      notifier.notify(task.title, { body: task.dueTime ? `Due at ${task.dueTime}` : "Due soon", tag: task.id });
    });
  }, [dueSoon]);

  const requestPermission = useCallback(async () => {
    const result = await notifier.requestPermission();
    setPermission(result);
  }, []);

  return { dueSoon, overdue, permission, requestPermission, supported: notifier.isSupported() };
}

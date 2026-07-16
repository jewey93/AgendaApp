/**
 * DOMAIN LAYER — ID generation
 * ------------------------------------------------------------------
 * One generator, used everywhere an id is needed (tasks, goals,
 * journal entries, events, milestones, week goals). Previously this
 * was duplicated per-model (each of taskModel.js, journalModel.js,
 * eventModel.js had its own near-identical uid() function) while some
 * UI-level code used crypto.randomUUID() with a Date.now() fallback
 * instead — two different schemes doing the same job. Consolidated
 * here so there's one place to change if the scheme ever needs to
 * improve (e.g. switching to crypto.randomUUID() everywhere once
 * IE11-era fallback concerns are irrelevant).
 * ------------------------------------------------------------------
 */
export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

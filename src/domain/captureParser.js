/**
 * DOMAIN LAYER — Capture parser
 * ------------------------------------------------------------------
 * The goal: let someone type a day's tasks the way they'd scribble
 * them on paper — one per line, in plain language — and still end up
 * with structured, organized tasks. So this parser looks for a small
 * set of optional inline shorthand markers, and if a line has none of
 * them, it still becomes a perfectly valid task (title only, medium
 * priority, "personal" category). The shorthand is additive, never
 * required — that's what keeps the "few clicks, uninterrupted typing"
 * feel intact.
 *
 * Recognized shorthand (all optional, any order, anywhere in the line):
 *   9am / 9:30am / 14:30      → due time
 *   !high  !medium  !low      → priority        (also accepts !h !m !l)
 *   @work @personal @fitness  → category         (also accepts @w @p @f @g @t)
 *   @goals @haveToDo (@t/@top)
 *   #tagname                  → tags (repeatable)
 *   ~30m / ~1h / ~90min       → estimated duration
 *
 * Example line:
 *   "9am finish deck for client !high @work #deadline ~45m"
 *   → { dueTime:"09:00", priority:"high", category:"work",
 *       tags:["deadline"], duration:45, title:"finish deck for client" }
 *
 * This file is intentionally framework-agnostic: no React, no
 * storage. Pure text in, plain objects out.
 * ------------------------------------------------------------------
 */

const CATEGORY_SHORTHAND = {
  w: "work", work: "work",
  p: "personal", personal: "personal",
  f: "fitness", fitness: "fitness",
  g: "goals", goals: "goals", goal: "goals",
  t: "haveToDo", top: "haveToDo", htd: "haveToDo",
};

const PRIORITY_SHORTHAND = {
  h: "high", high: "high",
  m: "medium", medium: "medium",
  l: "low", low: "low",
};

const TIME_12H = /\b(\d{1,2})(:\d{2})?\s?(am|pm)\b/i;
const TIME_24H = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;
const DURATION = /~\s?(\d+)\s?(h|hr|hour|m|min)s?\b/i;
const PRIORITY_MARK = /!(\w+)/;
const CATEGORY_MARK = /@(\w+)/;
const TAG_MARK = /#(\w+)/g;

/**
 * Parses a single line into a task draft, or returns null for a
 * blank/whitespace-only line so the caller can skip it.
 */
export function parseCaptureLine(rawLine) {
  let text = rawLine.trim();
  if (!text) return null;

  const draft = { title: "", category: null, priority: null, dueTime: null, duration: null, tags: [] };

  // Tags can repeat, so pull all of them out first.
  let tagMatch;
  TAG_MARK.lastIndex = 0;
  while ((tagMatch = TAG_MARK.exec(text))) draft.tags.push(tagMatch[1]);
  text = text.replace(TAG_MARK, "").trim();

  const priorityMatch = text.match(PRIORITY_MARK);
  if (priorityMatch && PRIORITY_SHORTHAND[priorityMatch[1].toLowerCase()]) {
    draft.priority = PRIORITY_SHORTHAND[priorityMatch[1].toLowerCase()];
    text = text.replace(priorityMatch[0], "").trim();
  }

  const categoryMatch = text.match(CATEGORY_MARK);
  if (categoryMatch && CATEGORY_SHORTHAND[categoryMatch[1].toLowerCase()]) {
    draft.category = CATEGORY_SHORTHAND[categoryMatch[1].toLowerCase()];
    text = text.replace(categoryMatch[0], "").trim();
  }

  const durationMatch = text.match(DURATION);
  if (durationMatch) {
    const n = parseInt(durationMatch[1], 10);
    const isHours = durationMatch[2].toLowerCase().startsWith("h");
    draft.duration = isHours ? n * 60 : n;
    text = text.replace(durationMatch[0], "").trim();
  }

  const time12 = text.match(TIME_12H);
  if (time12) {
    let hour = parseInt(time12[1], 10);
    const minutes = time12[2] ? time12[2].slice(1) : "00";
    const isPM = time12[3].toLowerCase() === "pm";
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    draft.dueTime = `${String(hour).padStart(2, "0")}:${minutes}`;
    text = text.replace(time12[0], "").trim();
  } else {
    const time24 = text.match(TIME_24H);
    if (time24) {
      draft.dueTime = `${time24[1].padStart(2, "0")}:${time24[2]}`;
      text = text.replace(time24[0], "").trim();
    }
  }

  draft.title = text.replace(/\s+/g, " ").trim();
  if (!draft.title) return null; // a line that was ONLY shorthand markers isn't a task

  return draft;
}

/**
 * Splits a notebook-style block of text into one draft per non-blank
 * line. This is what the Capture screen calls when you hit "commit."
 */
export function parseCaptureText(rawText) {
  return rawText
    .split("\n")
    .map(parseCaptureLine)
    .filter(Boolean);
}

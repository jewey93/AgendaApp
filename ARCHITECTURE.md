# Architecture guide

This document is the "why," not just the "what." Read it once now, and
come back to it whenever you're about to add a feature or consider a
redesign — it should tell you exactly which folder your change belongs in.

## The four layers, and the one rule that makes them work

```
src/
├── domain/     Business rules. No React, no Supabase, no fetch calls.
├── data/       Persistence. The only place that knows about Supabase.
├── state/      Orchestration. React hooks that wire domain + data together.
└── ui/         Presentation. Components, styling, layout.
```

**The one rule:** a layer may only import from the layers below it in that
list. `domain` imports nothing from this app. `data` imports nothing from
this app. `state` imports from `domain` and `data`. `ui` imports from
`state`'s *output* (props), plus `domain` for constants like category
labels — but never reaches into `data` directly.

This isn't a style preference — it's what makes each layer replaceable in
isolation:

| If you want to... | You touch... | Everything else... |
|---|---|---|
| Redesign the whole UI | `src/ui/` | Doesn't change. New UI calls the same actions. |
| Add a new task field or rule | `src/domain/taskModel.js` | UI/data barely change — maybe one new form field. |
| Switch database providers | `src/data/` | Domain and UI never notice. |
| Add a new feature (e.g. calendar sync) | Touches all four, but each piece is small and testable on its own. |

## Walking through one real feature: rapid capture

You asked for a "type like paper" experience. Here's how that request maps
onto the layers, because it's the clearest example of why this structure
pays off:

1. **`src/domain/captureParser.js`** — a pure function, `parseCaptureText(text)`.
   Text in, an array of plain task-shaped objects out. No React. This is
   the actual "smarts" — recognizing `9am`, `!high`, `@work`, `#tag`,
   `~30m` and stripping them into structured fields.
2. **`src/domain/taskModel.js`** — `createTask()` takes those plain objects
   and stamps them into a real Task with all required fields defaulted.
3. **`src/state/useAgendaState.js`** — the `addTasksFromCapture` action
   calls the parser, then `createTask` for each draft, then updates React
   state (which triggers a save via the data layer).
4. **`src/ui/CaptureView.jsx`** — renders the textarea and a live preview.
   It calls `parseCaptureText` directly just to *show* you a preview as
   you type (a read-only, side-effect-free peek), but when you actually
   commit, it calls the `addTasksFromCapture` action — it never mutates
   state itself.

Notice: the parser is used in **two** places (the live preview, and the
real commit) with zero duplication, because it's a pure function anyone
can call. That's the payoff of pulling logic out of components.

**If you want to test the parser right now**, you don't need to run the
app at all:

```js
import { parseCaptureText } from "./src/domain/captureParser.js";
console.log(parseCaptureText("9am standup !high @work #deadline"));
// [{ title: "standup", category: "work", priority: "high", dueTime: "09:00", tags: ["deadline"], duration: null }]
```

That's the concrete benefit of a domain layer: business logic you can
verify without a browser, a server, or a mouse click.

## Where things live, concretely

- **Colors, fonts, spacing** — all in `src/ui/theme.jsx`, as CSS custom
  properties (`var(--primary)`, etc). Every component reads colors through
  these variables rather than hardcoding hex values, so re-theming the
  whole app is (mostly) a one-file change.
- **Which icon represents "Work"** — also `src/ui/theme.jsx`
  (`CATEGORY_VISUALS`). Deliberately separate from `CATEGORIES` in the
  domain layer, which only has the key and label. The business rule is
  "a task belongs to a category called work" — which icon draws that is
  a design decision, not a rule.
- **What counts as "overdue," how completion percentage is computed** —
  `src/domain/taskModel.js`.
- **How/when data saves** — `src/state/useAgendaState.js` (the debounced
  `useEffect`) calling `src/data/taskRepository.js` (the actual Supabase
  read/write).

## How to redesign the UI later without breaking anything

1. Leave `src/domain/`, `src/data/`, and `src/state/` untouched.
2. Build your new components in `src/ui/` (new files, or edit
   `AppShell.jsx` in place).
3. Your new components receive the same `state` object — `state.tasks`,
   `state.addTask`, `state.toggleComplete`, etc — documented by what
   `useAgendaState()` returns at the bottom of that file.
4. Swap the import in `src/App.jsx` from the old shell to your new one.

That's it. No touching parsing logic, no touching how tasks save, no risk
of a redesign quietly breaking data integrity — because the redesign
literally cannot reach the code that handles data.

## A note on the "quick add" → "capture" change

The old `Quick Add` button opened a form modal for one task at a time.
The new `Capture` view is now the **primary** entry point (first item in
the sidebar, opens by default) — a full-page, distraction-free textarea
where each line becomes a task, with shorthand markers for time/priority/
category/tags/duration that are entirely optional. The old precise modal
still exists (now labeled "New task (precise)" in the top bar of every
other view) for when you want to fill in every field carefully — e.g.
editing an existing task, or setting a color override. Both paths create
tasks through the exact same `createTask()` domain function, so there's
no divergence in what a "valid task" looks like depending on how it was
created.

## Three more features, same pattern

Each of these was added without touching how existing features work —
that's the architecture doing its job.

**Journal** (`src/domain/journalModel.js` + `src/ui/JournalView.jsx`)
A second, simpler content type alongside Task: just text tied to a date.
Notice it did **not** require any change to `src/data/taskRepository.js`
or the Supabase schema — `journalEntries` is just another array inside the
same JSON blob `useAgendaState` already saves. That's the tradeoff of the
JSON-blob storage approach mentioned in `supabase/schema.sql`: adding a new
kind of data is a one-line addition to the state hook, at the cost of not
being able to query journal entries with SQL directly. Fine for now;
worth revisiting if you outgrow it.

**Calendar improvements** (`src/domain/eventModel.js` +
`rescheduleTask` in `src/state/useAgendaState.js`)
Two distinct additions:
- *Multi-day events* are a new domain concept, deliberately separate from
  Task — an event has a date **range** and no completion state. Keeping
  it a separate model (rather than stretching Task to cover both) meant
  the Task rules (`isOverdue`, `completionStats`, etc.) never had to
  special-case "well, unless it's an event."
- *Drag-to-reschedule* is a single new action, `rescheduleTask(id, newDate)`,
  sitting right next to `updateTask`. The UI (Weekly/Monthly views) just
  captures a native HTML5 drag-and-drop event and calls that action — no
  new state, no new persistence logic, because "moving a task to a new
  date" is just a special case of updating a task that already existed.

**Reminders** (`src/domain/reminderModel.js`, `src/data/notifier.js`,
`src/state/useReminders.js`, `src/ui/ReminderBell.jsx`)
The clearest four-layer example yet:
- *Domain* decides what counts as "due soon" — pure math on dates.
- *Data* wraps the browser's Notification API, the same way
  `supabaseClient.js` wraps Supabase — one file allowed to know it exists.
- *State* (`useReminders`, kept separate from `useAgendaState` on purpose)
  polls the clock and de-duplicates so a task doesn't notify twice.
- *UI* (`ReminderBell`) just renders whatever arrays it's handed.

If you ever swap browser notifications for, say, email reminders sent from
a server, only `src/data/notifier.js` changes — the domain rule for "due
soon" and the bell's UI don't need to know or care.

## Security: what changed and why

Row Level Security (see `supabase/schema.sql`) stops other *users* from
reading your data. It does not stop Supabase itself, or anyone who ever
gained direct database access, from reading it — RLS is enforced at query
time, but the stored bytes are still plain text underneath.

To close that gap, everything now gets **encrypted in the browser before
it's sent to Supabase at all**:

- `src/data/crypto.js` — the only file that knows Web Crypto exists.
  `createEncryptionKey()` stretches a passphrase into an AES-256 key via
  PBKDF2 (200,000 iterations — slow on purpose, to resist brute-forcing).
  `encryptJSON()`/`decryptJSON()` do the actual AES-GCM encryption.
- `src/data/taskRepository.js` — now encrypts on `saveAgendaData()` and
  decrypts on `loadAgendaData()`. Everything above this layer still just
  hands over plain JavaScript objects; it has no idea encryption exists.
- `src/EncryptionGate.jsx` — a new screen between login and the app. On
  first use it has you set a passphrase (separate from your login
  password) and generates a random, non-secret salt. On every return
  visit, it has you re-enter that passphrase, derives the key, and
  attempts a real decrypt as verification — a wrong passphrase makes
  AES-GCM's built-in authentication check fail, which becomes the
  "Incorrect passphrase" message rather than a generic crash.

**The honest tradeoff:** the encryption passphrase is never stored
anywhere, by design — that's what makes it real encryption instead of a
locked drawer with a spare key taped underneath. If you forget it, that
data is gone. `EncryptionGate.jsx` warns about this on the setup screen.
Writing it down somewhere safe (a password manager, ideally) is worth
doing the moment you set it.

**Why a separate passphrase instead of reusing your login password:**
Supabase doesn't hand your app the raw login password back after
authentication (nor should it), and tying encryption to a password you
might later reset through Supabase's own password-reset flow would
silently orphan old encrypted data. A separate passphrase avoids that
entanglement entirely, at the cost of one extra prompt per browser
session.

**Additional hardening included:**
- `vercel.json` sets response headers (`X-Frame-Options`,
  `X-Content-Type-Options`, a restrictive `Permissions-Policy`) that
  provide baseline protection against clickjacking and MIME-sniffing
  attacks — cheap, safe defaults with no risk of breaking functionality.
- Recommended, not yet automated: turn email confirmation back **on** in
  Supabase (`Authentication → Providers → Email`) before real use — it
  was suggested off only for faster local testing in the deployment
  guide. Also worth checking Supabase's Auth settings for any
  password-strength / breached-password protections available in your
  project, since Supabase actively adds these over time.

**Suggested future hardening**, not implemented here to keep this change
reviewable: a strict Content-Security-Policy (skipped because it needs
your specific Supabase project URL hardcoded, which `vercel.json` can't
read from an environment variable at header-definition time), and an
optional encrypted "recovery key" export so a lost passphrase isn't
automatically total data loss — a real cryptographic design tradeoff
worth thinking through deliberately rather than bolting on.

## Suggested next steps as you grow this



- **Unit tests for the domain layer** — this is the highest-leverage
  place to add tests, since it's pure functions with no setup required.
  A tool like Vitest (works natively with Vite) would let you test
  `captureParser.js` and `taskModel.js` directly.
- **Split `AppShell.jsx` further** — it's currently one file with every
  view in it, which was a pragmatic choice to keep this iteration
  manageable. Each view (`TodayView`, `WeeklyPlanner`, etc.) could become
  its own file under `src/ui/views/` with no logic changes — purely a
  file-organization improvement once you're comfortable navigating the
  codebase.
- **Normalize the database schema** — see the commented section at the
  bottom of `supabase/schema.sql` for how to move from the current
  JSON-blob storage to real relational tables, if you ever want to run
  SQL queries directly over your tasks.

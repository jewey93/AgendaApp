/**
 * UI LAYER — CaptureView
 * ------------------------------------------------------------------
 * This is the "digital notebook" screen: one ruled-paper writing
 * surface where you type tasks the way you'd jot them down by hand —
 * one per line, no forms, no clicking between fields.
 *
 * Notice what this component does NOT do: it doesn't know how a line
 * of text turns into a structured task (that's parseCaptureText, in
 * the domain layer) and it doesn't know how tasks get saved (that's
 * the addTasksFromCapture action from useAgendaState). Its only job
 * is to render the editable surface, show a live preview by calling
 * the parser, and call the action you pass in when you commit.
 *
 * The writing surface is a contentEditable div, not a <textarea> —
 * that's what lets a selected @category or #tag become a real inline
 * chip instead of staying behind as visible "@work" characters. All
 * of that DOM work (finding what you're typing, inserting a chip,
 * turning the chip back into plain shorthand text for the parser)
 * lives in ./chipEditor.js as plain DOM functions, kept separate from
 * this component's React logic — see the comment there for why.
 * ------------------------------------------------------------------
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Feather, ChevronDown, ChevronUp, Sparkles, Hash } from "lucide-react";
import { parseCaptureText } from "../domain/captureParser.js";
import { CATEGORIES } from "../domain/taskModel.js";
import { CATEGORY_VISUALS } from "./theme.jsx";
import { todayISO, fmtDate } from "../domain/dateUtils.js";
import {
  createChipNode, serializeEditableContent, getTriggerAtCaret,
  replaceRangeWithChip, insertBreakAtCaret, insertTextAtCaret,
} from "./chipEditor.js";

// Canonical @ tokens for autocomplete — matches captureParser's
// CATEGORY_SHORTHAND map. "haveToDo" has no literal "@haveToDo" short
// form (only @top/@t/@htd), so the suggestion inserts "@top".
const CATEGORY_SUGGESTIONS = [
  { token: "work", label: "Work", key: "work" },
  { token: "personal", label: "Personal", key: "personal" },
  { token: "fitness", label: "Fitness", key: "fitness" },
  { token: "goals", label: "Goals", key: "goals" },
  { token: "top", label: "Have To Do", key: "haveToDo" },
];

const SHORTHAND_HINTS = [
  { mark: "9am", desc: "time" },
  { mark: "!high", desc: "priority" },
  { mark: "@work", desc: "category" },
  { mark: "#tag", desc: "tag" },
  { mark: "~30m", desc: "duration" },
];

// Tap-to-insert row for touch users — reaching @ # ! ~ usually means
// switching keyboard layers on a phone, which this skips entirely.
const QUICK_MARKS = [
  { char: "@", label: "category" },
  { char: "#", label: "tag" },
  { char: "!", label: "priority" },
  { char: "~", label: "duration" },
];

export default function CaptureView({ addTasksFromCapture, tasks }) {
  const [logicalText, setLogicalText] = useState("");
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [date] = useState(todayISO()); // captured tasks default to today; edit the date later from any task if needed
  const [suggestion, setSuggestion] = useState(null); // { trigger, range, options, activeIndex, top, left }
  const editorRef = useRef(null);

  useEffect(() => { editorRef.current?.focus(); }, []);

  // Some browser extensions (grammar/spell-checkers) clone this
  // contentEditable node into the DOM as a sibling — same classes, so
  // it visually doubles the placeholder/text — plus an inline status
  // badge. data-gramm opt-out attributes only cover Grammarly itself;
  // this catches any extension doing it by stripping anything that
  // shows up next to the real editor the instant it's inserted.
  useEffect(() => {
    const root = editorRef.current;
    const parent = root?.parentElement;
    if (!parent) return;
    const stripInjected = (mutationsList) => {
      for (const m of mutationsList) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node === root || node.classList?.contains("capture-suggest")) continue;
          node.remove();
        }
      }
    };
    const observer = new MutationObserver(stripInjected);
    observer.observe(parent, { childList: true });
    return () => observer.disconnect();
  }, []);

  // Live preview: re-parses on every keystroke. Parsing a few dozen
  // lines of text is trivial work for the browser, so no debouncing
  // needed — instant feedback is part of the "feels like paper" goal.
  const drafts = useMemo(() => parseCaptureText(logicalText), [logicalText]);

  // Previously-used tags, most-used first, so # suggestions surface
  // tags you actually use instead of a blank list on a fresh account.
  const knownTags = useMemo(() => {
    const freq = new Map();
    for (const t of tasks || []) {
      for (const tag of t.tags || []) freq.set(tag, (freq.get(tag) || 0) + 1);
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [tasks]);

  const refreshSuggestion = useCallback(() => {
    const root = editorRef.current;
    if (!root || document.activeElement !== root) { setSuggestion(null); return; }
    const trig = getTriggerAtCaret(root);
    if (!trig) { setSuggestion(null); return; }

    const query = trig.query.toLowerCase();
    let options;
    if (trig.trigger === "@") {
      options = CATEGORY_SUGGESTIONS.filter(
        (c) => c.token.startsWith(query) || c.label.toLowerCase().startsWith(query)
      );
    } else {
      const pool = query ? knownTags.filter((t) => t.toLowerCase().startsWith(query)) : knownTags;
      options = pool.slice(0, 6).map((t) => ({ token: t, label: t }));
    }
    if (options.length === 0) { setSuggestion(null); return; }

    const rect = trig.range.getBoundingClientRect();
    const editorRect = root.getBoundingClientRect();
    setSuggestion({
      trigger: trig.trigger,
      query,
      range: trig.range,
      options,
      activeIndex: 0,
      top: rect.bottom - editorRect.top + root.scrollTop + 4,
      left: rect.left - editorRect.left,
    });
  }, [knownTags]);

  // If what's been typed exactly matches one of the currently-showing
  // options, this finds it — used to auto-convert to a chip the moment
  // the person hits a word boundary (space) or leaves the field,
  // instead of requiring an explicit click/Enter/Tab on the dropdown.
  const findExactMatch = (s) => {
    if (!s) return null;
    const q = s.query.toLowerCase();
    if (!q) return null;
    return s.options.find((o) => o.token.toLowerCase() === q) || null;
  };

  const handleInput = () => {
    const root = editorRef.current;
    if (!root) return;
    // Some browsers leave a stray <br> behind after deleting all text,
    // which defeats the CSS :empty placeholder — clear it explicitly.
    if (root.innerHTML === "<br>") root.innerHTML = "";
    setLogicalText(serializeEditableContent(root));
    refreshSuggestion();
  };

  // Cursor can move without the content changing (arrow keys, click,
  // tapping) — selectionchange catches those so the popover follows
  // or dismisses correctly. Guarded to only react while the editor
  // itself is focused, since selectionchange fires for the whole page.
  useEffect(() => {
    const onSelectionChange = () => {
      if (document.activeElement === editorRef.current) refreshSuggestion();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [refreshSuggestion]);

  const applySuggestion = (option, { refocus = true } = {}) => {
    if (!suggestion) return;
    const visuals = suggestion.trigger === "@" ? CATEGORY_VISUALS[option.key] : null;
    const chip = createChipNode(suggestion.trigger, option.token, option.label, visuals?.color);
    replaceRangeWithChip(suggestion.range, chip);
    setSuggestion(null);
    handleInput();
    if (refocus) editorRef.current?.focus();
  };

  const commit = () => {
    const count = addTasksFromCapture(logicalText, date);
    if (count > 0) {
      if (editorRef.current) editorRef.current.innerHTML = "";
      setLogicalText("");
      setSuggestion(null);
      editorRef.current?.focus();
    }
  };

  const insertQuickMark = (char) => {
    editorRef.current?.focus();
    insertTextAtCaret(char);
    handleInput();
  };

  const handleKeyDown = (e) => {
    if (suggestion) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestion((s) => (s ? { ...s, activeIndex: (s.activeIndex + 1) % s.options.length } : s));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestion((s) => (s ? { ...s, activeIndex: (s.activeIndex - 1 + s.options.length) % s.options.length } : s));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applySuggestion(suggestion.options[suggestion.activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSuggestion(null);
        return;
      }
      // Finishing the word yourself (typing the rest of "@fitness" and
      // hitting space) should convert it just like picking it from the
      // dropdown would — otherwise it's easy to end up with plain
      // "@fitness" text sitting there instead of a chip.
      if (e.key === " ") {
        const exact = findExactMatch(suggestion);
        if (exact) {
          e.preventDefault();
          applySuggestion(exact);
          return;
        }
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Enter") {
      // Manual <br> insertion keeps the editor's DOM flat and
      // predictable — see chipEditor.js for why that matters.
      e.preventDefault();
      insertBreakAtCaret();
      handleInput();
    }
  };

  return (
    <div className="capture-screen">
      <div className="capture-head">
        <div>
          <div className="eyebrow">Rapid capture · {fmtDate(date)}</div>
          <h1 className="page-title"><Feather size={24} style={{ verticalAlign: "-3px", marginRight: 8 }} />Just write</h1>
        </div>
        <button className="capture-hint-toggle" onClick={() => setShowCheatsheet((s) => !s)} aria-expanded={showCheatsheet}>
          {showCheatsheet ? <ChevronUp size={12} style={{ verticalAlign: "-2px" }} /> : <ChevronDown size={12} style={{ verticalAlign: "-2px" }} />} shorthand
        </button>
      </div>

      {showCheatsheet && (
        <div className="capture-cheatsheet">
          {SHORTHAND_HINTS.map((h) => (
            <span key={h.mark} className="cheatsheet-pill"><b>{h.mark}</b>{h.desc}</span>
          ))}
          <span className="cheatsheet-note">Type <b>@</b> or <b>#</b> for suggestions — none of this is required</span>
        </div>
      )}

      <div className="capture-body">
        <div className="capture-paper">
          <div
            ref={editorRef}
            className="capture-textarea capture-editable"
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Tapping/clicking away is another common way people
              // "finish" a shorthand word, especially on touch — same
              // auto-convert as pressing space, just without stealing
              // focus back.
              const exact = findExactMatch(suggestion);
              if (exact) { applySuggestion(exact, { refocus: false }); return; }
              setSuggestion(null);
            }}
            data-placeholder="Write your day out, one thought per line…"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            role="textbox"
            aria-multiline="true"
            aria-label="Rapid task capture"
            aria-autocomplete="list"
            aria-expanded={!!suggestion}
          />

          {suggestion && (
            <div className="capture-suggest" role="listbox" style={{ top: suggestion.top, left: Math.min(suggestion.left, 340) }}>
              {suggestion.options.map((opt, i) => {
                const visuals = suggestion.trigger === "@" ? CATEGORY_VISUALS[opt.key] : null;
                return (
                  <button
                    key={opt.token}
                    type="button"
                    role="option"
                    aria-selected={i === suggestion.activeIndex}
                    className={"capture-suggest-item" + (i === suggestion.activeIndex ? " active" : "")}
                    onMouseDown={(e) => { e.preventDefault(); applySuggestion(opt); }}
                    onMouseEnter={() => setSuggestion((s) => (s ? { ...s, activeIndex: i } : s))}
                  >
                    {suggestion.trigger === "@" ? (
                      <span className="suggest-swatch" style={{ background: visuals?.color, color: visuals?.color }} />
                    ) : (
                      <Hash size={11} className="suggest-hash" />
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="capture-preview">
          <div className="card-head">
            <span><Sparkles size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Parsed so far</span>
            <span className="capture-kbd">{drafts.length}</span>
          </div>
          <div className="capture-preview-list">
            {drafts.length === 0 && (
              <div className="capture-empty">
                <Feather size={22} />
                <p>Nothing yet</p>
                <span>Start typing on the left — each line becomes a task here, live.</span>
              </div>
            )}
            {drafts.map((d, i) => {
              const cat = d.category || "personal";
              const visuals = CATEGORY_VISUALS[cat];
              return (
                <div key={i} className="capture-draft-chip" style={{ "--row-color": visuals.color, "--row-i": i }}>
                  <span className="chip-title">{d.title}</span>
                  <span className="chip-meta">
                    <span>{CATEGORIES[cat].label}</span>
                    {d.dueTime && <span>{d.dueTime}</span>}
                    {d.priority && <span className={"chip-priority pr-" + d.priority}>{d.priority}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="capture-quickbar" role="toolbar" aria-label="Insert shorthand">
        {QUICK_MARKS.map((m) => (
          <button key={m.char} type="button" className="quickmark-btn" onClick={() => insertQuickMark(m.char)}>
            <span className="quickmark-char">{m.char}</span>{m.label}
          </button>
        ))}
      </div>

      <div className="capture-footer">
        <span className="empty-hint">Press <span className="capture-kbd">⌘/Ctrl</span> + <span className="capture-kbd">Enter</span> to capture everything and clear the page</span>
        <button className="primary-btn" onClick={commit} disabled={drafts.length === 0}>
          Capture {drafts.length > 0 ? `${drafts.length} task${drafts.length === 1 ? "" : "s"}` : ""}
        </button>
      </div>
    </div>
  );
}

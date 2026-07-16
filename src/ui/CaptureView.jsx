/**
 * UI LAYER — CaptureView
 * ------------------------------------------------------------------
 * This is the "digital notebook" screen: one big textarea, styled
 * like ruled paper, where you type tasks the way you'd jot them down
 * by hand — one per line, no forms, no clicking between fields.
 *
 * Notice what this component does NOT do: it doesn't know how a line
 * of text turns into a structured task (that's parseCaptureText, in
 * the domain layer) and it doesn't know how tasks get saved (that's
 * the addTasksFromCapture action from useAgendaState). Its only job
 * is to render the textarea, show a live preview by calling the
 * parser, and call the action you pass in when you commit. That's
 * the "presentation" layer doing presentation, nothing else — which
 * is exactly what makes it safe to redesign this screen later without
 * risking the parsing logic or the data underneath it.
 * ------------------------------------------------------------------
 */
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Feather, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { parseCaptureText } from "../domain/captureParser.js";
import { CATEGORIES } from "../domain/taskModel.js";
import { CATEGORY_VISUALS } from "./theme.jsx";
import { todayISO, fmtDate } from "../domain/dateUtils.js";

export default function CaptureView({ addTasksFromCapture }) {
  const [text, setText] = useState("");
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [date] = useState(todayISO()); // captured tasks default to today; edit the date later from any task if needed
  const textareaRef = useRef(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Live preview: re-parses on every keystroke. Parsing a few dozen
  // lines of text is trivial work for the browser, so no debouncing
  // needed — instant feedback is part of the "feels like paper" goal.
  const drafts = useMemo(() => parseCaptureText(text), [text]);

  const commit = () => {
    const count = addTasksFromCapture(text, date);
    if (count > 0) {
      setText("");
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div className="capture-screen">
      <div className="capture-head">
        <div>
          <div className="eyebrow">Rapid capture · {fmtDate(date)}</div>
          <h1 className="page-title"><Feather size={24} style={{ verticalAlign: "-3px", marginRight: 8 }} />Just write</h1>
        </div>
        <button className="capture-hint-toggle" onClick={() => setShowCheatsheet((s) => !s)}>
          {showCheatsheet ? <ChevronUp size={12} style={{ verticalAlign: "-2px" }} /> : <ChevronDown size={12} style={{ verticalAlign: "-2px" }} />} shorthand cheatsheet
        </button>
      </div>

      {showCheatsheet && (
        <div className="capture-cheatsheet">
          <span><b>9am</b> or <b>14:30</b> → time</span>
          <span><b>!high</b> <b>!med</b> <b>!low</b> → priority</span>
          <span><b>@work</b> <b>@personal</b> <b>@fitness</b> <b>@goals</b> <b>@top</b> → category</span>
          <span><b>#tag</b> → tag (repeatable)</span>
          <span><b>~30m</b> or <b>~1h</b> → duration</span>
          <span>None of these needed — plain lines become tasks too.</span>
        </div>
      )}

      <div className="capture-body">
        <div className="capture-paper">
          <textarea
            ref={textareaRef}
            className="capture-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"Write your day out, one thought per line…\n\n9am team standup !high @work\nfinish deck for client #deadline ~45m\ngrocery run @personal\n30 min run @fitness\ncall mom !low"}
            spellCheck={false}
          />
        </div>

        <div className="capture-preview">
          <div className="card-head">
            <span><Sparkles size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Parsed so far</span>
            <span className="capture-kbd">{drafts.length}</span>
          </div>
          <div className="capture-preview-list">
            {drafts.length === 0 && <div className="empty-hint">Nothing yet — start typing on the left.</div>}
            {drafts.map((d, i) => {
              const cat = d.category || "personal";
              const visuals = CATEGORY_VISUALS[cat];
              return (
                <div key={i} className="capture-draft-chip" style={{ "--row-color": visuals.color }}>
                  <span>{d.title}</span>
                  <span className="chip-meta">
                    <span>{CATEGORIES[cat].label}</span>
                    {d.dueTime && <span>{d.dueTime}</span>}
                    {d.priority && <span>{d.priority}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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

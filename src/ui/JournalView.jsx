/**
 * UI LAYER — JournalView
 * ------------------------------------------------------------------
 * Same shape of separation as CaptureView: this component renders the
 * compose box and the entry list, calls domain functions (entriesForDate,
 * sortByRecency, searchJournal) to decide what to display, and calls the
 * actions passed in as props to actually change anything. It never
 * constructs a journal entry object itself — createJournalEntry (domain)
 * does that, invoked via the addJournalEntry action (state layer).
 * ------------------------------------------------------------------
 */
import React, { useState, useMemo } from "react";
import { BookOpen, Search, Trash2, Calendar } from "lucide-react";
import { entriesForDate, sortByRecency, searchJournal } from "../domain/journalModel.js";
import { todayISO, fmtDate } from "../domain/dateUtils.js";

export default function JournalView({ journalEntries, addJournalEntry, deleteJournalEntry }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const today = todayISO();

  const todayEntries = useMemo(() => sortByRecency(entriesForDate(journalEntries, today)), [journalEntries, today]);
  const searchResults = useMemo(() => (query.trim() ? sortByRecency(searchJournal(journalEntries, query)) : null), [journalEntries, query]);

  const submit = () => {
    if (!draft.trim()) return;
    addJournalEntry({ date: today, text: draft });
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); }
  };

  const listToShow = searchResults !== null ? searchResults : todayEntries;

  return (
    <div className="view-scroll">
      <div className="page-head-row">
        <div>
          <div className="eyebrow">{fmtDate(today)}</div>
          <h1 className="page-title"><BookOpen size={24} style={{ verticalAlign: "-3px", marginRight: 8 }} />Journal</h1>
        </div>
      </div>

      <div className="mini-card">
        <textarea
          className="notes-area journal-compose"
          placeholder="What's on your mind? (⌘/Ctrl + Enter to save)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="journal-compose-foot">
          <span className="empty-hint">Entries are timestamped automatically.</span>
          <button className="primary-btn" onClick={submit} disabled={!draft.trim()}>Save entry</button>
        </div>
      </div>

      <div className="search-box journal-search">
        <Search size={15} />
        <input placeholder="Search all journal entries…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="mini-card">
        <div className="card-head">
          <span>{searchResults !== null ? `Results for "${query}"` : "Today's entries"}</span>
          <span className="capture-kbd">{listToShow.length}</span>
        </div>
        {listToShow.length === 0 && <div className="empty-hint">{searchResults !== null ? "No matching entries." : "Nothing written yet today."}</div>}
        <div className="journal-list">
          {listToShow.map((entry) => (
            <div className="journal-entry" key={entry.id}>
              <div className="journal-entry-head">
                <span className="journal-entry-time">
                  <Calendar size={11} /> {entry.date === today ? new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : entry.date}
                </span>
                <button className="icon-btn tiny danger" onClick={() => deleteJournalEntry(entry.id)}><Trash2 size={12} /></button>
              </div>
              <p className="journal-entry-text">{entry.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

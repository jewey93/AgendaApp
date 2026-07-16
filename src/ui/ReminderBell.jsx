/**
 * UI LAYER — ReminderBell
 * ------------------------------------------------------------------
 * Purely presentational: receives dueSoon/overdue arrays and a
 * permission string as props (all computed by useReminders in the
 * state layer) and just renders them. It doesn't poll the clock,
 * doesn't call the Notification API, doesn't know windowMinutes is
 * 30 — all of that lives below this component. If you swap this for
 * a completely different bell design later, none of that logic moves.
 * ------------------------------------------------------------------
 */
import React, { useState, useRef, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

export default function ReminderBell({ dueSoon, overdue, permission, requestPermission, supported, onTaskClick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const total = dueSoon.length + overdue.length;

  useEffect(() => {
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="reminder-bell" ref={ref}>
      <button className="icon-btn reminder-bell-btn" onClick={() => setOpen((o) => !o)} title="Reminders">
        <Bell size={16} />
        {total > 0 && <span className="reminder-badge">{total}</span>}
      </button>

      {open && (
        <div className="reminder-panel">
          <div className="reminder-panel-head">Reminders</div>

          {supported && permission !== "granted" && (
            <button className="ghost-btn small reminder-enable-btn" onClick={requestPermission}>
              <BellRing size={13} /> Enable browser notifications
            </button>
          )}
          {!supported && <div className="empty-hint"><BellOff size={12} style={{ verticalAlign: "-2px" }} /> Browser notifications aren't supported here.</div>}

          {overdue.length > 0 && (
            <div className="reminder-group">
              <div className="reminder-group-title danger">Overdue ({overdue.length})</div>
              {overdue.slice(0, 6).map((t) => (
                <div key={t.id} className="reminder-row" onClick={() => onTaskClick(t)}>
                  <span>{t.title}</span><span className="reminder-row-meta">{t.date}</span>
                </div>
              ))}
            </div>
          )}

          {dueSoon.length > 0 && (
            <div className="reminder-group">
              <div className="reminder-group-title">Due soon ({dueSoon.length})</div>
              {dueSoon.map((t) => (
                <div key={t.id} className="reminder-row" onClick={() => onTaskClick(t)}>
                  <span>{t.title}</span><span className="reminder-row-meta">{t.dueTime}</span>
                </div>
              ))}
            </div>
          )}

          {total === 0 && <div className="empty-hint">Nothing needs your attention right now.</div>}
        </div>
      )}
    </div>
  );
}

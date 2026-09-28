/* ═══════════ FRIEND COMPARE ═══════════
   Collapsible panel — no nav-stack, no new screen, just local
   `open` state — so it can be dropped into more than one place
   (the daily game-over card, and the Home daily card once today's
   run is done) without touching the app's back-button handling.

   Fully offline: sharing hands off to whatever navigator.share
   offers (or the clipboard), and "adding" a friend means pasting
   the message they sent back — see src/friendCompare.js for the
   code format and why it's plain text rather than an opaque blob. */

import { useState } from "react";
import { T } from "../constants";
import {
  buildCompareShareText,
  decodeCompareCode,
  loadFriends,
  saveFriend,
  removeFriend,
  compareToFriend,
} from "../friendCompare";

/* Rotates to point up when the panel is open — an SVG, not a text
   glyph (▾/⌄/›), for the same reason the in-game icons were moved off
   emoji/text glyphs earlier: those render inconsistently across
   fonts/platforms, where currentColor + a fixed viewBox doesn't. */
function ChevronIcon({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease", flexShrink: 0 }}
    >
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FriendCompare({ rounds, dateKey }) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState(() => loadFriends());
  const [pasteText, setPasteText] = useState("");
  const [labelText, setLabelText] = useState("");
  const [feedback, setFeedback] = useState(null);

  const flash = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((f) => (f && f.message === message ? null : f));
    }, 2400);
  };

  const share = async () => {
    const text = buildCompareShareText({ dateKey, rounds });
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cascade — Compare", text });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        flash("ok", "Copied — paste it to a friend");
      }
    } catch (err) {
      if (err && err.name !== "AbortError") {
        flash("err", "Couldn't share — try again");
      }
    }
  };

  const addFriend = () => {
    const decoded = decodeCompareCode(pasteText);
    if (!decoded) {
      flash("err", "Couldn't find a Cascade code in that");
      return;
    }
    const updated = saveFriend({
      label: labelText,
      dateKey: decoded.dateKey,
      rounds: decoded.rounds,
    });
    setFriends(updated);
    setPasteText("");
    setLabelText("");
    flash("ok", "Added");
  };

  const remove = (id) => setFriends(removeFriend(id));

  return (
    <div style={s.wrap}>
      <button style={s.toggle} onClick={() => setOpen((o) => !o)}>
        <span style={s.toggleIcon}>👥</span>
        <span style={s.toggleText}>
          Compare Friends
          {friends.length > 0 && <span style={s.toggleCount}> · {friends.length}</span>}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div style={s.panel}>
          <button style={s.shareBtn} onClick={share}>
            📤 Share your code
          </button>

          <div style={s.addRow}>
            <input
              style={s.input}
              placeholder="Paste a friend's message"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <input
              style={s.input}
              placeholder="Their name (optional)"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
            />
            <button
              style={{ ...s.addBtn, opacity: pasteText.trim() ? 1 : 0.45 }}
              onClick={addFriend}
              disabled={!pasteText.trim()}
            >
              Add
            </button>
          </div>

          {feedback && (
            <div
              style={{
                ...s.feedback,
                color: feedback.type === "err" ? T.danger : T.go,
              }}
            >
              {feedback.message}
            </div>
          )}

          {friends.length > 0 && (
            <div style={s.list}>
              {friends.map((f) => {
                const cmp = compareToFriend(f, rounds, dateKey);
                return (
                  <div key={f.id} style={s.row}>
                    <div style={s.rowMain}>
                      <div style={s.name}>{f.label}</div>
                      {cmp.comparable ? (
                        <div
                          style={{
                            ...s.status,
                            color:
                              cmp.ahead === "you"
                                ? T.go
                                : cmp.ahead === "friend"
                                ? T.danger
                                : T.muted,
                          }}
                        >
                          {cmp.ahead === "tie"
                            ? `Tied at ${f.rounds}`
                            : cmp.ahead === "you"
                            ? `You're ahead by ${Math.abs(cmp.delta)} (${f.rounds} rounds)`
                            : `Ahead by ${Math.abs(cmp.delta)} (${f.rounds} rounds)`}
                        </div>
                      ) : (
                        <div style={s.stale}>
                          {f.rounds} rounds — from {f.dateKey}, not today
                        </div>
                      )}
                    </div>
                    <button
                      style={s.remove}
                      onClick={() => remove(f.id)}
                      aria-label={`Remove ${f.label}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { width: "100%" },
  /* Was a bare transparent-text button — the only unstyled element on
     a screen where everything else (Play, the Daily card, the bottom
     nav) is a proper glass/pill surface, so it read as a leftover
     placeholder floating under the Daily card rather than a designed
     part of the screen. Glass pill + icon + chevron brings it in line
     with the rest of the card language instead of a lone gray label. */
  toggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    background: "var(--glass)",
    backdropFilter: "blur(16px) saturate(150%)",
    WebkitBackdropFilter: "blur(16px) saturate(150%)",
    border: `1px solid ${T.edge}`,
    borderRadius: 14,
    padding: "13px 16px",
    color: T.ink,
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    marginTop: 6,
    appearance: "none",
    WebkitAppearance: "none",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  toggleIcon: { fontSize: 14, lineHeight: 1 },
  toggleText: { flex: "0 1 auto" },
  toggleCount: { color: T.accent, fontWeight: 900 },
  panel: {
    background: `color-mix(in srgb, ${T.bg} 50.2%, transparent)`,
    border: `1px solid ${T.edge}`,
    borderRadius: 14,
    padding: "14px 14px",
    marginTop: 4,
    marginBottom: 6,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  shareBtn: {
    display: "block",
    width: "100%",
    background: "transparent",
    color: T.accent,
    border: `1px solid color-mix(in srgb, ${T.accent} 33.3%, transparent)`,
    borderRadius: 10,
    padding: "10px 12px",
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  },
  addRow: { display: "flex", flexDirection: "column", gap: 8 },
  input: {
    width: "100%",
    background: `color-mix(in srgb, ${T.bg} 69%, transparent)`,
    border: `1px solid ${T.edge}`,
    borderRadius: 10,
    padding: "10px 12px",
    color: T.ink,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },
  addBtn: {
    background: T.accent,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  },
  feedback: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
  },
  list: { display: "flex", flexDirection: "column", gap: 6, marginTop: 2 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 4px",
    borderTop: `1px solid ${T.edge}`,
  },
  rowMain: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 12.5,
    fontWeight: 800,
    color: T.ink,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  status: { fontSize: 11.5, fontWeight: 700, marginTop: 2 },
  stale: { fontSize: 11.5, fontWeight: 600, color: T.muted, marginTop: 2 },
  remove: {
    background: "transparent",
    border: "none",
    color: T.muted,
    fontSize: 14,
    cursor: "pointer",
    padding: "4px 6px",
    flexShrink: 0,
  },
};

/* ═══════════ FRIEND COMPARE ═══════════
   Collapsible panel — no nav-stack, no new screen, just local
   `open` state — so it can be dropped into more than one place
   (the daily game-over card, and the Home daily card once today's
   run is done) without touching the app's back-button handling.

   Fully offline: sharing hands off to whatever navigator.share
   offers (or the clipboard), and "adding" a friend means pasting
   the message they sent back — see src/friendCompare.js for the
   code format and why it's plain text rather than an opaque blob. */

import { useRef, useState } from "react";
import { T, roundsText } from "../constants";
import { nativeShareText } from "../shareCard";
import {
  buildCompareShareText,
  decodeCompareCode,
  loadFriends,
  saveFriend,
  removeFriend,
  compareToFriend,
} from "../friendCompare";

/* roundsText used to be defined here. It now lives in constants.js so the
   share text, the run-over card and this list cannot disagree about how a
   round count pluralises — see the export there. */

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
  /* Token, not the message text, decides whether a flash's own timer is
     still the current one. Two SAME-text flashes within 2.4s (e.g. adding
     two friends in a row, both saying "Added") used to compare by message
     string, so the first flash's timer matched the second flash's still-
     showing feedback and cleared it early — cutting the second toast's
     hold time short by however much overlap there was. An incrementing
     token is unique per call regardless of what the message says, so each
     flash's timer only ever clears ITS OWN, still-current toast. */
  const feedbackToken = useRef(0);

  const flash = (type, message) => {
    const token = ++feedbackToken.current;
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((f) => (feedbackToken.current === token ? null : f));
    }, 2400);
  };

  /* Goes through nativeShareText like the daily share does: Android's WebView has no
     navigator.share (see shareCard.js), so calling it directly meant the APK only ever
     copied to the clipboard instead of opening the share sheet, and with no clipboard
     either the button did nothing at all. */
  const share = async () => {
    const text = buildCompareShareText({ dateKey, rounds });
    const result = await nativeShareText({ title: "Cascade — Compare", text });
    if (result === "copied") flash("ok", "Copied — paste it to a friend");
    else if (result === "failed") flash("err", "Couldn't share — try again");
  };

  /* Returns true when a friend was added (so Enter can close the keyboard only then). */
  const addFriend = () => {
    if (!pasteText.trim()) return false;
    const decoded = decodeCompareCode(pasteText);
    if (!decoded) {
      flash("err", "Couldn't find a Cascade code in that");
      return false;
    }
    const res = saveFriend({
      label: labelText,
      dateKey: decoded.dateKey,
      rounds: decoded.rounds,
    });
    /* Storage rejected the write. res.friends is what is actually stored, so
       the list on screen stays truthful; the pasted text is deliberately KEPT
       in the box (and the keyboard stays up) so Add can just be pressed again
       once there's room. Claiming "Added" here is what used to happen. */
    if (res.writeFailed) {
      flash("err", "Couldn't save — try again");
      return false;
    }
    setFriends(res.friends);
    setPasteText("");
    setLabelText("");
    flash("ok", res.duplicate ? "Already added — name updated" : "Added");
    return true;
  };

  const remove = (id) => {
    const res = removeFriend(id);
    setFriends(res.friends);
    /* Same as above: the row stays put because it is still in storage, so
       the ✕ has to say why rather than look like it did nothing. */
    if (res.writeFailed) flash("err", "Couldn't save — try again");
  };

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
        <div style={s.panel} className="fade-up">
          <button style={s.shareBtn} onClick={share}>
            📤 Share your code
          </button>

          <div style={s.addRow}>
            <input
              style={s.input}
              placeholder="Paste a friend's message"
              /* A placeholder is a hint, not a label — without this the two
                 fields were both announced as just "text field". */
              aria-label="Friend's shared Cascade message"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && addFriend()) e.currentTarget.blur(); }}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              enterKeyHint="done"
            />
            <input
              style={s.input}
              placeholder="Their name (optional)"
              aria-label="Friend's name (optional)"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && addFriend()) e.currentTarget.blur(); }}
              autoComplete="off" maxLength={24}
              enterKeyHint="done"
            />
            <button
              style={{ ...s.addBtn, opacity: pasteText.trim() ? 1 : 0.45 }}
              onClick={addFriend}
              disabled={!pasteText.trim()}
            >
              Add
            </button>
          </div>

          {/* Always mounted, never `{feedback && ...}`. An alert is announced
              on insertion, but a freshly-mounted polite status region usually is
              not — so "Added" could land in total silence while the error path
              worked, which is exactly backwards from what a player needs to
              hear. Keeping the container in the tree and swapping only its text
              is the reliable shape.

              The empty state is 0-height with its 10px flex gaps cancelled by
              negative margins, so when there is nothing to say the panel's
              spacing is byte-for-byte what it was before. */}
          <div
            role={feedback?.type === "err" ? "alert" : "status"}
            aria-live={feedback?.type === "err" ? "assertive" : "polite"}
            aria-atomic="true"
            style={{
              ...s.feedback,
              /* goText, not go: 12px feedback on a translucent panel is small
                 text, and --go is the bright fill token that fails contrast on
                 the light theme. Error red stays --danger, which is already the
                 readable one. */
              color: feedback?.type === "err" ? T.danger : T.goText,
              ...(feedback ? null : { height: 0, marginTop: -10, marginBottom: -10 }),
            }}
          >
            {feedback?.message || ""}
          </div>

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
                            /* goText, not go: 11.5px status line, same
                               small-text rule as the feedback line above.
                               Ahead/behind sit on that same scale. */
                            color:
                              cmp.ahead === "you"
                                ? T.goText
                                : cmp.ahead === "friend"
                                ? T.danger
                                : T.muted,
                          }}
                        >
                          {cmp.ahead === "tie"
                            ? `Tied at ${f.rounds}`
                            : cmp.ahead === "you"
                            ? `You're ahead by ${Math.abs(cmp.delta)} (${roundsText(f.rounds)})`
                            : `They're ahead by ${Math.abs(cmp.delta)} (${roundsText(f.rounds)})`}
                        </div>
                      ) : (
                        <div style={s.stale}>
                          {roundsText(f.rounds)} — from {f.dateKey}, not today
                        </div>
                      )}
                    </div>
                      {/* A friend saved without a name has label "" (the
                         optional field), so the template produced a bare
                         "Remove " — a control whose only purpose is to be
                         announced had nothing after the verb. Falls back to
                         the generic noun instead. */}
                      <button
                        style={{
                          ...s.remove,
                          minWidth: 44,
                          minHeight: 44,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                        onClick={() => remove(f.id)}
                        aria-label={f.label ? `Remove ${f.label}` : "Remove friend"}
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
    /* 16px, not 13: iOS Safari zooms the whole page in when an input under 16px is
       focused, and this page can't scroll or be un-zoomed easily. */
    fontSize: 16,
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

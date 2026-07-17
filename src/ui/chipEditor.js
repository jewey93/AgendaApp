/**
 * UI LAYER — chip-editor DOM helpers
 * ------------------------------------------------------------------
 * CaptureView renders its rapid-entry surface as a contentEditable
 * div rather than a <textarea>, specifically so a selected @category
 * or #tag becomes a real inline chip — a small non-editable pill
 * sitting in the flow of the sentence — instead of staying behind as
 * raw "@work" characters.
 *
 * React doesn't manage this element's contents directly: letting
 * React re-render a contentEditable region on every keystroke reliably
 * breaks cursor position (a well-known React + contentEditable
 * problem). So these are plain DOM functions instead of React state
 * updates — they read the live DOM to figure out what's been typed,
 * and mutate it directly to insert a chip or a line break.
 * CaptureView calls these from its event handlers; nothing here
 * imports React, and nothing here knows what a "task" is.
 *
 * A chip's meaning lives entirely in its `data-token` attribute (e.g.
 * "@work", "#deadline") — exactly the shorthand text captureParser.js
 * already recognizes. serializeEditableContent() turns the live DOM
 * (text, <br> line breaks, chip spans) back into that same plain
 * multi-line string, which is what actually gets parsed — so the
 * parser itself never had to change to support chips.
 * ------------------------------------------------------------------
 */

// Builds one chip: a non-editable inline pill. `trigger` is "@" (category)
// or "#" (tag); `token` is the canonical shorthand word (e.g. "work");
// `label` is what's shown; `color` is only used for category chips.
export function createChipNode(trigger, token, label, color) {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.className = "capture-chip " + (trigger === "@" ? "chip-category" : "chip-tag");
  span.dataset.token = trigger + token;
  if (trigger === "@") {
    // Sets the custom property the .chip-category CSS rule reads for
    // its background/border/text color, so the pill itself picks up
    // the category's real color — not just the little dot.
    if (color) span.style.setProperty("--chip-color", color);
    const dot = document.createElement("span");
    dot.className = "chip-dot";
    span.appendChild(dot);
    span.appendChild(document.createTextNode(label));
  } else {
    span.appendChild(document.createTextNode("#" + label));
  }
  return span;
}

export function serializeEditableContent(root) {
  let text = "";
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.nodeValue;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.dataset && node.dataset.token) {
      text += node.dataset.token;
      return;
    }
    if (node.tagName === "BR") {
      text += "\n";
      return;
    }
    node.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return text;
}

function getCaretRange() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return sel.getRangeAt(0);
}

// Looks backward from the caret, within its own text node, for a run
// of non-space characters starting with @ or #. Returns both the
// query (for filtering suggestions) and a Range spanning exactly that
// run (for replacing it with a chip later) — or null if the caret
// isn't currently inside an @word or #word.
export function getTriggerAtCaret(root) {
  const range = getCaretRange();
  if (!range || !range.collapsed) return null;
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;

  const offset = range.startOffset;
  const text = node.nodeValue;
  let start = offset;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  const token = text.slice(start, offset);
  const trigger = token[0];
  if (trigger !== "@" && trigger !== "#") return null;

  const triggerRange = document.createRange();
  triggerRange.setStart(node, start);
  triggerRange.setEnd(node, offset);
  return { trigger, query: token.slice(1), range: triggerRange };
}

// Deletes the given range's contents and drops a chip (plus a
// trailing space) in its place, leaving the caret right after it.
export function replaceRangeWithChip(range, chipNode) {
  range.deleteContents();
  range.insertNode(chipNode);
  const space = document.createTextNode(" ");
  chipNode.after(space);
  const sel = window.getSelection();
  const after = document.createRange();
  after.setStartAfter(space);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
}

// Manual line breaks (rather than letting the browser create nested
// <div>s on Enter, which vary in shape by browser) — keeps the
// editable region a flat, predictable sequence of text/chip/<br>
// nodes, which is what makes serializeEditableContent() simple.
export function insertBreakAtCaret() {
  const range = getCaretRange();
  if (!range) return;
  range.deleteContents();
  const br = document.createElement("br");
  range.insertNode(br);
  const after = document.createRange();
  after.setStartAfter(br);
  after.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(after);
}

// Used by the tap-to-insert shorthand toolbar (@ # ! ~ buttons) so
// touch users don't have to dig through a mobile keyboard's symbols
// layer to type them.
export function insertTextAtCaret(str) {
  const range = getCaretRange();
  if (!range) return;
  range.deleteContents();
  const node = document.createTextNode(str);
  range.insertNode(node);
  const after = document.createRange();
  after.setStartAfter(node);
  after.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(after);
}

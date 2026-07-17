/**
 * UI LAYER — caret pixel position for a <textarea>
 * ------------------------------------------------------------------
 * Browsers don't expose "where is the caret, in pixels" for a plain
 * textarea. This measures it indirectly: build an invisible clone of
 * the textarea (same font, padding, width, wrapping) containing the
 * same text up to the caret, drop a marker span at the end of that
 * text, and read the marker's offsetTop/offsetLeft. It's the standard
 * technique text editors have used for textarea-based autocomplete
 * for years — no dependency needed for something this small.
 *
 * Used by CaptureView to position the @/# suggestion popover right
 * under whatever word the person is currently typing, instead of
 * pinning it to a fixed corner of the screen.
 * ------------------------------------------------------------------
 */
const MIRRORED_PROPERTIES = [
  "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
  "textTransform", "wordSpacing", "textIndent", "tabSize",
];

export function getCaretCoordinates(textarea, position) {
  const div = document.createElement("div");
  const style = getComputedStyle(textarea);
  MIRRORED_PROPERTIES.forEach((prop) => {
    div.style[prop] = style[prop];
  });
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.top = "0";
  div.style.left = "-9999px";
  div.style.height = "auto";
  div.style.overflow = "hidden";

  div.textContent = textarea.value.substring(0, position);

  const marker = document.createElement("span");
  marker.textContent = "​";
  div.appendChild(marker);

  document.body.appendChild(div);
  const top = marker.offsetTop;
  const left = marker.offsetLeft;
  document.body.removeChild(div);

  return { top, left };
}

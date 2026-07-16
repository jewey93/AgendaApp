/**
 * DATA LAYER — Notifier
 * ------------------------------------------------------------------
 * Same idea as supabaseClient.js: this is the one file allowed to know
 * that the browser's Notification API exists. Everything above it
 * calls requestPermission()/notify()/permission() and doesn't care
 * whether that's backed by a browser API, a push notification service,
 * or something else entirely in a future redesign.
 * ------------------------------------------------------------------
 */
export const notifier = {
  isSupported() {
    return typeof window !== "undefined" && "Notification" in window;
  },

  permission() {
    return this.isSupported() ? Notification.permission : "unsupported";
  },

  async requestPermission() {
    if (!this.isSupported()) return "unsupported";
    return Notification.requestPermission();
  },

  notify(title, options = {}) {
    if (!this.isSupported() || Notification.permission !== "granted") return;
    try {
      new Notification(title, options);
    } catch (e) {
      // Some browsers (and most iframes/sandboxes) restrict Notification
      // construction even when permission was granted — fail silently
      // rather than crash the app over a non-critical feature.
    }
  },
};

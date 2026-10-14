/** Registers the installable shell. Web push stays off until a VAPID key is configured. */
export function registerCaretakerShell() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Install still works from the manifest if the worker cannot register.
  });
}

// Helpers for storing an image as a filesystem PATH (not base64) and displaying it.
//
// - On desktop (Electron) we read the picked file's absolute path and store that.
// - To display, we serve it through the custom `localimg://` protocol registered
//   in the Electron main process, so the <img> can load a file from anywhere on disk.

/** Absolute path of a picked file, or null when not running in Electron. */
export function filePath(file: File): string | null {
  const api = typeof window !== "undefined" ? window.electronAPI : undefined;
  if (api?.getPathForFile) return api.getPathForFile(file) || null;
  return null;
}

/** Turn a stored image value into something an <img src> can load. */
export function imageSrc(value?: string | null): string {
  if (!value) return "";
  // Already a usable URL (legacy base64, http(s), or our own scheme).
  if (/^(data:|https?:|localimg:|blob:)/i.test(value)) return value;
  // Otherwise it's a filesystem path — serve it via the Electron protocol.
  const api = typeof window !== "undefined" ? window.electronAPI : undefined;
  if (api?.isElectron) return "localimg://img/" + encodeURIComponent(value);
  return ""; // a plain browser cannot read local disk paths
}

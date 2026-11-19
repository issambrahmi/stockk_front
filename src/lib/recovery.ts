// Database backup / restore (encrypted .stkbak file). Encryption and decryption
// happen in the API (AES-256-GCM); this file only talks to /api/recovery.
import { API_BASE, ApiError } from "@/lib/http";
import { tr } from "@/i18n/locale";
import { getStoreInfo, normalizeStoreInfo, setStoreInfo } from "@/lib/storeInfo";

const ENDPOINT = `${API_BASE}/api/recovery`;

export const BACKUP_EXTENSION = ".stkbak";

async function toApiError(res: Response): Promise<ApiError> {
  let code = "";
  let message = "";
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    code = body.code ?? "";
    message = body.message ?? "";
  } catch {
    /* not JSON */
  }
  const key = `settings.recovery.err.${code}`;
  const translated = code ? tr(key) : "";
  return new ApiError(
    res.status,
    translated && translated !== key ? translated : message || tr("common.errorStatus", { n: res.status }),
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

function backupFilename(): string {
  const d = new Date();
  return `stock-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${BACKUP_EXTENSION}`;
}

/** Asks the API for an encrypted dump of the whole database (+ the local store info). */
export async function exportBackup(adminId: number, passphrase: string): Promise<{ blob: Blob; filename: string }> {
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": String(adminId) },
      body: JSON.stringify({ passphrase, extra: { storeInfo: getStoreInfo() } }),
    });
  } catch {
    throw new ApiError(0, tr("common.serverUnreachable"));
  }
  if (!res.ok) throw await toApiError(res);
  return { blob: await res.blob(), filename: backupFilename() };
}

/** Sends a backup file to the API, which decrypts it and REPLACES the whole database. */
export async function importBackup(adminId: number, file: File, passphrase: string): Promise<{ rows: number }> {
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-User-Id": String(adminId),
        "X-Backup-Passphrase": encodeURIComponent(passphrase),
      },
      body: file,
    });
  } catch {
    throw new ApiError(0, tr("common.serverUnreachable"));
  }
  if (!res.ok) throw await toApiError(res);

  const payload = (await res.json()) as {
    data?: { tables?: Record<string, number>; extra?: { storeInfo?: unknown } | null };
  };
  const extra = payload.data?.extra;
  if (extra && typeof extra === "object" && extra.storeInfo) setStoreInfo(normalizeStoreInfo(extra.storeInfo));

  const rows = Object.values(payload.data?.tables ?? {}).reduce((a, b) => a + b, 0);
  return { rows };
}

/** Triggers a browser/Electron download of a Blob. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

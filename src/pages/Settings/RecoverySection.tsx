import { useRef, useState } from "react";
import { DatabaseBackup, Download, Eye, EyeOff, FileUp, Loader2, Upload } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/http";
import { BACKUP_EXTENSION, exportBackup, importBackup, saveBlob } from "@/lib/recovery";

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:bg-white";
const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600";
const MIN_PASSWORD = 8;

type Msg = { kind: "ok" | "err"; text: string } | null;

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p className={`mt-3 text-sm font-semibold ${msg.kind === "ok" ? "text-teal-600" : "text-red-600"}`}>
      {msg.kind === "ok" ? "✓ " : ""}
      {msg.text}
    </p>
  );
}

export function RecoverySection() {
  const { t } = useLang();
  const { user, logout } = useAuth();

  // ---- export ----
  const [expPass, setExpPass] = useState("");
  const [expPass2, setExpPass2] = useState("");
  const [showExpPass, setShowExpPass] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expMsg, setExpMsg] = useState<Msg>(null);

  // ---- import ----
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [impPass, setImpPass] = useState("");
  const [showImpPass, setShowImpPass] = useState(false);
  const [importing, setImporting] = useState(false);
  const [impMsg, setImpMsg] = useState<Msg>(null);

  const doExport = async () => {
    if (!user) return;
    if (expPass.length < MIN_PASSWORD) return setExpMsg({ kind: "err", text: t("settings.recovery.passwordMin") });
    if (expPass !== expPass2) return setExpMsg({ kind: "err", text: t("settings.recovery.mismatch") });

    setExporting(true);
    setExpMsg(null);
    try {
      const { blob, filename } = await exportBackup(user.id, expPass);
      saveBlob(blob, filename);
      setExpMsg({ kind: "ok", text: t("settings.recovery.exported", { size: formatSize(blob.size) }) });
      setExpPass("");
      setExpPass2("");
    } catch (e) {
      setExpMsg({ kind: "err", text: e instanceof ApiError ? e.message : t("common.saveFailed") });
    } finally {
      setExporting(false);
    }
  };

  const doImport = async () => {
    if (!user || !file) return;
    if (!impPass) return setImpMsg({ kind: "err", text: t("settings.recovery.err.WRONG_PASSPHRASE") });
    if (!confirm(t("settings.recovery.confirmImport"))) return;

    setImporting(true);
    setImpMsg(null);
    try {
      const { rows } = await importBackup(user.id, file, impPass);
      setImpMsg({ kind: "ok", text: t("settings.recovery.imported", { n: rows }) });
      // Users may differ in the restored database: sign out and reload everything.
      setTimeout(() => {
        logout();
        window.location.reload();
      }, 2000);
    } catch (e) {
      setImpMsg({ kind: "err", text: e instanceof ApiError ? e.message : t("settings.recovery.err.IMPORT_FAILED") });
      setImporting(false);
    }
  };

  const eye = (shown: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600"
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2 text-slate-800">
        <DatabaseBackup className="h-5 w-5 text-teal-500" />
        <h2 className="text-lg font-bold">{t("settings.recovery.title")}</h2>
      </div>
      <p className="mb-5 text-sm text-slate-500">{t("settings.recovery.hint")}</p>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---------------- Export ---------------- */}
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
            <Download className="h-4 w-4 text-teal-500" />
            {t("settings.recovery.export.title")}
          </div>
          <p className="mb-4 text-xs text-slate-500">{t("settings.recovery.export.hint")}</p>

          <label className={LABEL}>{t("settings.recovery.password")}</label>
          <div className="relative mb-3">
            <input
              dir="ltr"
              type={showExpPass ? "text" : "password"}
              autoComplete="new-password"
              className={INPUT}
              value={expPass}
              onChange={(e) => { setExpPass(e.target.value); setExpMsg(null); }}
            />
            {eye(showExpPass, () => setShowExpPass((v) => !v))}
          </div>

          <label className={LABEL}>{t("settings.recovery.passwordConfirm")}</label>
          <input
            dir="ltr"
            type={showExpPass ? "text" : "password"}
            autoComplete="new-password"
            className={INPUT}
            value={expPass2}
            onChange={(e) => { setExpPass2(e.target.value); setExpMsg(null); }}
          />
          <p className="mt-1.5 text-xs text-slate-400">{t("settings.recovery.passwordMin")}</p>

          <button
            onClick={doExport}
            disabled={exporting || !expPass || !expPass2}
            className="mt-4 flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? t("settings.recovery.exporting") : t("settings.recovery.exportBtn")}
          </button>
          <p className="mt-3 text-xs text-slate-400">{t("settings.recovery.storeIncluded")}</p>
          <Message msg={expMsg} />
        </div>

        {/* ---------------- Import ---------------- */}
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
            <Upload className="h-4 w-4 text-teal-500" />
            {t("settings.recovery.import.title")}
          </div>
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            {t("settings.recovery.import.hint")}
          </p>

          <input
            ref={fileRef}
            type="file"
            accept={`${BACKUP_EXTENSION},application/octet-stream`}
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setImpMsg(null); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mb-1 flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-start text-sm text-slate-600 hover:border-teal-300"
          >
            <FileUp className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{file ? `${file.name} (${formatSize(file.size)})` : t("settings.recovery.chooseFile")}</span>
          </button>

          <label className={`${LABEL} mt-3`}>{t("settings.recovery.password")}</label>
          <div className="relative">
            <input
              dir="ltr"
              type={showImpPass ? "text" : "password"}
              autoComplete="off"
              className={INPUT}
              value={impPass}
              onChange={(e) => { setImpPass(e.target.value); setImpMsg(null); }}
            />
            {eye(showImpPass, () => setShowImpPass((v) => !v))}
          </div>

          <button
            onClick={doImport}
            disabled={importing || !file || !impPass}
            className="mt-4 flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? t("settings.recovery.importing") : t("settings.recovery.importBtn")}
          </button>
          <Message msg={impMsg} />
        </div>
      </div>
    </section>
  );
}

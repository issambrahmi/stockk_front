import { Loader2, AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export function Spinner({ label }: { label?: string }) {
  const { t } = useLang();
  const text = label ?? t("common.loading");
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="h-7 w-7 animate-spin text-teal-500" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLang();
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500">
        <AlertCircle className="h-6 w-6" />
      </span>
      <p className="max-w-sm text-sm font-medium text-slate-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const { t } = useLang();
  const text = message ?? t("common.empty");
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-slate-400">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100">
        <Inbox className="h-6 w-6" />
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

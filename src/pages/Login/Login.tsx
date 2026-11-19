import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Lock, User, Eye, EyeOff, LogIn, Store, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { ApiError } from "@/lib/api";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/pos";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("login.failed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-teal-50 via-[#eef7f8] to-teal-100 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.35)] md:grid-cols-2">
        {/* Left — brand panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-teal-500 to-teal-700 p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Store className="h-6 w-6" />
            </span>
            <span className="text-xl font-bold tracking-tight">MyBrand</span>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold leading-tight">{t("login.gestion")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
{t("login.tagline")}
            </p>
          </div>
          <p className="text-xs text-white/60">© {new Date().getFullYear()} {t("login.rights")}</p>
        </div>

        {/* Right — form */}
        <div className="flex flex-col justify-center p-8 sm:p-10">
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2 md:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500 text-white">
                <Store className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold text-slate-900">MyBrand</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t("login.welcome")}</h1>
            <p className="mt-1 text-sm text-slate-500">
{t("login.subtitle")}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t("login.username")}
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors focus-within:border-teal-400 focus-within:bg-white">
                <User className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  autoComplete="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t("login.password")}
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors focus-within:border-teal-400 focus-within:bg-white">
                <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? t("common.hide") : t("common.show")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("login.connecting")}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> {t("login.submit")}
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            {t("login.default")} : <span className="font-semibold text-slate-500">admin / admin</span>
          </p>
        </div>
      </div>
    </div>
  );
}

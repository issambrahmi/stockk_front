import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Wallet,
  TrendingUp,
  Percent,
  Receipt,
  ShoppingBag,
  Boxes,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { statsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { StatsResponse, StatsPeriod } from "@/types/api";
import { getLocale } from "@/i18n/locale";
import { initials as toInitials } from "@/lib/utils";
import { Spinner, ErrorState } from "@/components/States";
import { useLang } from "@/context/LanguageContext";


/* ------------------------------- data ---------------------------------- */

/* ------------------------------ helpers -------------------------------- */

const TEAL = "#5ed3b4";
const INK = "#1c2431";
const PIE_COLORS = ["#5ed3b4", "#1c2431", "#eab04d", "#7fb3a5", "#c3d0cb"];

const nf = (n: number) => n.toLocaleString(getLocale()).replace(/\u202f|\u00a0/g, " ");
const kf = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)] ${className}`}>
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
    </section>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="mt-0.5 text-slate-500">
          <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: p.color || p.fill }} />
          {p.name} : <span className="font-medium text-slate-800">{nf(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function Bullet({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Meter({ pct, color = INK, track = "bg-slate-100" }: { pct: number; color?: string; track?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${track}`}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

/* -------------------------------- page --------------------------------- */

const PERIODS: StatsPeriod[] = ["jour", "semaine", "mois", "annee"];

const PERIOD_KEYS: Record<StatsPeriod, string> = {
  jour: "stat.period.day",
  semaine: "stat.period.week",
  mois: "stat.period.month",
  annee: "stat.period.year",
};

const KPI_META = [
  { key: "chiffre_affaires", label: "stat.revenue", unit: "DA", Icon: Wallet, tint: "bg-teal-50 text-teal-600", note: "stat.vsPrev" },
  { key: "benefice_net", label: "stat.netProfit", unit: "DA", Icon: TrendingUp, tint: "bg-slate-100 text-slate-600" },
  { key: "marge_moyenne", label: "stat.avgMargin", unit: "%", Icon: Percent, tint: "bg-amber-50 text-amber-600" },
  { key: "tickets", label: "stat.tickets", unit: "", Icon: Receipt, tint: "bg-slate-100 text-slate-600" },
  { key: "panier_moyen", label: "stat.avgBasket", unit: "DA", Icon: ShoppingBag, tint: "bg-amber-50 text-amber-600" },
  { key: "articles_vendus", label: "stat.itemsSold", unit: "", Icon: Boxes, tint: "bg-slate-100 text-slate-600" },
] as const;

export function Statistiques() {
  const { t } = useLang();
  const [period, setPeriod] = useState<StatsPeriod>("semaine");
  const [productMode, setProductMode] = useState<"qte" | "benefice">("qte");

  const { data, loading, error, reload } = useApi<StatsResponse>(
    (signal) => statsApi.get(period, undefined, signal),
    [period],
  );

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-[#f1f6f5] p-8">
        <Spinner label={t("stat.loading")} />
      </main>
    );
  }
  if (error && !data) {
    return (
      <main className="min-h-screen bg-[#f1f6f5] p-8">
        <ErrorState message={error} onRetry={reload} />
      </main>
    );
  }

  const stats = data;

  // ---- derive view arrays from the API response ----
  const revenue = (stats?.timeseries ?? []).map((pt) => ({ day: pt.label, ca: pt.ca, benefice: pt.benefice }));
  const tickets = (stats?.timeseries ?? []).map((pt) => ({ day: pt.label, tickets: pt.tickets }));

  const users = stats?.ventes_par_utilisateur.users ?? [];
  const totalSellerTickets = stats?.ventes_par_utilisateur.total_tickets ?? 0;
  const sellers = users.map((u) => ({ name: u.nom, tickets: u.tickets }));
  const maxSellerTickets = Math.max(1, ...users.map((u) => u.tickets));
  const sellerRows = users.map((u) => ({
    initials: toInitials(u.nom),
    name: u.nom,
    role: u.role ? t(`role.${u.role}`) : "",
    tickets: u.tickets,
    pct: Math.round(u.percent),
    ca: u.ca,
    benefice: u.benefice,
    retours: u.retours,
  }));

  const bestSource =
    productMode === "benefice"
      ? stats?.meilleures_ventes.par_benefice ?? []
      : stats?.meilleures_ventes.par_quantite ?? [];
  const products = bestSource.map((p) => ({
    name: p.designation,
    cat: p.categorie,
    qte: p.quantite,
    ca: p.ca,
    benefice: p.benefice,
    marge: p.ca > 0 ? Math.round((p.benefice / p.ca) * 100) : 0,
  }));
  const visibleProducts = [...products].sort((a, b) => b[productMode] - a[productMode]).slice(0, 10);

  const categories = (stats?.categories ?? []).map((c) => ({ name: c.nom, ca: c.ca, pct: Math.round(c.percent) }));
  const clients = (stats?.top_clients ?? []).map((c) => ({ name: c.nom, ca: c.ca, tickets: c.tickets, solde: c.solde }));
  const stockAlerts = (stats?.alertes_stock ?? []).map((a) => ({
    name: a.designation,
    stock: a.quantite,
    seuil: a.qnt_alerte,
    pct: Math.round(a.percent),
  }));

  const fmtDelta = (d: number) => `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
  const kpis = KPI_META.map((m) => {
    const k = stats?.kpis[m.key as keyof StatsResponse["kpis"]] ?? { value: 0, delta_pct: 0 };
    return {
      label: t(m.label),
      value: nf(Math.round(k.value)),
      unit: m.unit === "DA" ? t("common.currency") : m.unit,
      delta: fmtDelta(k.delta_pct),
      up: k.delta_pct >= 0,
      note: (m as { note?: string }).note ? t((m as { note?: string }).note as string) : undefined,
      Icon: m.Icon,
      tint: m.tint,
    };
  });

  const maxClientCa = Math.max(1, ...clients.map((c) => c.ca));
  const totalCatCa = categories.reduce((s, c) => s + c.ca, 0) || 1;

  return (
    <main className="min-h-screen bg-[#f1f6f5] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        {/* header */}
        <header className="flex flex-col gap-4 rounded-2xl bg-[#1c2431] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#5ed3b4]/20 text-[#5ed3b4]">
              <BarChart3 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">{t("nav.statistic")}</h1>
              <p className="text-sm text-slate-400">{t(PERIOD_KEYS[period])} {t("stat.subtitle")}</p>
            </div>
          </div>
          <nav className="flex gap-1 rounded-xl bg-white/5 p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${period === p ? "bg-[#5ed3b4] text-[#10261f]" : "text-slate-300 hover:text-white"
                  }`}
              >
                {t(PERIOD_KEYS[p])}
              </button>
            ))}
          </nav>
        </header>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map(({ label, value, unit, delta, up, note, Icon, tint }) => (
            <div key={label} className="flex h-[150px] flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)]">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${tint}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900">{value}</span>
                {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${up ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-600"
                    }`}
                >
                  {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {delta}
                </span>
                {note && <span className="text-xs text-slate-400">{note}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* revenue + sellers */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            className="h-[520px]"
            title={t("stat.revProfit")}
            subtitle={t("stat.revProfitSub")}
            action={
              <div className="flex gap-4">
                <Bullet color={TEAL} label={t("stat.ca")} />
                <Bullet color={INK} label={t("stat.profit")} />
              </div>
            }
          >
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gBen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={INK} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={INK} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e6ebea" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    ticks={[0, 65000, 130000, 195000, 260000]}
                    domain={[0, 260000]}
                    tickFormatter={kf}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="ca" name="CA" stroke={TEAL} strokeWidth={3} fill="url(#gCa)" />
                  <Area type="monotone" dataKey="benefice" name="Bénéfice" stroke={INK} strokeWidth={2.5} fill="url(#gBen)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card
            className="h-[520px]"
            title={t("stat.salesByUser")}
            subtitle={t("stat.salesByUserSub")}
            action={
              <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                <Users className="h-3.5 w-3.5" /> {nf(totalSellerTickets)} {t("stat.ticketsWord")}
              </span>
            }
          >
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sellers} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e6ebea" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    ticks={[0, 150, 300, 450, 600]}
                    domain={[0, 600]}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(94,211,180,0.08)" }} />
                  <Bar dataKey="tickets" name={t("stat.ticketsLabel")} fill={TEAL} radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-4 space-y-3">
              {sellerRows.map((s) => (
                <li key={s.name} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-xs font-bold text-teal-700">
                    {s.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {s.name} <span className="ml-1 text-xs font-medium text-slate-400">{s.role}</span>
                      </p>
                      <p className="shrink-0 text-xs text-slate-500">
                        {s.tickets} {t("stat.ticketsWord")} · {s.pct}%
                      </p>
                    </div>
                    <div className="mt-1.5">
                      <Meter pct={(s.tickets / maxSellerTickets) * 100} color={TEAL} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("stat.ca")} {nf(s.ca)} {t("common.currency")} · {t("stat.profit").toLowerCase()} {nf(s.benefice)} {t("common.currency")} · {s.retours} {t("stat.returns")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* products + categories + stock */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr]">
          <Card
            className="h-[620px]"
            title={t("stat.bestSellers")}
            subtitle={productMode === "qte" ? t("stat.top10Qty") : t("stat.top10Profit")}
            action={
              <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1">
                {(
                  [
                    { key: "qte", label: t("stat.top10QtyBtn") },
                    { key: "benefice", label: t("stat.top10ProfitBtn") },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setProductMode(tab.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${productMode === tab.key ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={visibleProducts} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e6ebea" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    angle={-18}
                    textAnchor="end"
                    interval={0}
                    height={50}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    ticks={[0, 150000, 300000, 450000, 600000]}
                    domain={[0, 600000]}
                    tickFormatter={kf}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(94,211,180,0.08)" }} />
                  <Bar dataKey="ca" name={t("stat.caDa")} fill={TEAL} radius={[6, 6, 0, 0]} barSize={22} />
                  <Line
                    type="linear"
                    dataKey="benefice"
                    name={t("stat.profitDa")}
                    stroke={INK}
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#fff", stroke: INK, strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex justify-center gap-6">
              <Bullet color={TEAL} label={t("stat.caDa").toUpperCase()} />
              <Bullet color={INK} label={t("stat.profitDa")} />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2 text-left">{t("common.product")}</th>
                    <th className="py-2 text-left">{t("common.category")}</th>
                    <th className="py-2 text-right">{t("common.qty")}</th>
                    <th className="py-2 text-right">{t("stat.ca")}</th>
                    <th className="py-2 text-right">{t("stat.profit")}</th>
                    <th className="py-2 text-right">{t("common.margin")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((p, i) => (
                    <tr key={p.name} className="border-b border-slate-50 last:border-0">
                      <td className="py-3">
                        <span className="flex items-center gap-3">
                          <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-slate-900">{p.name}</span>
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{p.cat}</td>
                      <td className="py-3 text-right text-slate-600">{nf(p.qte)}</td>
                      <td className="py-3 text-right text-slate-600">{nf(p.ca)}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{nf(p.benefice)}</td>
                      <td className="py-3 text-right">
                        <span className="inline-block rounded-lg bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700">{p.marge}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="h-[620px]" title={t("stat.categories")} subtitle={t("stat.categoriesSub")}>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="ca"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {categories.map((c, i) => (
                      <Cell key={c.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold text-slate-900">{payload[0].name}</p>
                          <p className="mt-0.5 text-slate-500">
                            {nf(payload[0].value)} {t("common.currency")} ·{" "}
                            <span className="font-medium text-slate-800">
                              {Math.round((payload[0].value / totalCatCa) * 100)}%
                            </span>
                          </p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-4 space-y-3">
              {categories.map((c, i) => (
                <li key={c.name} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate text-sm font-bold text-slate-900">{c.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {nf(c.ca)} {t("common.currency")} · {c.pct}%
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="h-[620px]" title={t("stat.stockAlerts")} subtitle={t("stat.stockAlertsSub")}>
            <ul className="space-y-4">
              {stockAlerts.map((s) => (
                <li key={s.name} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {s.stock} {t("stat.inStockThreshold")} {s.seuil}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">{s.pct}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* tickets + clients */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
          <Card
            className="h-[480px]"
            title={t("stat.salesVolume")}
            subtitle={t("stat.salesVolumeSub")}
            action={<Bullet color={TEAL} label={t("stat.ticketsLabel")} />}
          >
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tickets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e6ebea" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    ticks={[0, 75, 150, 225, 300]}
                    domain={[0, 300]}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(94,211,180,0.10)" }} />
                  <Bar dataKey="tickets" name={t("stat.ticketsLabel")} fill={TEAL} radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="h-[480px]" title={t("stat.topClients")} subtitle={t("stat.topClientsSub")}>
            <ul className="space-y-3">
              {clients.map((c) => (
                <li key={c.name} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-bold text-slate-900">{c.name}</p>
                      <p className="shrink-0 text-xs text-slate-500">
                        {nf(c.ca)} {t("common.currency")} · {c.tickets} {t("stat.ticketsWord")}
                      </p>
                    </div>
                    <div className="mt-1.5">
                      <Meter pct={(c.ca / maxClientCa) * 100} color={TEAL} />
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${c.solde < 0 ? "bg-rose-50 text-rose-600" : c.solde > 0 ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    {nf(c.solde)} {t("common.currency")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </main>
  );
}

import { type LucideProps, Bell, ChartNoAxesCombined, TrendingUp, Package } from "lucide-react";
import type { ProductStats } from "@/types/api";
import { nf } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";

type Card = {
  id: "stock" | "alerts" | "purchase" | "sale";
  text: string;
  price: string;
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
  stext: string;
};

export default function ProductsPageTopSection({
  stats,
  loading,
  masked = false,
}: {
  stats: ProductStats | null;
  loading?: boolean;
  masked?: boolean;
}) {
  const { t } = useLang();

  const data: Card[] = [
    { id: "stock", text: t("product.top.stock"), price: masked ? "•••" : nf(stats?.total_stock ?? 0), icon: Package, stext: t("product.top.stockSub") },
    { id: "alerts", text: t("product.top.alerts"), price: masked ? "•••" : nf(stats?.low_stock_count ?? 0), icon: Bell, stext: t("product.top.alertsSub") },
    { id: "purchase", text: t("product.top.purchase"), price: masked ? "•••" : nf(stats?.purchase_value ?? 0), icon: ChartNoAxesCombined, stext: t("product.top.purchaseSub") },
    { id: "sale", text: t("product.top.sale"), price: masked ? "•••" : nf(stats?.selling_value ?? 0), icon: TrendingUp, stext: t("product.top.saleSub") },
  ];

  return (
    <div className="flex flex-row items-center justify-center gap-5 mt-5 mx-4">
      {data.map((item) => (
        <div
          key={item.id}
          className="py-3 px-6 bg-white flex flex-col gap-2 min-w-[15vw] rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,0.15)]"
        >
          <div className="flex flex-row gap-2 items-center">
            <div
              className={`flex justify-center items-center rounded-lg w-7.5 h-7.5 p-1.25 ${
                item.id === "alerts"
                  ? "bg-red-50"
                  : item.id === "sale"
                    ? "bg-emerald-50"
                    : "bg-gray-100"
              }`}
            >
              <item.icon
                className={`text-xs ${
                  item.id === "alerts"
                    ? "text-red-400"
                    : item.id === "sale"
                      ? "text-teal-500"
                      : "text-gray-600"
                }`}
              />
            </div>
            <span className="text-gray-600 font-semibold text-sm">{item.text}</span>
          </div>
          <span
            className={`font-semibold text-4xl ${
              item.id === "alerts"
                ? "text-red-400"
                : item.id === "sale"
                  ? "text-teal-500"
                  : "text-black"
            } ${loading ? "opacity-40" : ""}`}
          >
            {item.price}
          </span>
          <span className="text-gray-600 text-sm">{item.stext}</span>
        </div>
      ))}
    </div>
  );
}

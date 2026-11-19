import { useState, useMemo, useEffect, useRef } from "react";
import {
  Check,
  CheckCircle2,
  Circle,
  Boxes,
  Printer,
  Trash2,
  Barcode,
  Search,
  Star,
  User,
  UserPlus,
  Package,
  Hourglass,
  Plus,
  Minus,
  X,
  Receipt,
  Clock,
  Loader2,
} from "lucide-react";
import { productsApi, clientsApi, ventesApi, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { getLocale } from "@/i18n/locale";
import { useLocation, useNavigate } from "react-router-dom";
import type { Product as ApiProduct, Partenaire, VenteDetail } from "@/types/api";
import { makeNumero } from "@/lib/utils";
import { imageSrc } from "@/lib/img";
import ValidationDialog from "./ValidationDialog";
import AddProductDialog from "@/pages/Products/Conemponemts/AddProductDialog";
import { formToProductInput, productToForm } from "@/pages/Products/productForm";
import AddPartenaireDialog from "@/components/partenaire/AddPartenaireDialog";
import type { PartenaireInput } from "@/types/api";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { playBeep } from "@/lib/scannerBridge";

// ============================================================
// TYPES
// ============================================================

type PriceTier = "detail" | "gros" | "semiGros";

type LinePrices = {
  detail: number;
  gros: number | null;
  semiGros: number | null;
};

const resolveTierPrice = (prices: LinePrices, tier: PriceTier): number => {
  const v = prices[tier];
  return v && v > 0 ? v : prices.detail;
};

type Product = {
  id: string;
  designation: string;
  price: number;
  stock: number;
  barcodes?: string[];
  boxQty: number;
  boxPrice: number;
  imageUrl?: string | null;
  prices: LinePrices;
};

// Adapt a backend product to the POS product shape
const toPosProduct = (p: ApiProduct): Product => ({
  id: String(p.id),
  designation: p.designation,
  price: Number(p.prix_vente) || 0,
  stock: Number(p.quantite) || 0,
  barcodes: p.barcodes ?? [],
  boxQty: Number(p.box_qty) || 0,
  boxPrice: Number(p.box_price) || 0,
  imageUrl: p.image_url ?? null,
  prices: {
    detail: Number(p.prix_vente) || 0,
    gros: p.prix_gros != null ? Number(p.prix_gros) : null,
    semiGros: p.prix_semi_gros != null ? Number(p.prix_semi_gros) : null,
  },
});

type CartLine = {
  id: string;
  designation: string;
  quantity: number;
  price: number;
  tier: PriceTier;
  prices: LinePrices;
  barcode?: string;
  boxQty: number;
  boxPrice: number;
};

type Ticket = {
  id: number;
  label: string;
  time: string;
  lines: CartLine[];
  // When set, this ticket was loaded from an existing sale and validating it
  // will replace that sale (same numéro) instead of creating a new one.
  venteId?: number;
  venteNumero?: string;
};

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  navy: "#0B2235",
  navyLight: "#12324A",

  green: "#3EC9A2",
  greenDark: "#2EB894",
  greenLight: "#D4F4EA",

  background: "#EFFAF6",

  border: "#E3E8EC",
  borderLight: "#E9EEF1",

  text: "#0B2235",
  muted: "#728394",

  danger: "#EE666D",
  dangerLight: "#FDEBEC",

  white: "#FFFFFF",
};

// ============================================================
// DATA
// ============================================================

// (mock PRODUCTS removed — data now comes from the API)

// ---- BON numbering ----
// The last validated BON number is kept on disk so the counter keeps growing
// after the app is closed and reopened.
const BON_KEY = "stock.pos.lastBon";

const readLastBon = (): number => {
  try {
    const n = parseInt(localStorage.getItem(BON_KEY) ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
};

const saveLastBon = (n: number) => {
  try {
    localStorage.setItem(BON_KEY, String(n));
  } catch {
    /* ignore */
  }
};

// Next free BON number, given the numbers of the tickets already open.
const nextBonId = (openIds: number[]) => Math.max(readLastBon(), 0, ...openIds) + 1;

const fmtHM = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const makeTicket = (id: number): Ticket => ({
  id,
  label: `BON #${String(id).padStart(3, "0")}`,
  time: fmtHM(new Date()),
  lines: [],
});

// Live date + time (own component, so only this text re-renders every second).
function LiveClock() {
  const { locale } = useLang();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="tabular-nums">
      {now.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
      {" — "}
      {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })}
    </span>
  );
}

// ============================================================
// HELPERS
// ============================================================

// Amount before the line discount. When pack-sale is on and the product has a
// pack (box) quantity + price, every full pack is charged at the pack price and
// the remainder at the unit price.
const lineBase = (line: CartLine, packSale: boolean) => {
  if (packSale && line.boxQty > 0 && line.boxPrice > 0) {
    const packs = Math.floor(line.quantity / line.boxQty);
    const rem = line.quantity % line.boxQty;
    return packs * line.boxPrice + rem * line.price;
  }
  return line.quantity * line.price;
};

const lineTotal = (line: CartLine, packSale = false) => lineBase(line, packSale);

// Effective unit price sent to the backend so the saved sale matches the pack total.
const lineUnitPrice = (line: CartLine, packSale: boolean) =>
  line.quantity > 0 ? lineBase(line, packSale) / line.quantity : line.price;

const ticketTotal = (ticket: Ticket, packSale = false) =>
  ticket.lines.reduce(
    (sum, line) => sum + lineTotal(line, packSale),
    0
  );

const formatDA = (number: number) =>
  number.toLocaleString(getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ============================================================
// ACTION RAIL
// ============================================================

function ActionRail({
  onCancel,
  onValidate,
  validating = false,
  editing = false,
}: {
  onCancel: () => void;
  onValidate: () => void;
  validating?: boolean;
  editing?: boolean;
}) {
  const { t } = useLang();
  const buttonClass = `
    flex
    w-full
    aspect-square
    shrink-0
    flex-col
    items-center
    justify-center
    gap-3
    rounded-[18px]
    transition-all
    duration-150
    active:scale-[0.97]
  `;

  return (
    <div
    className="
      flex
      h-full
      w-[112px]
      shrink-0
      flex-col
      items-center
      gap-3
      px-[6px]
      py-[6px]
    "
  >
      {/* =============================================== */}
      {/* ANNULER */}
      {/* =============================================== */}

      <button
        onClick={onCancel}
        className={buttonClass}
        style={{
          backgroundColor: COLORS.danger,
          color: "#FFFFFF",
          boxShadow:
            "0 3px 8px rgba(20,45,60,0.08)",
        }}
      >
        <X
          size={30}
          strokeWidth={2}
        />

        <span
          className="
            text-[11px]
            font-extrabold
            uppercase
          "
        >
          {t("pos.cancel").toUpperCase()}
        </span>
      </button>

      {/* =============================================== */}
      {/* VALIDER */}
      {/* =============================================== */}

      <button
        onClick={onValidate}
        disabled={validating}
        className={buttonClass}
        style={{
          backgroundColor: COLORS.green,
          color: "#082638",
          boxShadow:
            "0 3px 8px rgba(20,45,60,0.08)",
          opacity: validating ? 0.6 : 1,
        }}
      >
        {validating ? (
          <Loader2 size={30} strokeWidth={2.2} className="animate-spin" />
        ) : (
          <Check size={30} strokeWidth={2.2} />
        )}

        <span
          className="
            text-[11px]
            font-extrabold
            uppercase
          "
        >
          {editing ? t("pos.modify").toUpperCase() : t("pos.validate").toUpperCase()}
        </span>
      </button>

      {/* =============================================== */}
      {/* REÇU */}
      {/* =============================================== */}

      <button
        className={buttonClass}
        style={{
          backgroundColor: "#FFFFFF",
          color: COLORS.text,
          boxShadow:
            "0 3px 8px rgba(20,45,60,0.07)",
        }}
      >
        <Receipt
          size={28}
          strokeWidth={1.8}
        />

        <span
          className="
            text-[11px]
            font-extrabold
            uppercase
          "
        >
          {t("pos.receipt").toUpperCase()}
        </span>
      </button>

      {/* =============================================== */}
      {/* JOURNAL */}
      {/* =============================================== */}

      <button
        className={buttonClass}
        style={{
          backgroundColor: "#FFFFFF",
          color: COLORS.text,
          boxShadow:
            "0 3px 8px rgba(20,45,60,0.07)",
        }}
      >
        <Clock
          size={28}
          strokeWidth={1.8}
        />

        <span
          className="
            text-[11px]
            font-extrabold
            uppercase
          "
        >
          {t("pos.journal").toUpperCase()}
        </span>
      </button>
    </div>
  );
}

// ============================================================
// CART TABLE
// ============================================================

function CartTable({
  lines,
  onQty,
  onRemove,
  onEditLine,
  onSelectLine,
  selectedLineId,
  packSale,
  tierLabel,
}: {
  lines: CartLine[];
  onQty: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onEditLine: (id: string) => void;
  onSelectLine: (id: string) => void;
  selectedLineId: string | null;
  packSale: boolean;
  tierLabel: (tier: PriceTier) => string;
}) {
  const { t } = useLang();
  const grid = "grid-cols-[84px_minmax(110px,1fr)_118px_120px_120px_36px]";

  const tierPillClass: Record<PriceTier, string> = {
    detail: "bg-[#E6F7F1] text-[#0E8F6C]",
    gros: "bg-[#E6F7F1] text-[#0E8F6C]",
    semiGros: "bg-[#E6F7F1] text-[#0E8F6C]",
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white"
      style={{ boxShadow: "0 2px 8px rgba(20,45,60,0.07)" }}
    >
      {/* HEADER */}
      <div
        className={`grid ${grid} shrink-0 items-center gap-3 border-b px-5 py-3 text-[11px] font-semibold uppercase tracking-wide`}
        style={{ borderColor: COLORS.border, color: COLORS.muted }}
      >
        <span>{t("common.code").toUpperCase()}</span>
        <span>{t("common.designation").toUpperCase()}</span>
        <span className="text-center">{t("common.quantity").toUpperCase()}</span>
        <span className="text-center">{t("product.salePrice").toUpperCase()}</span>
        <span className="text-center">{t("common.total").toUpperCase()}</span>
        <span />
      </div>

      {/* BODY */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm" style={{ color: COLORS.muted }}>
              {t("pos.emptyLines")}
            </p>
          </div>
        ) : (
          lines.map((line) => {
            const selected = selectedLineId === line.id;
            return (
              <div
                key={line.id}
                onClick={() => onSelectLine(line.id)}
                className={`grid ${grid} cursor-pointer items-center gap-3 border-b px-5 py-2 transition-colors ${
                  selected ? "bg-[#F1FBF8]" : "hover:bg-[#F7FBFB]"
                }`}
                style={{ borderColor: COLORS.borderLight, minHeight: "52px" }}
              >
                {/* CODE (barcode) */}
                <span
                  className="truncate font-mono text-[12px]"
                  style={{ color: COLORS.muted }}
                  title={t("common.dblClickEditProduct")}
                  onDoubleClick={() => onEditLine(line.id)}
                >
                  {line.barcode || line.id}
                </span>

                {/* DESIGNATION */}
                <span
                  className="min-w-0 truncate text-[15px] font-bold"
                  style={{ color: COLORS.text }}
                  title={t("common.dblClickEditProduct")}
                  onDoubleClick={() => onEditLine(line.id)}
                >
                  {line.designation}
                </span>

                {/* QUANTITY stepper */}
                <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onQty(line.id, Math.max(1, line.quantity - 1))}
                    className="grid h-7 w-7 place-items-center rounded-full bg-[#EEF3F6] text-[#5B6B78] hover:bg-[#E2EAEF]"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => onQty(line.id, Math.max(1, Number(e.target.value) || 1))}
                    className="w-10 bg-transparent text-center text-[15px] font-bold tabular-nums outline-none"
                    style={{ color: COLORS.text }}
                  />
                  <button
                    onClick={() => onQty(line.id, line.quantity + 1)}
                    className="grid h-7 w-7 place-items-center rounded-full bg-[#EEF3F6] text-[#5B6B78] hover:bg-[#E2EAEF]"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* PRICE pill with tier label */}
                <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 ${tierPillClass[line.tier]} ${
                      selected ? "ring-2 ring-[#0B2235]" : ""
                    }`}
                  >
                    <span className="font-mono text-[14px] font-bold tabular-nums">
                      {formatDA(lineTotal(line, packSale) / (line.quantity || 1))}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">
                      {tierLabel(line.tier)}
                    </span>
                  </span>
                </div>

                {/* LINE TOTAL */}
                <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color: COLORS.text }}>
                    {formatDA(lineTotal(line, packSale))}
                  </span>
                </div>

                {/* DELETE */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(line.id);
                  }}
                  className="grid size-7 place-items-center rounded-lg transition-all hover:bg-[#FDEBEC]"
                  style={{ color: COLORS.muted }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCT PANEL
// ============================================================
function ProductPanel({
  onAdd,
  products,
  favorites,
  loading,
  clients,
  selectedClientId,
  onSelectClient,
  onNewProduct,
  onNewClient,
}: {
  onAdd: (product: Product) => void;
  products: Product[];
  favorites: Product[];
  loading: boolean;
  clients: Partenaire[];
  selectedClientId: number | null;
  onSelectClient: (id: number | null) => void;
  onNewProduct: () => void;
  onNewClient: () => void;
}) {
  const [tab, setTab] =
    useState<"stock" | "favoris">("stock");
  const { t } = useLang();

  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");

  const results = useMemo(() => {
    const base = tab === "favoris" ? favorites : products;

    const q = query.trim().toLowerCase();

    if (!q) return base;

    return base.filter((product) =>
      product.designation
        .toLowerCase()
        .includes(q)
    );
  }, [tab, query, products, favorites]);

  const runBarcode = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    // Try local match first (id or barcode)
    const local = products.find(
      (item) =>
        item.id === code ||
        (item.barcodes ?? []).some((b) => b.toLowerCase() === code.toLowerCase()),
    );
    if (local) {
      onAdd(local);
      playBeep(true);
      setBarcode("");
      return;
    }
    // Fall back to the API barcode lookup
    try {
      const found = await productsApi.byBarcode(code);
      onAdd(toPosProduct(found));
      playBeep(true);
      setBarcode("");
    } catch {
      // not found — short error tone, leave input for correction
      playBeep(false);
    }
  };

  const handleBarcode = () => runBarcode(barcode);

  // Phone-as-scanner: while the barcode field is focused, scans from the phone
  // are routed here (same effect as typing + Enter).
  const scanFieldProps = useBarcodeScanner((code) => {
    setBarcode(code);
    void runBarcode(code);
  });

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col"
      style={{
        gap: "8px",
      }}
    >
      {/* ================================================= */}
      {/* CLIENT */}
      {/* ================================================= */}

      <div
        className="flex w-full shrink-0 items-center bg-white"
        style={{
          height: "52px",
          minHeight: "52px",
          borderRadius: "17px",
          padding: "0 10px 0 14px",
          gap: "10px",
          boxShadow:
            "0 2px 6px rgba(20,45,60,0.06)",
        }}
      >
        <User
          size={18}
          strokeWidth={1.8}
          style={{
            flexShrink: 0,
            color: COLORS.muted,
          }}
        />

        <select
          aria-label={t("common.client")}
          value={selectedClientId ?? ""}
          onChange={(e) =>
            onSelectClient(e.target.value ? Number(e.target.value) : null)
          }
          className="min-w-0 flex-1 appearance-none bg-transparent outline-none"
          style={{
            color: COLORS.text,
            fontSize: "14px",
            fontWeight: 600,
            padding: 0,
          }}
        >
          <option value="">{t("pos.client.walkin")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>

        <button
          aria-label={t("part.newClient")}
          onClick={onNewClient}
          className="grid shrink-0 place-items-center"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            backgroundColor: COLORS.green,
            color: "#082638",
          }}
        >
          <UserPlus size={18} />
        </button>
      </div>

      {/* ================================================= */}
      {/* STOCK / FAVORIS */}
      {/* ================================================= */}

      <div
        className="grid w-full shrink-0 grid-cols-2 bg-white"
        style={{
          height: "54px",
          minHeight: "54px",
          borderRadius: "17px",
          padding: "6px",
          gap: "4px",
          boxShadow:
            "0 2px 6px rgba(20,45,60,0.06)",
        }}
      >
        <button
          onClick={() => setTab("stock")}
          className="flex min-w-0 items-center justify-center"
          style={{
            gap: "7px",
            borderRadius: "13px",
            backgroundColor:
              tab === "stock"
                ? COLORS.greenLight
                : "transparent",
            color:
              tab === "stock"
                ? COLORS.text
                : COLORS.muted,
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          <Boxes
            size={17}
            strokeWidth={1.8}
          />

          <span>{t("pos.stock").toUpperCase()}</span>
        </button>

        <button
          onClick={() => setTab("favoris")}
          className="flex min-w-0 items-center justify-center"
          style={{
            gap: "7px",
            borderRadius: "13px",
            backgroundColor:
              tab === "favoris"
                ? COLORS.greenLight
                : "transparent",
            color:
              tab === "favoris"
                ? COLORS.text
                : COLORS.muted,
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          <Star
            size={18}
            strokeWidth={1.8}
          />

          <span>{t("pos.favorites").toUpperCase()}</span>
        </button>
      </div>

      {/* ================================================= */}
      {/* BARCODE */}
      {/* ================================================= */}

      <div
        className="flex w-full shrink-0 items-center bg-white"
        style={{
          height: "52px",
          minHeight: "52px",
          borderRadius: "17px",
          padding: "0 14px",
          gap: "10px",
          boxShadow:
            "0 2px 6px rgba(20,45,60,0.06)",
        }}
      >
        <Barcode
          size={19}
          strokeWidth={1.8}
          style={{
            flexShrink: 0,
            color: COLORS.muted,
          }}
        />

        <input
          value={barcode}
          onChange={(event) =>
            setBarcode(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleBarcode();
            }
          }}
          {...scanFieldProps}
          className="min-w-0 flex-1 bg-transparent outline-none"
          style={{
            padding: 0,
            margin: 0,
            fontSize: "13px",
            color: COLORS.text,
          }}
          placeholder={t("product.barcode")}
        />
      </div>

      {/* ================================================= */}
      {/* SEARCH + PRODUCT */}
      {/* ================================================= */}

      <div
        className="flex w-full shrink-0 min-w-0"
        style={{
          height: "52px",
          minHeight: "52px",
          gap: "8px",
        }}
      >
        {/* SEARCH */}
        <div
          className="flex min-w-0 flex-1 items-center bg-white"
          style={{
            borderRadius: "17px",
            padding: "0 14px",
            gap: "10px",
            boxShadow:
              "0 2px 6px rgba(20,45,60,0.06)",
          }}
        >
          <Search
            size={19}
            strokeWidth={1.8}
            style={{
              flexShrink: 0,
              color: COLORS.muted,
            }}
          />

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            className="min-w-0 flex-1 bg-transparent outline-none"
            style={{
              padding: 0,
              margin: 0,
              fontSize: "13px",
              color: COLORS.text,
            }}
            placeholder={t("common.search")}
          />
        </div>

        {/* PRODUIT */}
        <button
          onClick={onNewProduct}
          className="flex shrink-0 items-center justify-center"
          style={{
            width: "100px",
            minWidth: "100px",
            height: "52px",
            borderRadius: "17px",
            gap: "7px",
            backgroundColor: COLORS.green,
            color: "#082638",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          <Package
            size={18}
            strokeWidth={1.9}
          />

          <span>{t("nav.products")}</span>
        </button>
      </div>

      {/* ================================================= */}
      {/* PRODUCT TABLE */}
      {/* ================================================= */}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
        style={{
          borderRadius: "19px",
          boxShadow:
            "0 2px 6px rgba(20,45,60,0.06)",
        }}
      >
        {/* HEADER */}
        <div
          className="
            grid
            shrink-0
            grid-cols-[104px_minmax(0,1fr)_70px_45px]
            gap-2
            border-b
            px-4
          "
          style={{
            height: "43px",
            alignItems: "center",
            borderColor: COLORS.border,
            color: COLORS.muted,
            fontSize: "10px",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          <span>{t("common.code").toUpperCase()}</span>

          <span>{t("common.designation").toUpperCase()}</span>

          <span className="text-right">
            {t("common.price").toUpperCase()}
          </span>

          <span className="text-right">
            {t("pos.stock").toUpperCase()}
          </span>
        </div>

        {/* BODY */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">{t("product.none")}</div>
          )}
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => onAdd(product)}
              className="
                grid
                w-full
                grid-cols-[104px_minmax(0,1fr)_70px_45px]
                gap-2
                border-b
                px-4
                text-left
                transition-colors
                hover:bg-[#F3FBF8]
              "
              style={{
                height: "43px",
                minHeight: "43px",
                alignItems: "center",
                borderColor:
                  COLORS.borderLight,
              }}
            >
              <span
                className="flex items-center gap-1.5 truncate"
                style={{
                  color: COLORS.muted,
                  fontSize: "12px",
                }}
              >
                {product.imageUrl ? (
                  <img
                    src={imageSrc(product.imageUrl)}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-md object-cover border border-[#E4ECF0]"
                  />
                ) : (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#F1F5F8] text-[#9FB0BC]">
                    <Package size={14} />
                  </span>
                )}
                <span className="truncate font-mono">
                  {product.barcodes?.[0] ?? "—"}
                </span>
              </span>

              <span
                className="min-w-0 truncate"
                style={{
                  color: COLORS.text,
                  fontSize: "13px",
                }}
              >
                {product.designation}
              </span>

              <span
                className="text-right tabular-nums"
                style={{
                  color: COLORS.text,
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {formatDA(product.price)}
              </span>

              <span
                className="text-right tabular-nums"
                style={{
                  color:
                    product.stock < 40
                      ? COLORS.danger
                      : COLORS.muted,
                  fontSize: "13px",
                  fontWeight:
                    product.stock < 40
                      ? 700
                      : 400,
                }}
              >
                {product.stock}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
// ============================================================
// TICKET TABS
// ============================================================

function TicketTabs({
  tickets,
  activeId,
  onSelect,
  onNew,
  onRemove,
  packSale,
}: {
  tickets: Ticket[];
  activeId: number;
  onSelect: (id: number) => void;
  onNew: () => void;
  onRemove: (id: number) => void;
  packSale: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="h-full w-full min-w-0 overflow-hidden">
      <div
        className="
          flex
          h-full
          w-full
          min-w-0
          gap-2
          overflow-x-auto
          overflow-y-hidden
          pb-1
        "
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#89949c transparent",
        }}
      >
        {/* ============================================== */}
        {/* ATTENTE */}
        {/* ============================================== */}

        <button
          className="
            flex
            h-full
            min-w-[135px]
            flex-1
            items-center
            justify-center
            gap-3
            rounded-[18px]
            bg-white
            px-4
            transition-all
            hover:bg-[#F8FCFA]
          "
          style={{
            boxShadow:
              "0 2px 8px rgba(20,45,60,0.07)",
          }}
        >
          <Hourglass
            size={20}
            strokeWidth={1.8}
            className="shrink-0"
            style={{
              color: COLORS.green,
            }}
          />

          <span className="min-w-0 text-left leading-tight">
            <span
              className="block truncate text-[10px] font-semibold uppercase tracking-wide"
              style={{
                color: COLORS.muted,
              }}
            >
              {t("pos.holdTop")}
            </span>

            <span
              className="block truncate text-[13px] font-bold"
              style={{
                color: COLORS.text,
              }}
            >
              {t("pos.holdBottom")}
            </span>
          </span>
        </button>

        {/* ============================================== */}
        {/* WAITING TICKETS */}
        {/* ============================================== */}

        {tickets.map((ticket) => {
          const isActive =
            activeId === ticket.id;

          return (
            <button
              key={ticket.id}
              onClick={() =>
                onSelect(ticket.id)
              }
              className="
                flex
                h-full
                min-w-[155px]
                flex-1
                items-center
                gap-3
                rounded-[18px]
                bg-white
                px-4
                text-left
                transition-all
                hover:bg-[#F8FCFA]
              "
              style={{
                boxShadow:
                  "0 2px 8px rgba(20,45,60,0.06)",

                border: isActive
                  ? `2px solid ${COLORS.green}`
                  : "2px solid transparent",
              }}
            >
              {/* NUMBER */}
              <span
                className="
                  grid
                  size-[32px]
                  shrink-0
                  place-items-center
                  rounded-[11px]
                  text-[11px]
                  font-bold
                "
                style={{
                  backgroundColor: isActive
                    ? COLORS.green
                    : "#EFF3F5",

                  color: isActive
                    ? "#082638"
                    : COLORS.muted,
                }}
              >
                {ticket.id}
              </span>

              {/* TEXT */}
              <span className="min-w-0 flex-1 leading-tight">
                <span
                  className="block truncate text-[13px] font-bold"
                  style={{
                    color: COLORS.text,
                  }}
                >
                  {t("pos.bon").toUpperCase()} #{String(ticket.id).padStart(3, "0")}
                </span>

                <span
                  className="block truncate text-[10px]"
                  style={{
                    color: COLORS.muted,
                  }}
                >
                  {ticket.time} ·{" "}
                  {formatDA(
                    ticketTotal(ticket, packSale)
                  )}{" "}
                  {t("common.currency")}
                </span>
              </span>

              <span
                role="button"
                aria-label={t("pos.cancelTicketAria")}
                title={t("pos.cancelTicket")}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(ticket.id);
                }}
                className="grid size-[22px] shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
              >
                <X size={14} />
              </span>
            </button>
          );
        })}

        {/* ============================================== */}
        {/* NEW */}
        {/* ============================================== */}

        <button
          onClick={onNew}
          className="
            flex
            h-full
            min-w-[120px]
            flex-1
            items-center
            justify-center
            gap-2
            rounded-[18px]
            border-2
            border-dashed
            px-4
            text-[12px]
            font-semibold
            transition-all
            hover:bg-white
          "
          style={{
            borderColor: "#9CDDCB",
            color: COLORS.text,
          }}
        >
          <Plus
            size={17}
            className="shrink-0"
          />

          <span className="truncate">
            {t("common.new")}
          </span>
        </button>
      </div>
    </div>
  );
}
// ============================================================
// PAGE
// ============================================================

export default function PosPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const loadedRef = useRef(false);

  const [firstBonId] = useState(() => readLastBon() + 1);

  const [tickets, setTickets] =
    useState<Ticket[]>(() => [makeTicket(firstBonId)]);

  const [activeId, setActiveId] =
    useState(firstBonId);

  const [printTicket, setPrintTicket] =
    useState(true);

  const [packSale, setPackSale] =
    useState(false);

  const [priceTier, setPriceTier] = useState<PriceTier>("detail");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  // ---- Live data ----
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [clients, setClients] = useState<Partenaire[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<ApiProduct | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const loadProducts = async () => {
    try {
      const [list, favs] = await Promise.all([
        productsApi.list(),
        productsApi.favorites().catch(() => []),
      ]);
      setProducts(list.map(toPosProduct));
      setFavorites(favs.map(toPosProduct));
    } catch {
      /* handled by empty state */
    }
  };

  useEffect(() => {
    let alive = true;
    setLoadingData(true);
    Promise.all([
      productsApi.list(),
      productsApi.favorites().catch(() => []),
      clientsApi.list().catch(() => []),
    ])
      .then(([list, favs, cls]) => {
        if (!alive) return;
        setProducts(list.map(toPosProduct));
        setFavorites(favs.map(toPosProduct));
        setClients(cls);
      })
      .finally(() => alive && setLoadingData(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load a vente coming from the sales history into a fresh ticket.
  useEffect(() => {
    const state = location.state as { loadVente?: VenteDetail } | null;
    if (!state?.loadVente || loadedRef.current) return;
    loadedRef.current = true;
    const v = state.loadVente;
    const now = new Date();
    const id = nextBonId(tickets.map((t) => t.id));
    const lines: CartLine[] = v.items.map((it) => ({
      id: String(it.product_id),
      designation: it.designation,
      quantity: it.quantite,
      price: it.prix_vente,
      tier: "detail" as PriceTier,
      prices: { detail: it.prix_vente, gros: null, semiGros: null },
      barcode: undefined,
      boxQty: 0,
      boxPrice: 0,
    }));
    const ticket: Ticket = {
      id,
      label: `BON #${String(id).padStart(3, "0")}`,
      time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      lines,
      venteId: v.id,
      venteNumero: v.numero,
    };
    setTickets((prev) => [...prev, ticket]);
    setActiveId(id);
    setSelectedClientId(v.client_id ?? null);
    navigate("/pos", { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // ACTIVE TICKET
  // ==========================================================

  const fallback: Ticket = {
    id: 1,
    label: "BON #001",
    time: "00:00",
    lines: [],
  };

  const active =
    tickets.find(
      (ticket) =>
        ticket.id === activeId
    ) ??
    tickets[0] ??
    fallback;

  // ==========================================================
  // UPDATE
  // ==========================================================

  const update = (
    fn: (ticket: Ticket) => Ticket
  ) => {
    setTickets((previous) =>
      previous.map((ticket) =>
        ticket.id === active.id
          ? fn(ticket)
          : ticket
      )
    );
  };

  // ==========================================================
  // ADD PRODUCT
  // ==========================================================

  const addProduct = (
    product: Product
  ) => {
    update((ticket) => {
      const existing =
        ticket.lines.find(
          (line) =>
            line.id === product.id
        );

      return {
        ...ticket,

        lines: existing
          ? ticket.lines.map(
              (line) =>
                line.id === product.id
                  ? {
                      ...line,
                      quantity:
                        line.quantity +
                        1,
                    }
                  : line
            )
          : [
              ...ticket.lines,

              {
                id: product.id,
                designation:
                  product.designation,
                quantity: 1,
                tier: priceTier,
                prices: product.prices,
                price: resolveTierPrice(product.prices, priceTier),
                barcode: product.barcodes?.[0],
                boxQty: product.boxQty,
                boxPrice: product.boxPrice,
              },
            ],
      };
    });
  };

  // ==========================================================
  // CHANGE QUANTITY
  // ==========================================================

  const changeQty = (id: string, quantity: number) => {
    update((ticket) => ({
      ...ticket,
      lines: ticket.lines.map((line) =>
        line.id === id ? { ...line, quantity: Number.isNaN(quantity) ? 1 : quantity } : line,
      ),
    }));
  };

  // Pick a price tier from the top bar. It becomes the default for new items,
  // and if a line is selected it re-prices that line.
  const applyTier = (tier: PriceTier) => {
    setPriceTier(tier);
    if (selectedLineId) {
      update((ticket) => ({
        ...ticket,
        lines: ticket.lines.map((line) =>
          line.id === selectedLineId
            ? { ...line, tier, price: resolveTierPrice(line.prices, tier) }
            : line,
        ),
      }));
    }
  };

  // ==========================================================
  // REMOVE
  // ==========================================================

  const removeLine = (
    id: string
  ) => {
    update((ticket) => ({
      ...ticket,

      lines: ticket.lines.filter(
        (line) =>
          line.id !== id
      ),
    }));
  };

  // ==========================================================
  // NEW TICKET
  // ==========================================================

  const newTicket = () => {
    const newItem = makeTicket(nextBonId(tickets.map((ticket) => ticket.id)));

    setTickets((previous) => [...previous, newItem]);
    setActiveId(newItem.id);
  };

  // Remove a waiting ticket. Keep at least one ticket alive.
  const removeTicket = (id: number) => {
    setTickets((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fresh = makeTicket(nextBonId([]));
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(remaining[0].id);
      return remaining;
    });
  };

  // ---- Product create / edit (same dialog as the Products page) ----
  const handleCreateProduct = async (form: Parameters<typeof formToProductInput>[0]) => {
    if (!form.designation.trim()) {
      setToast({ kind: "err", msg: t("product.designationRequired") });
      return;
    }
    try {
      await productsApi.create(formToProductInput(form));
      setShowAddProduct(false);
      await loadProducts();
      setToast({ kind: "ok", msg: t("product.added") });
    } catch (err) {
      setToast({ kind: "err", msg: err instanceof ApiError ? err.message : t("common.saveFailed") });
    }
  };

  const openEditProduct = async (lineId: string) => {
    const pid = Number(lineId);
    if (!pid) return;
    try {
      const full = await productsApi.get(pid);
      setEditProduct(full);
    } catch (err) {
      setToast({ kind: "err", msg: err instanceof ApiError ? err.message : t("product.notFound") });
    }
  };

  const handleUpdateProduct = async (form: Parameters<typeof formToProductInput>[0]) => {
    if (!editProduct) return;
    try {
      await productsApi.update(editProduct.id, formToProductInput(form));
      setEditProduct(null);
      await loadProducts();
      setToast({ kind: "ok", msg: t("product.updated") });
    } catch (err) {
      setToast({ kind: "err", msg: err instanceof ApiError ? err.message : t("common.updateFailed") });
    }
  };

  const handleCreateClient = async (body: PartenaireInput, soldeInitial: number) => {
    const created = await clientsApi.create(body);
    if (soldeInitial > 0) {
      await clientsApi.addCredit(created.id, { type: "credit", montant: soldeInitial, note: "Solde initial" });
    }
    const list = await clientsApi.list().catch(() => [] as Partenaire[]);
    setClients(list);
    setSelectedClientId(created.id);
    setShowAddClient(false);
    setToast({ kind: "ok", msg: t("part.clientAdded") });
  };

  // ==========================================================
  // VALIDATE SALE  ->  POST /api/ventes
  // ==========================================================

  const validateSale = () => {
    if (active.lines.length === 0) {
      setToast({ kind: "err", msg: t("pos.emptyTicket") });
      return;
    }
    setIsDialogOpen(true);
  };

  const confirmSale = async (paye: number) => {
    if (validating) return;
    const editingId = active.venteId;
    const numero = active.venteNumero ?? makeNumero("V");
    setValidating(true);
    try {
      // Editing an existing sale: remove it first (restores stock/credit),
      // then re-create it with the same numéro — a net update.
      if (editingId) {
        await ventesApi.remove(editingId);
      }

      await ventesApi.create({
        numero,
        client_id: selectedClientId,
        user_id: user?.id ?? null,
        date_vente: new Date().toISOString().slice(0, 19).replace("T", " "),
        paye,
        items: active.lines.map((line) => ({
          product_id: Number(line.id),
          quantite: line.quantity,
          prix_vente: lineUnitPrice(line, packSale),
          remise: 0,
        })),
      });

      // Bill validated: the ticket slot restarts empty with the next BON number
      const validatedId = active.id;
      saveLastBon(Math.max(readLastBon(), validatedId));
      const fresh = makeTicket(nextBonId(tickets.map((t) => t.id)));
      setTickets((prev) => prev.map((t) => (t.id === validatedId ? fresh : t)));
      setActiveId(fresh.id);
      setSelectedClientId(null);
      setIsDialogOpen(false);
      await loadProducts();
      setToast({ kind: "ok", msg: editingId ? t("pos.saleEdited") : t("pos.saleOk") });
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof ApiError ? err.message : t("pos.saleFailed"),
      });
    } finally {
      setValidating(false);
    }
  };

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div
      className="h-screen w-full min-w-0 overflow-hidden p-[8px]"
      style={{
        backgroundColor:
          COLORS.background,

        color: COLORS.text,

        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {toast && (
        <div
          className="fixed right-5 top-5 z-[100] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ backgroundColor: toast.kind === "ok" ? COLORS.green : COLORS.danger }}
        >
          {toast.kind === "ok" ? <Check size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}

      <main className="flex h-full min-w-0 w-full flex-col gap-3">

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <header
          className="flex h-[98px] min-h-[98px] w-full min-w-0 items-center gap-7 overflow-hidden rounded-[23px] px-8 py-5 text-white"
          style={{
            backgroundColor:
              COLORS.navy,
          }}
        >
          {/* BON NUMBER */}
          <div className="w-[90px] shrink-0">
            <p
              className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{
                color:
                  "rgba(255,255,255,0.62)",
              }}
            >
              {t("pos.bonNo").toUpperCase()}
            </p>

            <p
              className="text-[29px] font-extrabold leading-none"
              style={{
                color:
                  COLORS.green,
              }}
            >
              #
              {String(
                active.id
              ).padStart(3, "0")}
            </p>
          </div>

          {/* DATE */}
          <div className="shrink-0">
            <p
              className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{
                color:
                  "rgba(255,255,255,0.62)",
              }}
            >
              {t("common.date").toUpperCase()}
            </p>

            <p className="text-[15px] font-semibold">
              <LiveClock />
            </p>
          </div>

          {/* HEADER RIGHT */}
          <div className="ml-auto flex min-w-0 items-center gap-6">

            {/* PRICE TIER SELECTOR */}
            <div
              className="flex shrink-0 items-center gap-1 rounded-full p-1"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              {(["detail", "gros", "semiGros"] as PriceTier[]).map((tier) => {
                const active = priceTier === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => applyTier(tier)}
                    className="rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors"
                    style={{
                      backgroundColor: active ? COLORS.green : "transparent",
                      color: active ? "#082638" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {t(`pos.${tier}`)}
                  </button>
                );
              })}
            </div>

            {/* PRINT */}
            <button
              onClick={() =>
                setPrintTicket(
                  (value) =>
                    !value
                )
              }
              className="flex shrink-0 items-center gap-2 text-[14px] font-semibold"
            >
              {printTicket ? (
                <CheckCircle2
                  size={22}
                  style={{
                    color:
                      COLORS.green,
                  }}
                />
              ) : (
                <Circle
                  size={22}
                  style={{
                    color:
                      "rgba(255,255,255,0.4)",
                  }}
                />
              )}

              <Printer
                size={17}
                style={{
                  color:
                    "rgba(255,255,255,0.7)",
                }}
              />

              <span className="hidden xl:inline">
                {t("pos.printTicket")}
              </span>
            </button>

            {/* PACK */}
            <button
              onClick={() =>
                setPackSale(
                  (value) =>
                    !value
                )
              }
              className="flex shrink-0 items-center gap-2 text-[14px] font-semibold"
            >
              {packSale ? (
                <CheckCircle2
                  size={22}
                  style={{
                    color:
                      COLORS.green,
                  }}
                />
              ) : (
                <Circle
                  size={22}
                  style={{
                    color:
                      "rgba(255,255,255,0.4)",
                  }}
                />
              )}

              <Boxes
                size={17}
                style={{
                  color:
                    "rgba(255,255,255,0.7)",
                }}
              />

              <span className="hidden xl:inline">
                {t("pos.packSale")}
              </span>
            </button>

            {/* TOTAL */}
            <div
              className="flex shrink-0 items-baseline gap-2 border-l pl-6"
              style={{
                borderColor:
                  "rgba(255,255,255,0.13)",
              }}
            >
              <span
                className="text-[42px] font-extrabold leading-none tabular-nums"
                style={{
                  color: COLORS.green,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {formatDA(
                  ticketTotal(
                    active, packSale
                  )
                )}
              </span>

              <span
                className="text-[14px] font-semibold"
                style={{
                  color:
                    "rgba(62,201,162,0.72)",
                }}
              >
                {t("common.currency")}
              </span>
            </div>
          </div>
        </header>

        {/* ================================================== */}
        {/* MAIN CONTENT */}
        {/* ================================================== */}

        <div
          className="
            grid
            min-h-0
            min-w-0
            flex-1
            grid-cols-[minmax(0,1fr)_minmax(340px,31vw)_92px]
            gap-3
          "
        >

          {/* ================================================= */}
          {/* LEFT */}
          {/* ================================================= */}

          <section className="flex min-h-0 min-w-0 flex-col gap-3">

            {/* TICKETS */}
            <div className="h-[58px] min-h-[58px] min-w-0">
              <TicketTabs
                tickets={tickets}
                activeId={
                  active.id
                }
                onSelect={
                  setActiveId
                }
                onNew={
                  newTicket
                }
                onRemove={removeTicket}
                packSale={packSale}
              />
            </div>

            {/* CART */}
            <div className="min-h-0 flex-1">
              <CartTable
                lines={active.lines}
                onQty={changeQty}
                onRemove={removeLine}
                onEditLine={openEditProduct}
                onSelectLine={(id) =>
                  setSelectedLineId((cur) => (cur === id ? null : id))
                }
                selectedLineId={selectedLineId}
                packSale={packSale}
                tierLabel={(tier) => t(`pos.${tier}`).toUpperCase()}
              />
            </div>
          </section>

          {/* ================================================= */}
          {/* RIGHT */}
          {/* ================================================= */}

          <aside className="min-h-0 min-w-0">
            <ProductPanel
              onAdd={addProduct}
              products={products}
              favorites={favorites}
              loading={loadingData}
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onNewProduct={() => setShowAddProduct(true)}
              onNewClient={() => setShowAddClient(true)}
            />
          </aside>

          {/* ================================================= */}
          {/* ACTIONS */}
          {/* ================================================= */}

          <ActionRail
            onCancel={() =>
              update(
                (ticket) => ({
                  ...ticket,
                  lines: [],
                })
              )
            }
            onValidate={validateSale}
            validating={validating}
            editing={!!active.venteId}
          />
        </div>

        {isDialogOpen && (
          <ValidationDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            clientName={
              clients.find((c) => c.id === selectedClientId)?.nom ?? t("pos.client.walkin")
            }
            ancienSolde={clients.find((c) => c.id === selectedClientId)?.reste ?? 0}
            totalVente={ticketTotal(active, packSale)}
            onConfirm={confirmSale}
          />
        )}

        {showAddProduct && (
          <AddProductDialog
            onClose={() => setShowAddProduct(false)}
            onSave={handleCreateProduct}
          />
        )}

        {editProduct && (
          <AddProductDialog
            mode="edit"
            initial={productToForm(editProduct)}
            onClose={() => setEditProduct(null)}
            onSave={handleUpdateProduct}
          />
        )}

        {showAddClient && (
          <AddPartenaireDialog
            title={t("part.addClient")}
            onClose={() => setShowAddClient(false)}
            onSubmit={handleCreateClient}
          />
        )}
      </main>

      {/* ==================================================== */}
      {/* SCROLLBAR / GLOBAL CSS */}
      {/* ==================================================== */}

      <style>{`
        * {
          box-sizing: border-box;
          scrollbar-width: thin;
          scrollbar-color: #89949c transparent;
        }

        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        *::-webkit-scrollbar-track {
          background: transparent;
        }

        *::-webkit-scrollbar-thumb {
          background: #89949c;
          border-radius: 20px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: #68747d;
        }

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 1;
        }

        input,
        button,
        select {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
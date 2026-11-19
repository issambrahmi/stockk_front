import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AchatValidationDialog } from "./Coneponements/AchatValidateDialog";
import AddProductDialog from "@/pages/Products/Conemponemts/AddProductDialog";
import AddPartenaireDialog from "@/components/partenaire/AddPartenaireDialog";
import { formToProductInput, productToForm } from "@/pages/Products/productForm";
import {
  productsApi,
  fournisseursApi,
  achatsApi,
  billsApi,
  ApiError,
  type BillParseResult,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Product, Partenaire, PartenaireInput, AchatDetail } from "@/types/api";
import { makeNumero, nf } from "@/lib/utils";
import { imageSrc } from "@/lib/img";
import { useLang } from "@/context/LanguageContext";

// ============================================================
// ICONS
// ============================================================
const Ico = ({ d, size = 17, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const SCAN = "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10";
const SAVE = "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8";
const CLIP = "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z";
const BAN = "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM5 5l14 14";
const BOX = "M21 16V8l-9-5-9 5v8l9 5 9-5zM3.3 7L12 12l8.7-5M12 22V12";
const STAR = "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z";
const SEARCH = "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3";
const USER = "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6";
const UP = "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12";
const CAM = "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8";
const REFRESH = "M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15";
const CHECK = "M20 6L9 17l-5-5";
const XICON = "M18 6L6 18M6 6l12 12";
const TRASH = "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6";

// ============================================================
// TYPES
// ============================================================
interface Line {
  key: string;
  product_id: number | null;
  code: string;
  name: string;
  qte: number;
  pa: number;
  pv: number;
}
const lineTotal = (l: Line) => l.qte * l.pa;

interface ScannedRow {
  name: string;
  designation: string;
  qte: number;
  pu: number;
  pv: number;
  isNew: boolean;
  product_id: number | null;
  matchLabel: string;
}

// ============================================================
// PAGE
// ============================================================
export function Achats() {
  const { t } = useLang();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const loadedRef = useRef(false);

  const [numero, setNumero] = useState(makeNumero("A"));
  const [dateAchat, setDateAchat] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [fournisseurId, setFournisseurId] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Partenaire[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [tab, setTab] = useState<"stock" | "favoris">("stock");
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");

  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showAddFournisseur, setShowAddFournisseur] = useState(false);
  const [editAchat, setEditAchat] = useState<{ id: number; numero: string } | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // ---- scan modal state ----
  const [step, setStep] = useState<null | "upload" | "ready" | "analyse" | "result">(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "send" | "parse">("idle");
  const [scanResult, setScanResult] = useState<BillParseResult | null>(null);
  const [picked, setPicked] = useState<boolean[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const goto = (s: typeof step) => setStep(s);

  const loadProducts = async () => {
    const [list, favs] = await Promise.all([
      productsApi.list(),
      productsApi.favorites().catch(() => []),
    ]);
    setProducts(list);
    setFavorites(favs);
  };

  useEffect(() => {
    let alive = true;
    setLoadingData(true);
    Promise.all([
      productsApi.list(),
      productsApi.favorites().catch(() => []),
      fournisseursApi.list().catch(() => []),
    ])
      .then(([list, favs, four]) => {
        if (!alive) return;
        setProducts(list);
        setFavorites(favs);
        setFournisseurs(four);
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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Load an achat coming from the purchase history into the builder.
  useEffect(() => {
    const state = location.state as { loadAchat?: AchatDetail } | null;
    if (!state?.loadAchat || loadedRef.current) return;
    loadedRef.current = true;
    const a = state.loadAchat;
    setLines(
      a.items.map((it) => ({
        key: `${it.product_id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        product_id: it.product_id,
        code: String(it.product_id),
        name: it.designation,
        qte: it.quantite,
        pa: it.prix_achat,
        pv: it.prix_vente ?? 0,
      })),
    );
    setFournisseurId(a.fournisseur_id ?? null);
    setNumero(a.numero);
    setEditAchat({ id: a.id, numero: a.numero });
    navigate("/achats", { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => {
    const base = tab === "favoris" ? favorites : products;
    const q = query.trim().toLowerCase();
    return q ? base.filter((p) => p.designation.toLowerCase().includes(q)) : base;
  }, [tab, query, products, favorites]);

  const total = useMemo(() => lines.reduce((s, l) => s + lineTotal(l), 0), [lines]);

  const scannedRows: ScannedRow[] = useMemo(() => {
    if (!scanResult) return [];
    const m: ScannedRow[] = scanResult.matched.map((x) => ({
      name: x.bill_product || x.designation,
      designation: x.designation,
      qte: x.qnt || 1,
      pu: x.unite_price || x.current_prix_achat || 0,
      pv: x.current_prix_vente || 0,
      isNew: false,
      product_id: x.product_id,
      matchLabel: x.designation,
    }));
    const n: ScannedRow[] = scanResult.new.map((x) => ({
      name: x.product,
      designation: x.designation || x.product,
      qte: x.qnt || 1,
      pu: x.unite_price || 0,
      pv: 0,
      isNew: true,
      product_id: null,
      matchLabel: t("product.new"),
    }));
    return [...m, ...n];
  }, [scanResult, t]);

  const count = picked.filter(Boolean).length;

  // ---- line editing ----
  const addProduct = (p: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === p.id);
      if (existing) return prev.map((l) => (l.product_id === p.id ? { ...l, qte: l.qte + 1 } : l));
      return [
        ...prev,
        {
          key: `${p.id}-${Date.now()}`,
          product_id: p.id,
          code: p.barcodes?.[0] ?? String(p.id),
          name: p.designation,
          qte: 1,
          pa: Number(p.prix_achat) || 0,
          pv: Number(p.prix_vente) || 0,
        },
      ];
    });
  };

  const changeLine = (key: string, field: "qte" | "pa" | "pv", value: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: Number.isNaN(value) ? 0 : value } : l)));
  };
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const handleBarcode = async () => {
    const code = barcode.trim();
    if (!code) return;
    const local = products.find(
      (p) => String(p.id) === code || (p.barcodes ?? []).some((b) => b.toLowerCase() === code.toLowerCase()),
    );
    if (local) {
      addProduct(local);
      setBarcode("");
      return;
    }
    try {
      const found = await productsApi.byBarcode(code);
      addProduct(found);
      setBarcode("");
    } catch {
      setToast({ kind: "err", msg: t("product.barcodeNotFound") });
    }
  };

  // ---- create product from the "Produit" button ----
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

  // ---- modify a product by double-clicking a purchase line ----
  const openEditLine = async (l: Line) => {
    if (l.product_id == null) {
      setToast({ kind: "err", msg: t("product.notInStock") });
      return;
    }
    try {
      const full = await productsApi.get(l.product_id);
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

  // ---- create fournisseur from the fournisseur button ----
  const handleCreateFournisseur = async (body: PartenaireInput, soldeInitial: number) => {
    const created = await fournisseursApi.create(body);
    if (soldeInitial > 0) {
      await fournisseursApi.addCredit(created.id, { type: "credit", montant: soldeInitial, note: "Solde initial" });
    }
    const list = await fournisseursApi.list().catch(() => [] as Partenaire[]);
    setFournisseurs(list);
    setFournisseurId(created.id);
    setShowAddFournisseur(false);
    setToast({ kind: "ok", msg: t("part.supplierAdded") });
  };

  // ---- save (via validation dialog) ----
  const save = () => {
    if (lines.length === 0) {
      setToast({ kind: "err", msg: t("achat.addOneProduct") });
      return;
    }
    setIsDialogOpen(true);
  };

  const confirmSave = async (payeAmount: number) => {
    if (saving) return;
    setSaving(true);
    try {
      // Editing an existing purchase: delete it first (reverses stock/credit),
      // then re-create with the same numéro — a net update.
      if (editAchat) {
        await achatsApi.remove(editAchat.id);
      }

      await achatsApi.create({
        numero,
        fournisseur_id: fournisseurId,
        user_id: user?.id ?? null,
        date_achat: dateAchat || null,
        paye: payeAmount,
        items: lines.map((l) =>
          l.product_id
            ? { product_id: l.product_id, quantite: l.qte, prix_achat: l.pa, prix_vente: l.pv || undefined }
            : { designation: l.name, quantite: l.qte, prix_achat: l.pa, prix_vente: l.pv || undefined },
        ),
      });
      setToast({ kind: "ok", msg: editAchat ? t("achat.updated") : t("achat.saved") });
      setLines([]);
      setNumero(makeNumero("A"));
      setFournisseurId(null);
      setEditAchat(null);
      setIsDialogOpen(false);
      await loadProducts();
    } catch (err) {
      setToast({ kind: "err", msg: err instanceof ApiError ? err.message : t("common.saveFailed") });
    } finally {
      setSaving(false);
    }
  };

  // ---- scan flow ----
  const openScan = () => {
    setScanFile(null);
    setScanResult(null);
    setScanError(null);
    setPhase("idle");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    goto("upload");
  };

  const pickFile = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setScanFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setScanError(null);
    goto("ready");
  };

  /** Reads a File as a raw base64 string (no "data:...;base64," prefix). */
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const runExtraction = async () => {
    if (!scanFile) return;
    setScanError(null);
    setPhase("send");
    goto("analyse");
    try {
      // Send the photo as-is — Gemini reads the image directly, no local OCR.
      const base64 = await fileToBase64(scanFile);
      setPhase("parse");
      const result = await billsApi.parseImage(base64, scanFile.type || "image/jpeg");
      setScanResult(result);
      setPicked([...result.matched, ...result.new].map(() => true));
      setPhase("idle");
      goto("result");
    } catch (err) {
      setScanError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("achat.scanFailed"),
      );
      setPhase("idle");
    }
  };

  const applyScanned = () => {
    const chosen = scannedRows.filter((_, i) => picked[i]);
    if (chosen.length > 0) {
      setLines((prev) => {
        const next = [...prev];
        for (const r of chosen) {
          const existing = r.product_id != null && next.find((l) => l.product_id === r.product_id);
          if (existing) {
            existing.qte += r.qte;
          } else {
            next.push({
              key: `${r.product_id ?? "new"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              product_id: r.product_id,
              code: r.product_id != null ? String(r.product_id) : "NOUVEAU",
              name: r.designation,
              qte: r.qte,
              pa: r.pu,
              pv: r.pv,
            });
          }
        }
        return next;
      });
    }
    if (scanResult?.fournisseur_id) setFournisseurId(scanResult.fournisseur_id);
    if (scanResult?.numero) setNumero(scanResult.numero);
    if (scanResult?.date) setDateAchat(scanResult.date.slice(0, 10));
    setToast({ kind: "ok", msg: t("achat.productsAdded", { n: chosen.length }) });
    goto(null);
  };

  // step visuals
  const lectureDone = phase === "parse" || step === "result";
  const detectionDone = step === "result";
  const correspondanceBusy = phase === "parse";
  const barWidth = step === "result" ? "100%" : phase === "parse" ? "90%" : phase === "send" ? "35%" : "0%";

  return (
    <div className="w-full h-screen overflow-hidden bg-[#eef7f8] font-[Segoe_UI,system-ui,-apple-system,sans-serif] text-[#12212f] flex flex-col gap-[18px] p-[18px] box-border">
      {toast && (
        <div
          className={`fixed top-[18px] right-[18px] z-[120] rounded-[12px] px-[18px] py-3 text-[15px] font-semibold text-white shadow-lg ${
            toast.kind === "ok" ? "bg-teal-500" : "bg-[#e5484d]"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <header className="bg-[#0f1d2e] rounded-[20px] p-[22px_26px] flex items-center justify-between shrink-0">
        <div>
          <div className="text-[#94a6b8] text-[13px] tracking-[2px] font-semibold">{t("achat.total").toUpperCase()}</div>
          <div className="text-teal-400 text-[44px] font-bold leading-[1.1]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {nf(total)} <span className="text-[20px] font-semibold">{t("common.currency")}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openScan}
            className="inline-flex items-center gap-2 bg-teal-900 text-teal-400 border-none rounded-[12px] px-[18px] py-3 text-[15px] font-semibold cursor-pointer whitespace-nowrap"
          >
            <Ico d={SCAN} /> {t("achat.scan")}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-teal-400 text-[#062e24] border-none rounded-[12px] px-[18px] py-3 text-[15px] font-semibold cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <Ico d={SAVE} /> {editAchat ? t("achat.modify") : t("achat.save")}
          </button>
          {isDialogOpen && (
            <AchatValidationDialog
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              suppliertName={fournisseurs.find((f) => f.id === fournisseurId)?.nom ?? t("part.noSupplier")}
              ancienSolde={fournisseurs.find((f) => f.id === fournisseurId)?.reste ?? 0}
              totalVente={total}
              onConfirm={confirmSave}
            />
          )}
          <button className="inline-flex items-center gap-2 bg-[#1b2b3f] text-[#dbe4ee] border-none rounded-[12px] px-[18px] py-3 text-[15px] font-semibold cursor-pointer whitespace-nowrap">
            <Ico d={CLIP} /> {t("achat.bon")}
          </button>
          <button
            onClick={() => {
              setLines([]);
              if (editAchat) {
                setEditAchat(null);
                setNumero(makeNumero("A"));
                setFournisseurId(null);
              }
            }}
            className="inline-flex items-center gap-2 bg-[#3a1418] text-[#e5484d] border-none rounded-[12px] px-[18px] py-3 text-[15px] font-semibold cursor-pointer whitespace-nowrap"
          >
            <Ico d={BAN} /> {t("common.cancel")}
          </button>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 min-h-0 grid grid-cols-[1fr_380px] gap-[18px]">
        {/* LEFT CARD */}
        <section className="bg-white rounded-[20px] p-[26px] flex flex-col min-h-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-[18px] items-end shrink-0">
            <label className="block">
              <div className="text-[15px] font-semibold mb-[10px]">{t("achat.number")}</div>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full rounded-[10px] border border-[#e6ebf1] bg-white px-4 py-[13px] text-left text-[15px] font-semibold text-[#12212f] outline-none"
              />
            </label>
            <label className="block">
              <div className="text-[15px] font-semibold mb-[10px]">{t("achat.date")}</div>
              <input
                type="date"
                value={dateAchat}
                onChange={(e) => setDateAchat(e.target.value)}
                className="w-full rounded-[10px] border border-[#e6ebf1] bg-white px-4 py-3 text-left text-[15px] font-semibold text-[#7b8a9a] outline-none"
              />
            </label>
            <label className="block">
              <div className="text-[15px] font-semibold mb-[10px]">{t("common.supplier")}</div>
              <select
                value={fournisseurId ?? ""}
                onChange={(e) => setFournisseurId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-[10px] border border-[#e6ebf1] bg-white px-4 py-[13px] text-left text-[15px] font-semibold text-[#12212f] outline-none appearance-none"
              >
                <option value="">{t("common.none")}</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setShowAddFournisseur(true)}
              title={t("part.addFournisseur")}
              className="inline-flex items-center gap-2 bg-[#e7f7f1] text-teal-500 border-none rounded-[12px] p-[13px] cursor-pointer whitespace-nowrap"
            >
              <Ico d={USER} size={20} />
            </button>
          </div>

          <div className="mt-6 flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="text-left text-[#7b8a9a] text-[14px] font-medium px-2 pb-[14px]">{t("achat.codeRef")}</th>
                  <th className="text-left text-[#7b8a9a] text-[14px] font-medium px-2 pb-[14px]">{t("common.designation")}</th>
                  <th className="text-right text-[#7b8a9a] text-[14px] font-medium px-2 pb-[14px]">{t("common.quantity")}</th>
                  <th className="text-right text-[#7b8a9a] text-[14px] font-medium px-2 pb-[14px]">{t("product.purchasePrice")}</th>
                  <th className="text-right text-[#7b8a9a] text-[14px] font-medium px-2 pb-[14px]">{t("product.salePrice")}</th>
                  <th className="text-right text-[#7b8a9a] text-[14px] font-medium px-2 pb-[14px]">{t("achat.lineTotal")}</th>
                  <th className="w-[44px]" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-10 text-center text-[#7b8a9a]">
                      {t("achat.emptyLines")}
                    </td>
                  </tr>
                ) : (
                  lines.map((l, i) => (
                    <tr key={l.key} className={i ? "border-t border-[#e6ebf1]" : ""}>
                      <td
                        className="px-2 py-3 text-[#4b6a8c] font-semibold text-[15px] cursor-pointer"
                        title={t("common.dblClickEditProduct")}
                        onDoubleClick={() => openEditLine(l)}
                      >
                        {l.code}
                      </td>
                      <td
                        className="px-2 py-3 font-bold text-[15px] cursor-pointer"
                        title={t("common.dblClickEditProduct")}
                        onDoubleClick={() => openEditLine(l)}
                      >
                        {l.name}
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          value={l.qte}
                          min={0}
                          onChange={(e) => changeLine(l.key, "qte", Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full rounded-[10px] border-none bg-[#f4f7fa] px-[14px] py-[10px] text-right text-[15px] font-semibold text-[#12212f] outline-none"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          value={l.pa}
                          onChange={(e) => changeLine(l.key, "pa", parseFloat(e.target.value))}
                          className="w-full rounded-[10px] border-none bg-[#f4f7fa] px-[14px] py-[10px] text-right text-[15px] font-semibold text-[#12212f] outline-none"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          value={l.pv}
                          onChange={(e) => changeLine(l.key, "pv", parseFloat(e.target.value))}
                          className="w-full rounded-[10px] border-none bg-[#f4f7fa] px-[14px] py-[10px] text-right text-[15px] font-semibold text-[#12212f] outline-none"
                        />
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-[16px]">{nf(lineTotal(l))}</td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => removeLine(l.key)}
                          className="text-[#e5484d] hover:scale-110 transition-transform"
                          title={t("common.remove")}
                        >
                          <Ico d={TRASH} size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RIGHT CARD */}
        <aside className="bg-white rounded-[20px] p-[22px] flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 bg-[#f4f7fa] rounded-[12px] p-[5px] shrink-0">
            <button
              onClick={() => setTab("stock")}
              className={`flex items-center justify-center gap-2 rounded-[9px] py-[10px] font-bold tracking-[1px] text-[14px] ${
                tab === "stock" ? "bg-white text-[#12212f]" : "text-[#7b8a9a]"
              }`}
            >
              <Ico d={BOX} size={16} /> {t("pos.stock").toUpperCase()}
            </button>
            <button
              onClick={() => setTab("favoris")}
              className={`flex items-center justify-center gap-2 rounded-[9px] py-[10px] font-bold tracking-[1px] text-[14px] ${
                tab === "favoris" ? "bg-white text-[#12212f]" : "text-[#7b8a9a]"
              }`}
            >
              <Ico d={STAR} size={16} /> {t("pos.favorites").toUpperCase()}
            </button>
          </div>

          <div className="flex items-center gap-[10px] border border-[#e6ebf1] rounded-[12px] px-[14px] py-3 shrink-0">
            <span className="text-[#7b8a9a] tracking-[-1px] text-[14px]">||||</span>
            <input
              placeholder={t("achat.barcodePlaceholder")}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBarcode()}
              className="border-none outline-none flex-1 text-[15px] text-[#12212f]"
            />
          </div>

          <div className="flex gap-[10px] shrink-0">
            <div className="flex items-center gap-[10px] border border-[#e6ebf1] rounded-[12px] px-[14px] py-3 flex-1">
              <Ico d={SEARCH} size={16} color="#7b8a9a" />
              <input
                placeholder={t("product.searchByDesignation")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-none outline-none w-full text-[15px]"
              />
            </div>
            <button
              onClick={() => setShowAddProduct(true)}
              className="inline-flex items-center gap-2 bg-teal-400 text-[#062e24] border-none rounded-[12px] px-[18px] py-3 text-[15px] font-semibold cursor-pointer whitespace-nowrap"
            >
              <Ico d={BOX} /> {t("common.product")}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {loadingData ? (
              <div className="py-8 text-center text-[#7b8a9a] text-[14px]">{t("common.loading")}</div>
            ) : shown.length === 0 ? (
              <div className="py-8 text-center text-[#7b8a9a] text-[14px]">{t("product.none")}</div>
            ) : (
              shown.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => addProduct(s)}
                  className={`flex w-full justify-between text-left px-[2px] py-[14px] ${i ? "border-t border-[#e6ebf1]" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {s.image_url ? (
                      <img
                        src={imageSrc(s.image_url)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover border border-[#e6ebf1]"
                      />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f1f5f8] text-[#9fb0bc]">
                        <Ico d={BOX} size={18} />
                      </span>
                    )}
                    <div>
                      <div className="font-bold text-[15px]">{s.designation}</div>
                      <div className="text-[#4b6a8c] text-[13px] mt-[3px] font-mono">{s.barcodes?.[0] ?? `#${s.id}`}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[15px]">{nf(s.prix_achat)} {t("common.currency")}</div>
                    <div className="text-[#7b8a9a] text-[13px] mt-[3px]">{t("common.qty")} {nf(s.quantite)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      </main>

      {showAddProduct && (
        <AddProductDialog onClose={() => setShowAddProduct(false)} onSave={handleCreateProduct} />
      )}

      {editProduct && (
        <AddProductDialog
          mode="edit"
          initial={productToForm(editProduct)}
          onClose={() => setEditProduct(null)}
          onSave={handleUpdateProduct}
        />
      )}

      {showAddFournisseur && (
        <AddPartenaireDialog
          title={t("part.addFournisseur")}
          onClose={() => setShowAddFournisseur(false)}
          onSubmit={handleCreateFournisseur}
        />
      )}

      {/* ================= SCAN MODAL ================= */}
      {step && (
        <div className="fixed inset-0 z-[80] bg-[rgba(15,29,46,.35)] backdrop-blur-[2px] flex items-center justify-center p-6">
          <div className="bg-white rounded-[26px] p-[34px] w-[min(1080px,100%)] max-h-full overflow-auto relative shadow-[0_30px_80px_rgba(15,29,46,.25)]">
            <button
              onClick={() => goto(null)}
              className="inline-flex items-center gap-2 bg-[#f4f7fa] text-[#12212f] border-none rounded-full p-3 cursor-pointer absolute top-[26px] right-[26px]"
            >
              <Ico d={XICON} size={18} />
            </button>

            <h2 className="m-0 text-[30px] font-bold">{t("achat.scan")}</h2>
            <p className="my-2 mb-[26px] text-[#7b8a9a] text-[16px]">
              {t("achat.scanHint")}
            </p>

            {step === "upload" && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) pickFile(f);
                }}
                className="border-2 border-dashed border-teal-400 bg-[#f2fbf7] rounded-[18px] p-[56px_20px] text-center"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickFile(f);
                    e.target.value = "";
                  }}
                />
                <div className="w-[72px] h-[72px] rounded-[18px] bg-teal-400 inline-flex items-center justify-center text-[#062e24]">
                  <Ico d={SCAN} size={32} />
                </div>
                <div className="text-[22px] font-bold mt-[22px]">{t("achat.dropHere")}</div>
                <div className="text-[#7b8a9a] mt-2 text-[16px]">{t("achat.fileHint")}</div>
                <div className="flex gap-[14px] justify-center mt-[26px]">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 bg-[#0f1d2e] text-white border-none rounded-[12px] px-[22px] py-[14px] text-[16px] font-semibold cursor-pointer"
                  >
                    <Ico d={UP} /> {t("common.chooseFile")}
                  </button>
                  <button
                    onClick={() => {
                      if (fileRef.current) {
                        fileRef.current.setAttribute("capture", "environment");
                        fileRef.current.click();
                      }
                    }}
                    className="inline-flex items-center gap-2 bg-white text-[#12212f] border border-[#e6ebf1] rounded-[12px] px-[22px] py-[14px] text-[16px] font-semibold cursor-pointer"
                  >
                    <Ico d={CAM} /> {t("common.takePhoto")}
                  </button>
                </div>
              </div>
            )}

            {(step === "ready" || step === "analyse") && (
              <div className="grid grid-cols-[1fr_1fr] gap-10">
                <div className="border border-[#e6ebf1] rounded-[14px] overflow-hidden h-[400px] bg-[#f8fafc] flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt={t("achat.invoice")} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[#7b8a9a]">{t("common.noPreview")}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="m-0 text-[24px] font-bold">
                    {step === "ready" ? t("achat.imageReady") : t("achat.analyzing")}
                  </h3>
                  <div className="h-[6px] rounded-[6px] bg-[#f4f7fa] my-[18px] mb-[26px]">
                    <div
                      className="h-[6px] rounded-[6px] bg-teal-400 transition-all"
                      style={{ width: step === "ready" ? "0%" : barWidth }}
                    />
                  </div>

                  {[
                    { label: t("achat.step1"), done: lectureDone, busy: phase === "send" },
                    { label: t("achat.step2"), done: detectionDone, busy: false },
                    { label: t("achat.step3"), done: detectionDone, busy: correspondanceBusy },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-[14px] mb-5">
                      <span
                        className={`w-[28px] h-[28px] rounded-full inline-flex items-center justify-center ${
                          s.done ? "bg-[#e7f7f1] text-teal-500" : "bg-[#f4f7fa] text-[#7b8a9a]"
                        }`}
                      >
                        {s.done ? <Ico d={CHECK} size={16} /> : s.busy ? <Ico d={REFRESH} size={14} /> : null}
                      </span>
                      <span className={`text-[17px] font-medium ${step === "ready" ? "text-[#7b8a9a]" : "text-[#12212f]"}`}>
                        {s.label}
                      </span>
                    </div>
                  ))}

                  {scanError && (
                    <div className="rounded-[10px] bg-[#fdecec] text-[#c0392b] px-4 py-3 text-[14px] font-medium">
                      {scanError}
                    </div>
                  )}

                  <div className="mt-auto flex gap-[14px]">
                    {step === "ready" || scanError ? (
                      <button
                        onClick={runExtraction}
                        className="inline-flex items-center gap-2 bg-teal-400 text-[#062e24] border-none rounded-[12px] px-6 py-4 text-[17px] font-semibold cursor-pointer"
                      >
                        <Ico d={SCAN} /> {scanError ? t("common.retry") : t("achat.extract")}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 bg-[#8fdcc3] text-teal-700 border-none rounded-[12px] px-6 py-4 text-[17px] font-semibold"
                      >
                        <Ico d={REFRESH} /> {phase === "send" ? "Envoi…" : "Analyse…"}
                      </button>
                    )}
                    <button
                      onClick={openScan}
                      className="inline-flex items-center gap-2 bg-white text-[#12212f] border border-[#e6ebf1] rounded-[12px] px-6 py-4 text-[17px] font-semibold cursor-pointer"
                    >
                      {t("achat.changeImage")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === "result" && (
              <div>
                <div className="flex items-center gap-[18px] mb-[18px]">
                  <span className="bg-[#e7f7f1] text-teal-500 rounded-[999px] px-[18px] py-[10px] font-bold text-[16px]">
                    {scannedRows.length} {t("achat.productsDetected")}
                  </span>
                  <span className="text-[#7b8a9a] text-[16px]">{t("achat.uncheckHint")}</span>
                </div>

                {scannedRows.length === 0 ? (
                  <div className="border border-[#e6ebf1] rounded-[14px] py-12 text-center text-[#7b8a9a]">
                    {t("achat.noneDetected")}
                  </div>
                ) : (
                  <div className="border border-[#e6ebf1] rounded-[14px] overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#f8fafc]">
                          <th className="text-left text-[#7b8a9a] text-[15px] font-medium px-5 py-4">{t("common.import")}</th>
                          <th className="text-left text-[#7b8a9a] text-[15px] font-medium px-5 py-4">{t("achat.designationRead")}</th>
                          <th className="text-right text-[#7b8a9a] text-[15px] font-medium px-5 py-4">{t("common.quantity")}</th>
                          <th className="text-right text-[#7b8a9a] text-[15px] font-medium px-5 py-4">{t("common.unitPrice")}</th>
                          <th className="text-left text-[#7b8a9a] text-[15px] font-medium px-5 py-4">{t("achat.stockMatch")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scannedRows.map((r, i) => (
                          <tr key={`${r.name}-${i}`} className="border-t border-[#e6ebf1]">
                            <td className="px-5 py-[14px]">
                              <button
                                onClick={() => setPicked((p) => p.map((v, j) => (j === i ? !v : v)))}
                                className={`w-[26px] h-[26px] rounded-[8px] inline-flex items-center justify-center cursor-pointer ${
                                  picked[i] ? "border-none bg-[#12b886] text-white" : "border-2 border-[#e6ebf1] bg-white"
                                }`}
                              >
                                {picked[i] && <Ico d={CHECK} size={15} />}
                              </button>
                            </td>
                            <td className="px-5 py-[14px] font-bold text-[16px]">{r.name}</td>
                            <td className="px-5 py-[14px] text-right text-[16px]">{r.qte}</td>
                            <td className="px-5 py-[14px] text-right text-[16px]">{nf(r.pu)}</td>
                            <td className="px-5 py-[14px]">
                              <span
                                className={`rounded-[999px] px-[14px] py-[7px] text-[15px] font-semibold ${
                                  r.isNew ? "bg-[#fdecd8] text-[#b26a12]" : "bg-[#e7f7f1] text-teal-500"
                                }`}
                              >
                                {r.matchLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center gap-[14px] mt-6">
                  <button
                    onClick={applyScanned}
                    disabled={count === 0}
                    className="inline-flex items-center gap-2 bg-teal-400 text-[#062e24] border-none rounded-[12px] px-[26px] py-4 text-[17px] font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {t("common.add")} {count} {t("achat.addToPurchase")}
                  </button>
                  <button
                    onClick={openScan}
                    className="inline-flex items-center gap-2 bg-white text-[#12212f] border border-[#e6ebf1] rounded-[12px] px-[26px] py-4 text-[17px] font-semibold cursor-pointer"
                  >
                    <Ico d={REFRESH} /> {t("achat.rescan")}
                  </button>
                  <button
                    onClick={() => goto(null)}
                    className="inline-flex items-center gap-2 bg-transparent text-[#7b8a9a] border-none rounded-[12px] px-[26px] py-4 text-[16px] font-semibold cursor-pointer ml-auto"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

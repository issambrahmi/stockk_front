// src/components/AddProductDialog.tsx
import { useState, useRef } from "react";
import { LucidePlusSquare, X, Star } from "lucide-react";
import { filePath, imageSrc } from "@/lib/img";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { getDefaultMargin } from "@/lib/settings";
import { useLang } from "@/context/LanguageContext";

interface ProductForm {
  barcodes: string[];
  barcodeInput: string;
  designation: string;
  image: string | null;
  expiration: string;
  family: string;
  isFavorite: boolean;
  prixAchat: number;
  marge: number;
  prixVente: number;
  prixGros: number;
  prixSemiGros: number;
  boxQty: string;
  boxPrice: number;
  quantiteActuelle: number;
  quantiteAlerte: number;
  qteTrigger: string;
  prixSpecifique: number;
}

const initialState: ProductForm = {
  barcodes: [],
  barcodeInput: "",
  designation: "",
  image: null,
  expiration: "",
  family: "",
  isFavorite: false,
  prixAchat: 0,
  marge: 20,
  prixVente: 0,
  prixGros: 0,
  prixSemiGros: 0,
  boxQty: "",
  boxPrice: 0,
  quantiteActuelle: 0,
  quantiteAlerte: 5,
  qteTrigger: "",
  prixSpecifique: 0,
};

interface AddProductDialogProps {
  onClose: () => void;
  onSave?: (form: ProductForm) => void;
  initial?: Partial<ProductForm>;
  mode?: "create" | "edit";
}

export default function AddProductDialog({ onClose, onSave, initial, mode = "create" }: AddProductDialogProps) {
  const { t } = useLang();
  const [form, setForm] = useState<ProductForm>(() => {
    const base: ProductForm = { ...initialState, ...initial };
    if (initial?.prixAchat && Number(initial.prixAchat) > 0 && initial?.prixVente) {
      const pa = Number(initial.prixAchat), pv = Number(initial.prixVente);
      base.marge = Number((((pv - pa) / pa) * 100).toFixed(1));
    } else if (!initial?.prixAchat) {
      base.marge = getDefaultMargin();
    }
    return base;
  });
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductForm>(key: K, val: ProductForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "prixAchat" || key === "marge") {
        // buy price or margin % changed -> compute the sell price
        const pa = Number(next.prixAchat) || 0;
        const m = Number(next.marge) || 0;
        next.prixVente = Number((pa * (1 + m / 100)).toFixed(2));
      } else if (key === "prixVente") {
        // sell price typed by the user -> keep the buy price, recompute the margin %
        const pa = Number(next.prixAchat) || 0;
        const pv = Number(next.prixVente) || 0;
        if (pa > 0) next.marge = Number((((pv - pa) / pa) * 100).toFixed(2));
      }
      return next;
    });
  };

  // Phone-as-scanner: append phone scans to the list while the field is focused.
  const scanFieldProps = useBarcodeScanner((code) => {
    const c = code.trim();
    if (!c) return;
    setForm((p) => (p.barcodes.includes(c) ? p : { ...p, barcodes: [...p.barcodes, c], barcodeInput: "" }));
  });

  const addBarcode = () => {
    if (form.barcodeInput.trim()) {
      setForm((p) => ({
        ...p,
        barcodes: [...p.barcodes, p.barcodeInput.trim()],
        barcodeInput: "",
      }));
    }
  };

  const removeBarcode = (i: number) => {
    setForm((p) => ({ ...p, barcodes: p.barcodes.filter((_, idx) => idx !== i) }));
  };

  // Generate a random 8-digit barcode, put it in the field and add it to the list.
  const generateBarcode = () => {
    const code = String(Math.floor(10000000 + Math.random() * 90000000));
    setForm((p) => ({ ...p, barcodeInput: code, barcodes: [...p.barcodes, code] }));
  };

  const handleFile = (file: File) => {
    const p = filePath(file);
    if (p) {
      set("image", p);
    } else {
      // Browser fallback (no disk access): keep a base64 preview.
      const reader = new FileReader();
      reader.onload = () => set("image", reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const tierInput = (
    label: string,
    key: "prixGros" | "prixSemiGros",
  ) => (
    <div>
      <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
        {label}
      </label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={form[key]}
        onChange={(e) => set(key, parseFloat(e.target.value) || 0)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 bg-white transition-colors text-center"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto px-6 py-5">
        {/* Header */}
        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-base">
            <LucidePlusSquare className="w-6 h-6 rounded border-2 border-teal-600 flex items-center justify-center" />
            {mode === "edit" ? t("product.editTitle") : t("product.addTitle")}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => set("isFavorite", !form.isFavorite)}
              title={t("product.markFavorite")}
              className={`w-8 h-8 rounded-md flex items-center justify-center border transition-colors ${
                form.isFavorite
                  ? "bg-amber-50 border-amber-300 text-amber-500"
                  : "border-gray-200 text-gray-400 hover:bg-gray-50"
              }`}
            >
              <Star className="w-4 h-4" fill={form.isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              onClick={onClose}
              className="text-white bg-red-600 rounded-md w-8 h-8 flex justify-center items-center hover:bg-red-700 transition-colors"
            >
              <X />
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {/* Row 1: Barcode + Designation */}
          <div className="grid grid-cols-2 gap-5">
            {/* Barcode */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">
                {t("product.barcode")}
              </label>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h1v12H4V6zm3 0h1v12H7V6zm3 0h2v12h-2V6zm4 0h1v12h-1V6zm3 0h2v12h-2V6z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t("product.barcodeInput")}
                    value={form.barcodeInput}
                    onChange={(e) => set("barcodeInput", e.target.value)}
                    {...scanFieldProps}
                    onKeyDown={(e) => e.key === "Enter" && addBarcode()}
                    className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateBarcode}
                  title={t("product.generateBarcode")}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h1v12H4V6zm3 0h1v12H7V6zm3 0h2v12h-2V6zm4 0h1v12h-1V6zm3 0h2v12h-2V6z" />
                  </svg>
                </button>
                <button
                  onClick={addBarcode}
                  className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              {form.barcodes.length > 0 && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-black uppercase tracking-wide border-b border-gray-100">
                    {t("product.barcodeList")}
                  </div>
                  <div className="divide-y divide-gray-50">
                    {form.barcodes.map((bc, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2">
                        <button
                          onClick={() => removeBarcode(i)}
                          className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                            <circle cx="12" cy="12" r="9" strokeWidth={2} />
                          </svg>
                        </button>
                        <div className="w-5 h-5 rounded flex items-center justify-center bg-teal-50 flex-shrink-0">
                          <svg className="w-3 h-3 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4 6h1v12H4V6zm3 0h1v12H7V6zm3 0h2v12h-2V6zm4 0h1v12h-1V6zm3 0h2v12h-2V6z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-700 font-mono">{bc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Designation + Image */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                  {t("common.designation")}
                </label>
                <input
                  type="text"
                  placeholder={t("product.designationPlaceholder")}
                  value={form.designation}
                  onChange={(e) => set("designation", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-teal-400 transition-colors bg-gray-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                  {t("product.image")}
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-5 cursor-pointer transition-colors ${dragOver ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"}`}
                >
                  {form.image ? (
                    <img src={imageSrc(form.image)} alt={t("common.preview")} className="h-16 object-contain rounded" />
                  ) : (
                    <>
                      <svg className="w-7 h-7 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-gray-400">{t("common.browseOrDrop")}</span>
                      <span className="text-xs text-gray-300 mt-0.5">{t("common.imgHint").toUpperCase()}</span>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Date + Famille */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                {t("product.expiry")}
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={form.expiration}
                  onChange={(e) => set("expiration", e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                {t("product.family")}
              </label>
              <div className="flex gap-2">
                <select
                  value={form.family}
                  onChange={(e) => set("family", e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 outline-none focus:border-teal-400 bg-gray-50 focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="">{t("product.selectCategory")}</option>
                  <option value="alimentaire">{t("product.cat.food")}</option>
                  <option value="hygiene">{t("product.cat.hygiene")}</option>
                  <option value="electronique">{t("product.cat.electronics")}</option>
                  <option value="textile">{t("product.cat.textile")}</option>
                </select>
                <button className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center text-white hover:bg-teal-600 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Pricing */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                  {t("product.purchasePrice")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prixAchat}
                  onChange={(e) => set("prixAchat", parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 bg-white transition-colors text-center"
                />
              </div>
              <span className="text-gray-300 font-light text-xl mt-4">+</span>
              <div className="flex-1">
                <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                  {t("product.marginPct")}
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.marge}
                  onChange={(e) => set("marge", parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 bg-white transition-colors text-center"
                />
              </div>
              <span className="text-gray-300 font-light text-xl mt-4">=</span>
              <div className="flex-1">
                <label className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-1.5 block">
                  {t("product.salePrice")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prixVente}
                  onChange={(e) => set("prixVente", parseFloat(e.target.value) || 0)}
                  className="w-full border-2 border-teal-500 rounded-lg px-3 py-2 text-sm font-semibold text-teal-700 bg-teal-50 outline-none focus:border-teal-600 text-center"
                />
              </div>
            </div>

            {/* Tarifs complémentaires */}
            <div className="border-t border-gray-200 pt-4">
              
              <div className="grid grid-cols-2 gap-4">
                {tierInput(t("product.wholesalePrice"), "prixGros")}
                {tierInput(t("product.semiWholesalePrice"), "prixSemiGros")}
              </div>
            </div>

            {/* Colisage */}
            <div className="border-t border-gray-200 pt-4">
             
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                    {t("product.boxQty")}
                  </label>
                  <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-white focus-within:border-teal-400 transition-colors">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <input
                      type="number"
                      min="0"
                      placeholder={t("product.boxQtyPlaceholder")}
                      value={form.boxQty}
                      onChange={(e) => set("boxQty", e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-300 w-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                    {t("product.boxPrice")}
                  </label>
                  <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-white focus-within:border-teal-400 transition-colors">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.boxPrice}
                      onChange={(e) => set("boxPrice", parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-transparent text-sm outline-none text-gray-700 w-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Quantities */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                {t("product.currentQty")}
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 transition-colors">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.quantiteActuelle}
                  onChange={(e) => set("quantiteActuelle", parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700 w-0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-black uppercase tracking-wide mb-1.5 block">
                {t("product.alertQty")}
              </label>
              <div className="flex items-center border border-amber-200 rounded-lg px-3 py-2 gap-2 bg-amber-50 focus-within:border-amber-400 transition-colors">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <input
                  type="number"
                  min="0"
                  value={form.quantiteAlerte}
                  onChange={(e) => set("quantiteAlerte", parseInt(e.target.value) || 0)}
                  className="flex-1 bg-transparent text-sm outline-none text-amber-700 w-0"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="text-sm text-black hover:text-gray-700 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => onSave?.(form)}
              className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

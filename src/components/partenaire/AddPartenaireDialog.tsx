import { useState, useRef } from "react";
import { UserPlus, X, Phone, MapPin, Mail, Loader2, Wallet, Upload } from "lucide-react";
import { ApiError } from "@/lib/api";
import { filePath, imageSrc } from "@/lib/img";
import type { PartenaireInput } from "@/types/api";
import { useLang } from "@/context/LanguageContext";

interface Props {
  title: string;
  onClose: () => void;
  onSubmit: (body: PartenaireInput, soldeInitial: number) => Promise<void>;
  mode?: "create" | "edit";
  initial?: {
    nom?: string;
    telephone?: string | null;
    email?: string | null;
    adresse?: string | null;
    image?: string | null;
  };
}

export default function AddPartenaireDialog({ title, onClose, onSubmit, mode = "create", initial }: Props) {
  const { t } = useLang();
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [telephone, setTelephone] = useState(initial?.telephone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [adresse, setAdresse] = useState(initial?.adresse ?? "");
  const [soldeInitial, setSoldeInitial] = useState("");
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const p = filePath(file);
    if (p) {
      setImage(p);
    } else {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submit = async () => {
    if (!nom.trim()) {
      setError(t("common.nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        {
          nom: nom.trim(),
          telephone: telephone.trim() || null,
          email: email.trim() || null,
          adresse: adresse.trim() || null,
          image_url: image,
        },
        soldeInitial === "" ? 0 : Number(soldeInitial),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("common.saveFailed"));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto px-6 py-5">
        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-base">
            <UserPlus className="w-6 h-6 rounded border-2 border-teal-600 flex items-center justify-center p-0.5" />
            {title}
          </div>
          <button
            onClick={onClose}
            className="text-white bg-red-600 rounded-md w-8 h-8 flex justify-center items-center hover:bg-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</div>
          )}

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">
                {t("common.fullName")}
              </label>
              <input
                type="text"
                placeholder={t("common.fullNamePlaceholder")}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-teal-400 transition-colors bg-gray-50 focus:bg-white"
              />
              <p className="mt-2 text-xs font-semibold text-black uppercase tracking-wide mb-1.5">{t("common.photo")}</p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl flex items-center justify-center py-4 cursor-pointer transition-colors ${
                  dragOver ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                {image ? (
                  <img src={imageSrc(image)} alt={t("common.preview")} className="h-16 w-16 object-cover rounded-full" />
                ) : (
                  <span className="flex items-center gap-2 text-xs text-gray-400">
                    <Upload className="w-4 h-4" /> {t("common.addPhoto")}
                  </span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">
                {t("common.phone")}
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">
                {t("common.email")}
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="email"
                  placeholder="exemple@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">
              {t("common.address")}
            </label>
            <div className="flex items-start border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <textarea
                rows={2}
                placeholder={t("common.fullAddress")}
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 resize-none"
              />
            </div>
          </div>

          {mode === "create" && (
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">
                {t("part.soldeInitial")}
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
                <Wallet className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={soldeInitial}
                  onChange={(e) => setSoldeInitial(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                />
                <span className="text-sm text-gray-400">{t("common.currency")}</span>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                {t("part.soldeHint")}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="text-sm text-black hover:text-gray-700 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              disabled={saving}
              onClick={submit}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

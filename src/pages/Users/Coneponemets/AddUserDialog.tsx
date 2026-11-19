import { useState, useRef } from "react";
import {
  UserPlus, X, Upload, Phone, MapPin, Mail, DollarSign, Shield, Lock, AtSign, Eye, EyeOff, Loader2,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { filePath, imageSrc } from "@/lib/img";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { assignableRoles } from "@/lib/permissions";
import type { UserInput, UserRole } from "@/types/api";

// UI role -> backend role
const ROLE_MAP: Record<string, UserRole> = {
  admin: "admin",
  gerant: "gerant",
  vendeur: "vendeur",
  "vendeur+": "vendeur_plus",
};

interface Props {
  onClose: () => void;
  onSubmit: (body: UserInput) => Promise<void>;
}

export default function AddUserDialog({ onClose, onSubmit }: Props) {
  const { user } = useAuth();
  const { t } = useLang();
  const uiRoles = assignableRoles(user?.role).map((r) => ({
    value: r === "vendeur_plus" ? "vendeur+" : r,
    label: t(`role.${r}`),
  }));

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [salary, setSalary] = useState(0);
  const [role, setRole] = useState(uiRoles[0]?.value ?? "vendeur");
  const [picture, setPicture] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const p = filePath(file);
    if (p) {
      setPicture(p);
    } else {
      const reader = new FileReader();
      reader.onload = () => setPicture(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submit = async () => {
    if (!fullName.trim() || !username.trim() || !password) {
      setError(t("user.required"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        nom: fullName.trim(),
        username: username.trim(),
        password,
        email: email.trim() || null,
        telephone: phoneNumber.trim() || null,
        adresse: address.trim() || null,
        role: ROLE_MAP[role] ?? "vendeur",
        salaire: Number(salary) || 0,
        image_url: picture,
      });
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
            {t("user.addTitle")}
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

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">{t("common.fullName")}</label>
                <input
                  type="text"
                  placeholder={t("common.fullNamePlaceholder")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-teal-400 transition-colors bg-gray-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">{t("common.role")}</label>
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
                  <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none text-gray-700 cursor-pointer appearance-none"
                  >
                    {uiRoles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">{t("common.photo")}</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-6 cursor-pointer transition-colors ${dragOver ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"}`}
              >
                {picture ? (
                  <img src={imageSrc(picture)} alt={t("common.preview")} className="h-20 w-20 object-cover rounded-full" />
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-gray-300 mb-1" />
                    <span className="text-xs text-gray-400">{t("common.browseOrDrop")}</span>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">{t("common.phone")}</label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">{t("common.email")}</label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="email"
                  placeholder="utilisateur@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">{t("common.address")}</label>
            <div className="flex items-start border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-gray-50 focus-within:border-teal-400 focus-within:bg-white transition-colors">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <textarea
                rows={2}
                placeholder={t("common.fullAddress")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 resize-none"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">{t("user.salary")}</label>
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-white focus-within:border-teal-400 transition-colors">
              <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={salary}
                onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-transparent text-sm outline-none text-gray-700"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">{t("user.loginId")}</label>
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-white focus-within:border-teal-400 transition-colors">
                  <AtSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="nom_utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-black uppercase tracking-wide mb-1.5 block">{t("login.password")}</label>
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 bg-white focus-within:border-teal-400 transition-colors">
                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

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

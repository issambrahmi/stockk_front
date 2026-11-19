import { http } from "./http";
import type {
  AuthUser,
  Product,
  ProductStats,
  ProductInput,
  ProductQuery,
  Partenaire,
  PartenaireInput,
  PartenaireStats,
  CreditHistory,
  CreditInput,
  AppUser,
  UserInput,
  UserStats,
  AchatRow,
  AchatDetail,
  AchatInput,
  VenteRow,
  VenteDetail,
  VenteInput,
  StatsResponse,
  StatsPeriod,
} from "@/types/api";

// ---------------- Auth ----------------
export const authApi = {
  login: (username: string, password: string) =>
    http.post<AuthUser>("/api/auth/login", { username, password }),
};

// ---------------- Products ----------------
export const productsApi = {
  list: (query?: ProductQuery, signal?: AbortSignal) =>
    http.get<Product[]>("/api/products", query as Record<string, string | number>, signal),
  stats: (signal?: AbortSignal) => http.get<ProductStats>("/api/products/stats", undefined, signal),
  get: (id: number) => http.get<Product>(`/api/products/${id}`),
  create: (body: ProductInput) => http.post<Product>("/api/products", body),
  update: (id: number, body: Partial<ProductInput>) => http.put<Product>(`/api/products/${id}`, body),
  remove: (id: number) => http.del<{ message: string }>(`/api/products/${id}`),
  favorites: (signal?: AbortSignal) =>
    http.get<Product[]>("/api/products/favorites", undefined, signal),
  byBarcode: (code: string) => http.get<Product>(`/api/products/barcode/${encodeURIComponent(code)}`),
  addFavorite: (id: number) => http.post<Product>(`/api/products/${id}/favorite`),
  removeFavorite: (id: number) => http.del<Product>(`/api/products/${id}/favorite`),
};

// ---------------- Partenaire factory (clients / fournisseurs) ----------------
function makePartenaireApi(base: "clients" | "fournisseurs") {
  return {
    list: (params?: { search?: string; sort?: string; order?: string }, signal?: AbortSignal) =>
      http.get<Partenaire[]>(`/api/${base}`, params, signal),
    stats: (signal?: AbortSignal) =>
      http.get<PartenaireStats>(`/api/${base}/stats`, undefined, signal),
    create: (body: PartenaireInput) => http.post<Partenaire>(`/api/${base}`, body),
    update: (id: number, body: Partial<PartenaireInput>) =>
      http.put<Partenaire>(`/api/${base}/${id}`, body),
    remove: (id: number) => http.del<{ message: string }>(`/api/${base}/${id}`),
    credits: (id: number) => http.getFull<CreditHistory>(`/api/${base}/${id}/credits`),
    addCredit: (id: number, body: CreditInput) =>
      http.postFull<CreditHistory>(`/api/${base}/${id}/credits`, body),
    deleteCredit: (id: number, creditId: number) =>
      http.delFull<CreditHistory>(`/api/${base}/${id}/credits/${creditId}`),
  };
}

export const clientsApi = makePartenaireApi("clients");
export const fournisseursApi = makePartenaireApi("fournisseurs");

// ---------------- Users ----------------
export const usersApi = {
  list: (params?: { search?: string; role?: string; sort?: string; order?: string }, signal?: AbortSignal) =>
    http.get<AppUser[]>("/api/users", params, signal),
  stats: (signal?: AbortSignal) => http.get<UserStats>("/api/users/stats", undefined, signal),
  create: (body: UserInput) => http.post<AppUser>("/api/users", body),
  update: (id: number, body: Partial<UserInput>) => http.put<AppUser>(`/api/users/${id}`, body),
  remove: (id: number) => http.del<{ message: string }>(`/api/users/${id}`),
  credits: (id: number) => http.getFull<CreditHistory>(`/api/users/${id}/credits`),
  addCredit: (id: number, body: CreditInput) =>
    http.postFull<CreditHistory>(`/api/users/${id}/credits`, body),
  deleteCredit: (id: number, creditId: number) =>
    http.delFull<CreditHistory>(`/api/users/${id}/credits/${creditId}`),
};

// ---------------- Achats ----------------
export const achatsApi = {
  list: (
    params?: { search?: string; fournisseur?: number; user?: number; date_from?: string; date_to?: string; order?: string },
    signal?: AbortSignal,
  ) => http.get<AchatRow[]>("/api/achats", params, signal),
  get: (id: number) => http.get<AchatDetail>(`/api/achats/${id}`),
  create: (body: AchatInput) => http.post<AchatDetail>("/api/achats", body),
  remove: (id: number) => http.del<{ message: string }>(`/api/achats/${id}`),
};

// ---------------- Ventes ----------------
export const ventesApi = {
  list: (
    params?: { search?: string; client?: number; user?: number; date_from?: string; date_to?: string; order?: string },
    signal?: AbortSignal,
  ) => http.get<VenteRow[]>("/api/ventes", params, signal),
  get: (id: number) => http.get<VenteDetail>(`/api/ventes/${id}`),
  create: (body: VenteInput) => http.post<VenteDetail>("/api/ventes", body),
  remove: (id: number) => http.del<{ message: string }>(`/api/ventes/${id}`),
};

// ---------------- Stats ----------------
export const statsApi = {
  get: (period: StatsPeriod, date?: string, signal?: AbortSignal) =>
    http.get<StatsResponse>("/api/stats", { period, date }, signal),
};

// ---------------- Bills (OCR parse) ----------------
export interface BillMatched {
  product_id: number;
  designation: string;
  bill_product: string;
  similarity: number;
  current_quantite: number;
  current_prix_achat: number;
  current_prix_vente: number;
  current_date_expiration: string | null;
  qnt: number;
  unite_price: number;
}
export interface BillNew {
  designation: string;
  product: string;
  qnt: number;
  unite_price: number;
  best_score: number;
}
export interface BillParseResult {
  fournisseur: string | null;
  fournisseur_id: number | null;
  fournisseur_match: { id: number; nom: string } | null;
  numero: string | null;
  date: string | null;
  matched: BillMatched[];
  new: BillNew[];
}

export const billsApi = {
  parse: (text: string) => http.post<BillParseResult>("/api/bills/parse", { text }),
  /** Sends the bill photo as-is (base64) — Gemini reads the image directly, no local OCR. */
  parseImage: (imageBase64: string, mimeType = "image/jpeg") =>
    http.post<BillParseResult>("/api/bills/parse", { image: imageBase64, mimeType }),
};

export { ApiError } from "./http";

// ============================================================
// Shared API types — mirror the backend { success, data } shapes
// ============================================================

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  summary?: unknown;
}

// ---------- Auth ----------
export type UserRole = "admin" | "gerant" | "vendeur" | "vendeur_plus";

export interface AuthUser {
  id: number;
  nom: string;
  username: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  role: UserRole;
  salaire: number;
  image_url: string | null;
  is_active: 0 | 1 | boolean;
  created_at?: string;
  updated_at?: string;
}

// ---------- Products ----------
export type ProductStatus = "faible" | "moyene" | "eleve";

export interface Product {
  id: number;
  designation: string;
  category_id: number | null;
  category_name: string | null;
  quantite: number;
  prix_achat: number;
  prix_vente: number;
  prix_gros: number | null;
  prix_semi_gros: number | null;
  box_qty: number | null;
  box_price: number | null;
  qnt_alerte: number;
  is_favorite: 0 | 1;
  image_url: string | null;
  date_expiration: string | null;
  valeur_achat: number;
  valeur_vente: number;
  status: ProductStatus;
  barcodes: string[];
  created_at: string;
  updated_at: string;
}

export interface ProductStats {
  total_stock: number;
  low_stock_count: number;
  purchase_value: number;
  selling_value: number;
}

export interface ProductInput {
  designation: string;
  category_id?: number | null;
  quantite?: number;
  prix_achat?: number;
  prix_vente?: number;
  prix_gros?: number | null;
  prix_semi_gros?: number | null;
  box_qty?: number | null;
  box_price?: number | null;
  qnt_alerte?: number;
  is_favorite?: boolean;
  image_url?: string | null;
  date_expiration?: string | null;
  barcodes?: string[];
}

export interface ProductQuery {
  search?: string;
  category?: number | string;
  status?: ProductStatus;
  favorite?: 0 | 1;
  sort?: "price" | "designation" | "quantite" | "created_at";
  order?: "asc" | "desc";
}

// ---------- Credit ledger (shared by users/clients/fournisseurs) ----------
export interface CreditEntry {
  id: number;
  type: "credit" | "versement";
  montant: number;
  note: string | null;
  created_at: string;
  reste_apres: number;
}

export interface CreditSummary {
  credit_total: number;
  paye: number;
  reste: number;
}

export interface CreditHistory {
  summary: CreditSummary;
  data: CreditEntry[];
}

export interface CreditInput {
  type: "credit" | "versement";
  montant: number;
  note?: string;
}

// ---------- Partenaire (clients / fournisseurs share this shape) ----------
export interface Partenaire {
  id: number;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  image_url: string | null;
  credit_total: number;
  paye: number;
  reste: number;
  created_at: string;
  updated_at: string;
}

export interface PartenaireInput {
  nom: string;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  image_url?: string | null;
}

export interface PartenaireStats {
  clients_total?: number;
  fournisseurs_total?: number;
  credit_total: number;
  paye: number;
  reste: number;
}

// ---------- Users ----------
export interface AppUser {
  id: number;
  nom: string;
  username: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  role: UserRole;
  salaire: number;
  image_url: string | null;
  is_active: 0 | 1;
  credit_total: number;
  paye: number;
  reste: number;
  created_at: string;
  updated_at: string;
}

export interface UserInput {
  nom: string;
  username: string;
  password?: string;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  role?: UserRole;
  salaire?: number;
  image_url?: string | null;
  is_active?: boolean;
}

export interface UserStats {
  users_total: number;
  credit_total: number;
  paye: number;
  reste: number;
}

// ---------- Achats ----------
export interface AchatRow {
  id: number;
  numero: string;
  fournisseur_id: number | null;
  fournisseur_nom: string | null;
  user_id: number | null;
  user_nom: string | null;
  date_achat: string | null;
  total: number;
  paye: number;
  reste: number;
  nb_articles: number;
  created_at: string;
}

export interface AchatItem {
  id: number;
  product_id: number;
  designation: string;
  quantite: number;
  prix_achat: number;
  prix_vente: number | null;
  prix_total: number;
}

export interface AchatDetail extends Omit<AchatRow, "nb_articles"> {
  items: AchatItem[];
}

export interface AchatItemInput {
  product_id?: number;
  designation?: string;
  barcodes?: string[];
  quantite: number;
  prix_achat: number;
  prix_vente?: number;
  date_expiration?: string | null;
}

export interface AchatInput {
  numero: string;
  fournisseur_id?: number | null;
  user_id?: number | null;
  date_achat?: string | null;
  paye?: number;
  items: AchatItemInput[];
}

// ---------- Ventes ----------
export interface VenteRow {
  id: number;
  numero: string;
  client_id: number | null;
  client_nom: string | null;
  user_id: number | null;
  user_nom: string | null;
  date_vente: string | null;
  total: number;
  remise: number;
  paye: number;
  reste: number;
  nb_articles: number;
  created_at: string;
}

export interface VenteItem {
  id: number;
  product_id: number;
  designation: string;
  quantite: number;
  prix_vente: number;
  remise: number;
  prix_total: number;
}

export interface VenteDetail extends Omit<VenteRow, "nb_articles"> {
  items: VenteItem[];
}

export interface VenteItemInput {
  product_id: number;
  quantite: number;
  prix_vente?: number;
  remise?: number;
}

export interface VenteInput {
  numero?: string;
  client_id?: number | null;
  user_id?: number | null;
  date_vente?: string | null;
  paye?: number;
  remise?: number;
  items: VenteItemInput[];
}

// ---------- Stats (dashboard) ----------
export type StatsPeriod = "jour" | "semaine" | "mois" | "annee";

export interface KpiValue {
  value: number;
  delta_pct: number;
}

export interface StatsResponse {
  period: StatsPeriod;
  range: { from: string; to: string };
  previous_range: { from: string; to: string };
  kpis: {
    chiffre_affaires: KpiValue;
    benefice_net: KpiValue;
    marge_moyenne: KpiValue;
    tickets: KpiValue;
    panier_moyen: KpiValue;
    articles_vendus: KpiValue;
    retours: KpiValue;
  };
  timeseries: { label: string; ca: number; benefice: number; tickets: number }[];
  ventes_par_utilisateur: {
    total_tickets: number;
    users: {
      user_id: number | null;
      nom: string;
      role: UserRole | null;
      tickets: number;
      percent: number;
      ca: number;
      benefice: number;
      retours: number;
    }[];
  };
  meilleures_ventes: {
    par_quantite: TopProduct[];
    par_benefice: TopProduct[];
  };
  categories: {
    category_id: number | null;
    nom: string;
    ca: number;
    percent: number;
  }[];
  alertes_stock: {
    product_id: number;
    designation: string;
    quantite: number;
    qnt_alerte: number;
    percent: number;
  }[];
  top_clients: {
    client_id: number | null;
    nom: string;
    tickets: number;
    ca: number;
    solde: number;
  }[];
}

export interface TopProduct {
  product_id: number;
  designation: string;
  categorie: string;
  quantite: number;
  ca: number;
  benefice: number;
}

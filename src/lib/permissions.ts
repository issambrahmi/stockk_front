import type { UserRole } from "@/types/api";

export type PageKey =
  | "pos"
  | "products"
  | "salesHistory"
  | "achats"
  | "achatsHistory"
  | "clients"
  | "fournisseurs"
  | "users"
  | "statistic"
  | "settings";

// Which pages each role may open.
const PAGE_ACCESS: Record<UserRole, PageKey[]> = {
  admin: [
    "pos", "products", "salesHistory", "achats", "achatsHistory",
    "clients", "fournisseurs", "users", "statistic", "settings",
  ],
  gerant: [
    "pos", "products", "salesHistory", "achats", "achatsHistory",
    "clients", "fournisseurs", "users", "settings",
  ],
  vendeur: ["pos", "salesHistory", "clients", "settings"],
  vendeur_plus: [
    "pos", "salesHistory", "clients",
    "products", "fournisseurs", "achats", "achatsHistory", "settings",
  ],
};

export function canAccess(role: UserRole | undefined, page: PageKey): boolean {
  if (!role) return false;
  return PAGE_ACCESS[role]?.includes(page) ?? false;
}

// Action-level permissions.
export function canDeleteProduct(role: UserRole | undefined): boolean {
  return role === "admin" || role === "gerant";
}

// Which user roles the current user is allowed to create/assign.
export function assignableRoles(role: UserRole | undefined): UserRole[] {
  if (role === "admin") return ["admin", "gerant", "vendeur", "vendeur_plus"];
  if (role === "gerant") return ["vendeur", "vendeur_plus"];
  return [];
}

// Whether stat-card numeric values should be hidden (shown as •••).
export function maskStatValues(role: UserRole | undefined): boolean {
  return role === "vendeur_plus";
}

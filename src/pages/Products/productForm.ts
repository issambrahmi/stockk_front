import type { Product, ProductInput } from "@/types/api";

export interface ProductFormLike {
  designation: string;
  barcodes: string[];
  prixAchat: number;
  prixVente: number;
  prixGros: number;
  prixSemiGros: number;
  boxQty: string;
  boxPrice: number;
  quantiteActuelle: number;
  quantiteAlerte: number;
  isFavorite: boolean;
  expiration: string;
  image?: string | null;
}

export function formToProductInput(form: ProductFormLike): ProductInput {
  return {
    designation: form.designation.trim(),
    barcodes: form.barcodes.filter(Boolean),
    quantite: Number(form.quantiteActuelle) || 0,
    prix_achat: Number(form.prixAchat) || 0,
    prix_vente: Number(form.prixVente) || 0,
    prix_gros: form.prixGros || null,
    prix_semi_gros: form.prixSemiGros || null,
    box_qty: form.boxQty ? Number(form.boxQty) : null,
    box_price: form.boxPrice || null,
    qnt_alerte: Number(form.quantiteAlerte) || 0,
    is_favorite: form.isFavorite,
    date_expiration: form.expiration || null,
    image_url: form.image ?? null,
  };
}

export function productToForm(p: Product) {
  return {
    designation: p.designation,
    barcodes: p.barcodes ?? [],
    image: p.image_url,
    expiration: p.date_expiration ? String(p.date_expiration).slice(0, 10) : "",
    family: p.category_name ?? "",
    isFavorite: !!p.is_favorite,
    prixAchat: Number(p.prix_achat) || 0,
    prixVente: Number(p.prix_vente) || 0,
    prixGros: Number(p.prix_gros) || 0,
    prixSemiGros: Number(p.prix_semi_gros) || 0,
    boxQty: p.box_qty != null ? String(p.box_qty) : "",
    boxPrice: Number(p.box_price) || 0,
    quantiteActuelle: Number(p.quantite) || 0,
    quantiteAlerte: Number(p.qnt_alerte) || 0,
  };
}

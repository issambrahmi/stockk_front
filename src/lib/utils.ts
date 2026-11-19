import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getCurrency, getLocale } from "@/i18n/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number the French way: "12 300" */
export function nf(n: number | null | undefined): string {
  const value = Number(n) || 0;
  return value.toLocaleString(getLocale()).replace(/\u202f|\u00a0/g, " ");
}

/** Format money: "12 300,00 DA" */
export function formatDA(n: number | null | undefined): string {
  const value = Number(n) || 0;
  return (
    value
      .toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(/\u202f|\u00a0/g, " ") + " " + getCurrency()
  );
}

/** Short number for chart axes: 130000 -> "130k" */
export function kf(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
}

/** Initials from a full name: "Aichoun Azzedine" -> "AA" */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "24 Juin 2026" from an ISO date / datetime */
export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const date = d.toLocaleDateString(getLocale(), { day: "2-digit", month: "long", year: "numeric" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString(getLocale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${date} ${time}`;
}

/** Generate a short unique-ish bon number, e.g. "V-1723489011" */
export function makeNumero(prefix: string): string {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

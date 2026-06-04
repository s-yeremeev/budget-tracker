import type { AssetType } from "@/lib/types";

export const CURRENCIES = [
  { code: "UAH", symbol: "₴", label: "Гривня" },
  { code: "USD", symbol: "$", label: "Долар" },
  { code: "EUR", symbol: "€", label: "Євро" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  investment: "Інвестиції",
  safety: "Подушка безпеки",
  cash: "Готівка та картки",
  custom: "Інше",
};

// Палітра кольорів для категорій (узгоджена з дизайн-системою)
export const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b",
  "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#64748b",
];

// Набір іконок lucide для вибору в категоріях
export const CATEGORY_ICONS = [
  "ShoppingCart", "Coffee", "Bus", "Car", "Shirt", "GraduationCap",
  "HeartPulse", "Gamepad2", "Home", "Utensils", "Plane", "Gift",
  "Smartphone", "Dumbbell", "Baby", "PawPrint", "Fuel", "Pizza",
  "Wallet", "TrendingUp", "ShieldCheck", "Landmark", "PiggyBank",
  "CreditCard", "Bitcoin", "Tag",
] as const;

export interface NavItem {
  href: string;
  label: string;
  icon: string; // назва lucide-іконки
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: "LayoutDashboard" },
  { href: "/expenses", label: "Витрати", icon: "Receipt" },
  { href: "/income", label: "Доходи", icon: "Banknote" },
  { href: "/recurring", label: "Повторювані", icon: "Repeat" },
  { href: "/budget", label: "Бюджет", icon: "PiggyBank" },
  { href: "/goals", label: "Цілі", icon: "Target" },
  { href: "/assets", label: "Активи", icon: "Landmark" },
  { href: "/credits", label: "Кредити", icon: "CreditCard" },
  { href: "/analytics", label: "Аналітика", icon: "ChartPie" },
];

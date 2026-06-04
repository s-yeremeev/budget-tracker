export interface NavItem {
  href: string;
  label: string;
  icon: string; // назва lucide-іконки
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: "LayoutDashboard" },
  { href: "/expenses", label: "Витрати", icon: "Receipt" },
  { href: "/budget", label: "Бюджет", icon: "PiggyBank" },
  { href: "/assets", label: "Активи", icon: "Landmark" },
  { href: "/analytics", label: "Аналітика", icon: "ChartPie" },
];

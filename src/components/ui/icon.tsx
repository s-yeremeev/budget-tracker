import {
  Baby,
  Banknote,
  Bitcoin,
  Briefcase,
  Bus,
  Car,
  ChartColumn,
  ChartPie,
  Coffee,
  Command,
  CreditCard,
  Dumbbell,
  FileText,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  House,
  Landmark,
  LayoutDashboard,
  ListChecks,
  PawPrint,
  PiggyBank,
  Pizza,
  Plane,
  Plus,
  Receipt,
  Repeat,
  Rocket,
  Scale,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Smartphone,
  Tag,
  Target,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Іконки, які можна показати за НАЗВОЮ (збережена в БД у категорій/цілей/активів або
 * задана рядком у меню, довідці, картках). Лише явний список: `import { icons }` тягнув
 * у кожну сторінку весь набір lucide (~1600 іконок, ~165 KB gzip).
 * Додаєш нову назву в CATEGORY_ICONS / GOAL_ICONS / nav чи рядок `icon="…"` — додай і сюди
 * (тест `icon.test.ts` це перевіряє).
 */
export const ICONS: Record<string, LucideIcon> = {
  Baby,
  Banknote,
  Bitcoin,
  Briefcase,
  Bus,
  Car,
  ChartColumn,
  ChartPie,
  Coffee,
  Command,
  CreditCard,
  Dumbbell,
  FileText,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  House,
  Home: House, // стара назва з lucide 0.x (у 1.x — House); могла лишитись у БД
  Landmark,
  LayoutDashboard,
  ListChecks,
  PawPrint,
  PiggyBank,
  Pizza,
  Plane,
  Plus,
  Receipt,
  Repeat,
  Rocket,
  Scale,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Smartphone,
  Tag,
  Target,
  TrendingUp,
  Utensils,
  Wallet,
};

type IconProps = LucideProps & { name: string };

/** Рендерить іконку lucide за її назвою (PascalCase); невідома назва → Tag. */
export function Icon({ name, ...props }: IconProps) {
  const LucideIcon = ICONS[name] ?? Tag;
  return <LucideIcon {...props} />;
}

import { icons, type LucideProps } from "lucide-react";

type IconProps = LucideProps & { name: string };

/** Рендерить іконку lucide за її назвою (PascalCase). */
export function Icon({ name, ...props }: IconProps) {
  const LucideIcon = icons[name as keyof typeof icons] ?? icons.Tag;
  return <LucideIcon {...props} />;
}

/// <reference types="vitest/globals" />
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ICONS, Icon } from "@/components/ui/icon";
import { CATEGORY_ICONS, GOAL_ICONS } from "@/lib/constants";
import { NAV_ITEMS } from "@/components/layout/nav-items";

const ROOT = path.resolve(__dirname, "../../..");

/** Усі рядки-назви іконок у коді: у рядках, де є слово icon (icon: "X", icon="X", icon={a ? "X" : "Y"}, ?? "Tag"). */
function iconLiteralsInSource(): Map<string, string> {
  const found = new Map<string, string>();
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && !f.endsWith(".test.ts")) {
        for (const line of fs.readFileSync(p, "utf8").split("\n")) {
          if (!/icon/i.test(line) || /from "lucide-react"/.test(line)) continue;
          for (const m of line.matchAll(/["']([A-Z][A-Za-z0-9]+)["']/g)) found.set(m[1], path.relative(ROOT, p));
        }
      }
    }
  };
  walk(path.join(ROOT, "src"));
  return found;
}

/** Іконки стартових категорій/активів/цілей у schema.sql (тригер реєстрації + default). */
function iconsInSchema(): string[] {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/schema.sql"), "utf8");
  const names = new Set<string>();
  for (const m of sql.matchAll(/icon\s+text not null default '([A-Za-z0-9]+)'/g)) names.add(m[1]);
  // insert … (user_id, name, [type,] icon, color) values (new.id, 'Назва', ['type',] 'Icon', '#hex')
  for (const m of sql.matchAll(/'([A-Z][A-Za-z0-9]+)',\s*'#[0-9a-fA-F]{6}'/g)) names.add(m[1]);
  return [...names];
}

describe("Icon — лише явний список, без усього lucide", () => {
  it("кожна назва з вибору категорій і цілей є в ICONS", () => {
    for (const n of [...CATEGORY_ICONS, ...GOAL_ICONS]) expect(ICONS[n], n).toBeDefined();
  });

  it("кожна назва з меню є в ICONS", () => {
    for (const item of NAV_ITEMS) expect(ICONS[item.icon], item.icon).toBeDefined();
  });

  it("стартові іконки з schema.sql є в ICONS", () => {
    const names = iconsInSchema();
    expect(names).toEqual(expect.arrayContaining(["ShoppingCart", "Tag", "Wallet", "TrendingUp", "Target"]));
    for (const n of names) expect(ICONS[n], n).toBeDefined();
  });

  it("кожен рядок-іконка в коді (icon: \"X\", icon=\"X\", ?? \"Tag\") є в ICONS", () => {
    const literals = iconLiteralsInSource();
    expect(literals.size).toBeGreaterThanOrEqual(15); // скан справді щось знайшов
    const missing = [...literals].filter(([n]) => !ICONS[n]).map(([n, file]) => `${n} (${file})`);
    expect(missing).toEqual([]);
  });

  it("усі значення — справжні компоненти; стара назва Home → House", () => {
    for (const [name, C] of Object.entries(ICONS)) expect(C, name).toBeTruthy();
    expect(ICONS.Home).toBe(ICONS.House);
  });

  it("рендер: відома назва → своя іконка, невідома → Tag", () => {
    const html = (name: string) => renderToStaticMarkup(createElement(Icon, { name }));
    expect(html("ShoppingCart")).toContain("lucide-shopping-cart");
    expect(html("Home")).toContain("lucide-house");
    expect(html("NoSuchIcon")).toContain("lucide-tag");
  });
});

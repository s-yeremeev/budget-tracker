export interface WidgetDef {
  key: string;
  label: string;
  group: "Метрики" | "Блоки";
}

export const DASHBOARD_WIDGETS: WidgetDef[] = [
  { key: "m_networth", label: "Чистий капітал", group: "Метрики" },
  { key: "m_income", label: "Доходи місяця", group: "Метрики" },
  { key: "m_expenses", label: "Витрати місяця", group: "Метрики" },
  { key: "m_balance", label: "Баланс місяця", group: "Метрики" },
  { key: "m_topcat", label: "Найбільша категорія", group: "Метрики" },
  { key: "m_budget", label: "Бюджет / транзакції", group: "Метрики" },
  { key: "insights", label: "Інсайти", group: "Блоки" },
  { key: "networth_chart", label: "Динаміка капіталу", group: "Блоки" },
  { key: "category_donut", label: "Витрати за категоріями", group: "Блоки" },
  { key: "goals", label: "Фінансові цілі", group: "Блоки" },
  { key: "credits", label: "Кредити", group: "Блоки" },
  { key: "upcoming", label: "Найближчі платежі", group: "Блоки" },
  { key: "recent", label: "Останні витрати", group: "Блоки" },
];

/** Віджет видимий, якщо явно не вимкнений (за замовчуванням усе ввімкнено). */
export function isWidgetOn(prefs: Record<string, boolean> | null | undefined, key: string) {
  return prefs?.[key] !== false;
}

// Авто-нарахування (підписки + авто-платежі по кредитах) — раз на день, а не на кожному переході.
// Позначка дня зберігається у profiles.auto_processed_on (UTC-дата, як і в самих нарахуваннях).
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { processRecurring } from "@/lib/server/recurring";
import { processCreditPayments } from "@/lib/server/credit-payments";
import { toISODate } from "@/lib/utils";
import { dailyProcessingAction, type DayMarker } from "@/lib/daily-marker";

/**
 * Запускає авто-нарахування, якщо сьогодні його ще не було.
 * Повертає true, якщо згенеровано нові витрати (баланси активів могли змінитися).
 */
export async function runDailyProcessing(userId: string, profile: DayMarker): Promise<boolean> {
  const today = toISODate(new Date());
  const action = dailyProcessingAction(profile, today);
  if (action === "skip") return false;

  const supabase = await createClient();
  if (action === "claim") {
    // Атомарно «забираємо» день: UPDATE з умовою на попереднє значення — з паралельних
    // запитів рядок оновить лише один, решта отримають 0 рядків і пропустять обробку.
    // Прості фільтри замість or(...): на PostgREST 12 PATCH з or() по цій колонці
    // падав з 42703 «column does not exist».
    const markedOn = profile?.auto_processed_on ?? null;
    let claim = supabase.from("profiles").update({ auto_processed_on: today }).eq("id", userId);
    claim = markedOn === null ? claim.is("auto_processed_on", null) : claim.lt("auto_processed_on", today);
    const { data: claimed, error } = await claim.select("id");
    // Помилка позначки (напр. права) — обробляємо як раніше, на кожному запиті:
    // краще зайва перевірка, ніж підписки, що тихо перестали нараховуватись.
    if (!error && (!claimed || claimed.length === 0)) return false; // вже обробив інший запит
  }

  try {
    const recurringChanged = await processRecurring(userId);
    const creditsChanged = await processCreditPayments(userId);
    return recurringChanged || creditsChanged;
  } catch (e) {
    // Не вдалося — знімаємо позначку, щоб наступний запит спробував знову.
    if (action === "claim") await resetDailyProcessing(supabase, userId);
    throw e;
  }
}

/**
 * Скидає позначку дня — після створення/зміни шаблону підписки чи кредиту,
 * щоб нове нарахування на сьогодні перевірилось уже на наступному завантаженні.
 * Помилки ігноруються (напр. колонки ще немає).
 */
export async function resetDailyProcessing(supabase: SupabaseClient, userId: string) {
  await supabase.from("profiles").update({ auto_processed_on: null }).eq("id", userId);
}

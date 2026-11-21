// Скелет під час переходу між сторінками: layout (меню, шапка) лишається, а замість
// вмісту сторінки одразу показуються «заглушки» — без порожнього екрана, поки сервер
// готує дані. Next автоматично загортає сторінку в Suspense з цим fallback.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Завантаження…">
      <div className="h-5 w-40 animate-pulse rounded-lg bg-surface-2" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-surface-2" />
            <div className="mt-4 h-4 w-28 animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-7 w-36 animate-pulse rounded bg-surface-2" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="h-5 w-48 animate-pulse rounded bg-surface-2" />
        <ul className="mt-4 space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-surface-2" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

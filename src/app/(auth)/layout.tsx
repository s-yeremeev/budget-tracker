import { Wallet, TrendingUp, PieChart, Target } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Лівий брендований бік */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between p-12 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 20%, rgba(255,255,255,0.25), transparent), radial-gradient(50% 50% at 90% 80%, rgba(255,255,255,0.18), transparent)",
          }}
        />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Wallet className="h-5 w-5" />
          </div>
          Бюджет
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight">
            Твої фінанси —<br />під повним контролем
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Відстежуй активи, плануй витрати та досягай фінансових цілей. Чисто,
            швидко й приємно щодня.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              { icon: TrendingUp, t: "Net Worth у динаміці" },
              { icon: PieChart, t: "Аналітика витрат за категоріями" },
              { icon: Target, t: "Бюджети та фінансові цілі" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3 text-white/90">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} Бюджет. Особистий фінансовий трекер.
        </p>
      </div>

      {/* Правий бік — форма */}
      <div className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

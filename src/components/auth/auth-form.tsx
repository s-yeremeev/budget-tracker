"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Не вдалося авторизуватися. Спробуйте ще раз." : null,
  );
  const [info, setInfo] = useState<string | null>(null);

  const redirectTo = params.get("redirect") ?? "/dashboard";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${siteUrl}/auth/callback`,
          },
        });
        if (error) throw error;
        // Якщо підтвердження email вимкнено — сесія вже активна.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setInfo("Майже готово! Перевірте пошту, щоб підтвердити реєстрацію.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setError(messageFor(error));
      setGoogleLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleGoogle}
        loading={googleLoading}
      >
        <GoogleIcon />
        Продовжити через Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs text-fg-subtle">
        <span className="h-px flex-1 bg-border" />
        або через email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmail} className="space-y-4">
        {mode === "signup" && (
          <div>
            <Label htmlFor="name">Імʼя</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Олександр"
                className="pl-9"
                autoComplete="name"
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-9"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password">Пароль</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-9"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="flex items-start gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{info}</span>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {mode === "signup" ? "Створити акаунт" : "Увійти"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-muted">
        {mode === "signup" ? (
          <>
            Вже маєте акаунт?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Увійти
            </Link>
          </>
        ) : (
          <>
            Ще немає акаунта?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Зареєструватися
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function messageFor(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(msg)) return "Невірний email або пароль.";
  if (/already registered/i.test(msg)) return "Користувач із таким email вже існує.";
  if (/email not confirmed/i.test(msg)) return "Підтвердіть email перед входом.";
  if (/rate limit/i.test(msg)) return "Забагато спроб. Спробуйте трохи пізніше.";
  return msg || "Сталася помилка. Спробуйте ще раз.";
}

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

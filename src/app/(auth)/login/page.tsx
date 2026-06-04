import { Suspense } from "react";
import { Wallet } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <>
      <div className="mb-8 text-center lg:hidden">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
          <Wallet className="h-6 w-6" />
        </div>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">З поверненням 👋</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Увійдіть, щоб продовжити керувати фінансами.
        </p>
      </div>
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}

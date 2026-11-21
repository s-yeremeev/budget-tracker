import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

// OAuth / magic-link колбек: обмінює code на сесію.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Лише внутрішній шлях — інакше «?redirect=@evil.com» відправляв би на чужий сайт.
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

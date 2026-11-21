import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { verifiedUserId } from "./claims";

/** Маршрути, доступні без авторизації. */
const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/_next", "/favicon.ico"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Оновлює Supabase-сесію на кожному запиті та редіректить
 * неавторизованих користувачів на /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // ВАЖЛИВО: одразу після створення клієнта. Перевіряє JWT локально (getClaims) і за
  // потреби оновлює токен (нові cookies — через setAll вище). Без запиту до Supabase Auth
  // на кожному переході; фолбек на getUser — див. verifiedUserId.
  const userId = await verifiedUserId(supabase.auth);

  const { pathname } = request.nextUrl;

  // Неавторизований на захищеному маршруті → /login
  if (!userId && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Авторизований на сторінці входу → /dashboard
  if (userId && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

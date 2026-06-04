import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: колишній `middleware` тепер називається `proxy`.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Усі маршрути, окрім статики, зображень та PWA-файлів:
     * - _next/static, _next/image
     * - favicon.ico, manifest.webmanifest, sw.js
     * - файли з розширеннями (svg/png/...)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

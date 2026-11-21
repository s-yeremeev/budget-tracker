"use client";

import { useEffect } from "react";

/** Реєструє service worker (лише в продакшні, щоб не заважати dev-розробці). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    // Ефект може спрацювати вже після події load — тоді чекати її марно, реєструємо одразу.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}

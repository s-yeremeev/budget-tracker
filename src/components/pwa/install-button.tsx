"use client";

import { useEffect, useState } from "react";
import { Download, Share, CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone) setInstalled(true);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !nav.standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-success">
        <CircleCheckBig className="h-4 w-4" /> Застосунок встановлено
      </p>
    );
  }

  if (deferred) {
    return (
      <Button
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        <Download className="h-4 w-4" /> Встановити на пристрій
      </Button>
    );
  }

  if (isIOS) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Share className="h-4 w-4 shrink-0" />
        На iPhone: «Поділитися» → «На екран Домівка».
      </p>
    );
  }

  return (
    <p className="text-sm text-fg-muted">
      Відкрийте сайт у Chrome/Edge (на телефоні чи компʼютері) і оберіть
      «Встановити застосунок» у меню браузера.
    </p>
  );
}

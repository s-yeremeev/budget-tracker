"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto",
          "rounded-t-2xl sm:rounded-2xl border border-border bg-bg-elevated shadow-lg",
          "animate-slide-up",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            {title && <h2 className="text-lg font-semibold text-fg">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg transition-colors"
            aria-label="Закрити"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

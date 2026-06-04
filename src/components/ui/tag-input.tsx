"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({ value, onChange, suggestions = [], placeholder }: Props) {
  const [input, setInput] = useState("");

  function add(raw: string) {
    const t = raw.trim().replace(/^#/, "");
    if (!t) return;
    if (!value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      onChange([...value, t]);
    }
    setInput("");
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && !input && value.length) {
      remove(value[value.length - 1]);
    }
  }

  const freeSuggestions = suggestions
    .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    .filter((s) => !input || s.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 6);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-bg-elevated p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-[var(--ring)]">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2 py-1 text-xs font-medium text-primary"
          >
            #{tag}
            <button type="button" onClick={() => remove(tag)} className="hover:opacity-70" aria-label={`Прибрати ${tag}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(input)}
          placeholder={value.length ? "" : placeholder ?? "Додати тег і Enter"}
          className="min-w-24 flex-1 bg-transparent px-1 text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
      </div>
      {freeSuggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {freeSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-lg border border-border px-2 py-0.5 text-xs text-fg-muted transition-colors hover:border-primary hover:text-primary"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

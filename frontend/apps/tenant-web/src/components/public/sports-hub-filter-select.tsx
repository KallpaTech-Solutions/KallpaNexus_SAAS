"use client";

import { cn } from "@/lib/cn";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
};

type MenuPos = { top: number; left: number; width: number };

function measureMenuPosition(trigger: HTMLButtonElement): MenuPos {
  const rect = trigger.getBoundingClientRect();
  return {
    top: rect.bottom + 6,
    left: rect.left,
    width: rect.width,
  };
}

export function SportsHubFilterSelect({ label, value, onChange, options, className }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPos(null);
      return;
    }
    const sync = () => {
      if (triggerRef.current) setMenuPos(measureMenuPosition(triggerRef.current));
    };
    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && menuPos && mounted ? (
      <ul
        ref={menuRef}
        id={listId}
        role="listbox"
        aria-label={label}
        className="sports-hub-filter-menu"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          zIndex: 9999,
        }}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <li key={o.value || "__all"} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={cn("sports-hub-filter-option", active && "sports-hub-filter-option-active")}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span className="truncate">{o.label}</span>
                {active ? <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className={cn("sports-hub-filter block", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        className={cn("sports-hub-filter-trigger", open && "sports-hub-filter-trigger-open")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{selected?.label ?? label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

/** Etiqueta legible para ciudades que vienen en MAYÚSCULAS desde datos. */
export function formatCiudadLabel(ciudad: string): string {
  return ciudad
    .trim()
    .split(/(\s|-)/)
    .map((part) => {
      if (part === " " || part === "-") return part;
      if (!part) return part;
      return part.charAt(0).toLocaleUpperCase("es-PE") + part.slice(1).toLocaleLowerCase("es-PE");
    })
    .join("");
}

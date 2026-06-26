"use client";

import { platformUi } from "@/lib/platform-ui";
import { cn } from "@/lib/cn";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PlatformToastTipo = "exito" | "error" | "info";

type ToastItem = {
  id: number;
  mensaje: string;
  tipo: PlatformToastTipo;
};

type ToastContextValue = {
  notificar: (mensaje: string, tipo?: PlatformToastTipo) => void;
};

const PlatformToastContext = createContext<ToastContextValue | null>(null);

const estilos: Record<
  PlatformToastTipo,
  { box: string; icon: typeof CheckCircle2; iconClass: string }
> = {
  exito: {
    box: platformUi.alertOk,
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  error: {
    box: platformUi.alertDanger,
    icon: XCircle,
    iconClass: "text-red-600",
  },
  info: {
    box: "rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-4 py-3 text-sm text-[var(--p-text)] shadow-lg",
    icon: Info,
    iconClass: "text-[var(--p-accent)]",
  },
};

function PlatformToastStack({
  toasts,
  onCerrar,
}: {
  toasts: ToastItem[];
  onCerrar: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const s = estilos[t.tipo];
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 border shadow-lg shadow-black/10",
              s.box
            )}
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.iconClass)} aria-hidden />
            <p className="flex-1 text-sm font-medium leading-snug">{t.mensaje}</p>
            <button
              type="button"
              className="shrink-0 rounded-md p-0.5 opacity-70 transition hover:opacity-100"
              aria-label="Cerrar notificación"
              onClick={() => onCerrar(t.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function PlatformToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const cerrar = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notificar = useCallback((mensaje: string, tipo: PlatformToastTipo = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);
    const ms = tipo === "error" ? 7000 : 4500;
    window.setTimeout(() => cerrar(id), ms);
  }, [cerrar]);

  const value = useMemo(() => ({ notificar }), [notificar]);

  return (
    <PlatformToastContext.Provider value={value}>
      {children}
      <PlatformToastStack toasts={toasts} onCerrar={cerrar} />
    </PlatformToastContext.Provider>
  );
}

export function usePlatformToast() {
  const ctx = useContext(PlatformToastContext);
  if (!ctx) {
    throw new Error("usePlatformToast debe usarse dentro de PlatformToastProvider");
  }
  return ctx;
}

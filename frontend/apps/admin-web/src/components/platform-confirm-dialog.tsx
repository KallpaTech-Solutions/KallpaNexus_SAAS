"use client";

import { platformUi } from "@/lib/platform-ui";
import { cn } from "@/lib/cn";
import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  busy?: boolean;
  /** Si se indica, el usuario debe escribir este texto exacto para habilitar confirmar. */
  requireTextMatch?: string;
  requireTextLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PlatformConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  busy = false,
  requireTextMatch,
  requireTextLabel,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const [textoConfirmacion, setTextoConfirmacion] = useState("");

  useEffect(() => {
    if (!open) setTextoConfirmacion("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const Icon = variant === "danger" ? AlertTriangle : HelpCircle;
  const requiereTexto = Boolean(requireTextMatch?.trim());
  const textoOk =
    !requiereTexto || textoConfirmacion.trim() === (requireTextMatch ?? "").trim();

  return (
    <div
      className={platformUi.modalOverlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className={cn(platformUi.modal, "max-w-md platform-modal-legacy-padding")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              variant === "danger"
                ? "bg-red-500/15 text-red-600"
                : "bg-[var(--p-nav-active-bg)] text-[var(--p-accent)]"
            )}
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-[var(--p-text)]">
              {title}
            </h2>
            <p className={`mt-2 text-sm leading-relaxed ${platformUi.textBody}`}>{message}</p>
          </div>
        </div>
        {requiereTexto && (
          <label className="mt-4 block text-sm">
            <span className={platformUi.formLabel}>
              {requireTextLabel ?? `Escribe «${requireTextMatch}» para confirmar`}
            </span>
            <input
              className={`${platformUi.input} mt-1`}
              value={textoConfirmacion}
              disabled={busy}
              autoComplete="off"
              onChange={(e) => setTextoConfirmacion(e.target.value)}
            />
          </label>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={platformUi.btnSecondary}
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy || !textoOk}
            onClick={onConfirm}
            className={
              variant === "danger"
                ? "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                : platformUi.btnPrimary
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

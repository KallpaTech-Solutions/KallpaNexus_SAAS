"use client";

import { PlatformConfirmDialog } from "@/components/platform-confirm-dialog";
import { usePlatformToast } from "@/components/platform-toast";
import { platformUi } from "@/lib/platform-ui";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type ActionDef = {
  id: string;
  label: string;
  variant?: "danger" | "default";
  confirm?: string;
  confirmTitle?: string;
  successMessage?: string;
  onClick: () => Promise<void>;
};

export function PlatformEntityActions({ actions }: { actions: ActionDef[] }) {
  const { notificar } = usePlatformToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<ActionDef | null>(null);

  if (actions.length === 0) return null;

  async function ejecutar(a: ActionDef) {
    setBusy(a.id);
    try {
      await a.onClick();
      if (a.successMessage) {
        notificar(a.successMessage, "exito");
      }
    } catch (err) {
      notificar(getApiErrorMessage(err) || "No se pudo completar la acción.", "error");
    } finally {
      setBusy(null);
      setPending(null);
    }
  }

  function solicitar(a: ActionDef) {
    if (a.confirm) {
      setPending(a);
      return;
    }
    void ejecutar(a);
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap justify-end gap-1">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy !== null}
              onClick={() => solicitar(a)}
              className={
                a.variant === "danger"
                  ? "rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-950/40"
                  : `${platformUi.btnSecondary} !px-2 !py-1 text-xs`
              }
            >
              {busy === a.id ? (
                <Loader2 className="inline h-3 w-3 animate-spin" aria-hidden />
              ) : (
                a.label
              )}
            </button>
          ))}
        </div>
      </div>

      <PlatformConfirmDialog
        open={pending !== null}
        title={pending?.confirmTitle ?? "¿Confirmar acción?"}
        message={pending?.confirm ?? ""}
        variant={pending?.variant === "danger" ? "danger" : "default"}
        confirmLabel={pending?.variant === "danger" ? "Sí, continuar" : "Confirmar"}
        busy={busy !== null}
        onCancel={() => {
          if (busy) return;
          setPending(null);
        }}
        onConfirm={() => {
          if (pending) void ejecutar(pending);
        }}
      />
    </>
  );
}

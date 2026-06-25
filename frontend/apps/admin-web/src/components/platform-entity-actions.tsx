"use client";

import { platformUi } from "@/lib/platform-ui";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type ActionDef = {
  id: string;
  label: string;
  variant?: "danger" | "default";
  confirm?: string;
  onClick: () => Promise<void>;
};

export function PlatformEntityActions({ actions }: { actions: ActionDef[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (actions.length === 0) return null;

  async function run(a: ActionDef) {
    if (a.confirm && !window.confirm(a.confirm)) return;
    setError("");
    setBusy(a.id);
    try {
      await a.onClick();
    } catch (err) {
      setError(getApiErrorMessage(err) || "No se pudo completar la acción.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={busy !== null}
            onClick={() => void run(a)}
            className={
              a.variant === "danger"
                ? "rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
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
      {error ? <p className="max-w-xs text-right text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

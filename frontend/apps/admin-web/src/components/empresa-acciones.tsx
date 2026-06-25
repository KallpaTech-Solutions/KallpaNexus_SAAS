"use client";

import { PlatformEntityActions } from "@/components/platform-entity-actions";
import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformPermisos } from "@/lib/platform-auth-store";
import { hasPlatformPermission } from "@kallpanexus/shared";

export function EmpresaAcciones({
  id,
  estado,
  onChanged,
}: {
  id: string;
  estado: string;
  onChanged: () => void;
}) {
  const api = usePlatformApi();
  const permisos = usePlatformPermisos();
  const puede = hasPlatformPermission(permisos, "platform:empresas:modificar");

  if (!puede || !id) return null;

  const e = estado.trim().toLowerCase();
  const actions = [];

  if (e !== "suspendido" && e !== "cancelado") {
    actions.push({
      id: "suspend",
      label: "Suspender",
      confirm:
        "La empresa no podrá operar (estado Suspendido) y se desactivarán sus tenants. ¿Continuar?",
      onClick: async () => {
        await api.empresas.actualizar(id, { estado: "Suspendido" });
        onChanged();
      },
    });
  }

  if (e === "suspendido" || e === "cancelado") {
    actions.push({
      id: "reactivar",
      label: "Reactivar",
      confirm: "Volver a estado Activo y reencender los tenants de esta empresa.",
      onClick: async () => {
        await api.empresas.actualizar(id, { estado: "Activo" });
        onChanged();
      },
    });
  }

  if (e !== "cancelado") {
    actions.push({
      id: "cancelar",
      label: "Cancelar empresa",
      variant: "danger" as const,
      confirm:
        "Cancelación definitiva: estado Cancelado y tenants apagados. No borra datos históricos. ¿Continuar?",
      onClick: async () => {
        await api.empresas.cancelar(id);
        onChanged();
      },
    });
  }

  return <PlatformEntityActions actions={actions} />;
}

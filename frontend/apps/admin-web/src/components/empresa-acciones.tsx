"use client";

import { EmpresaEliminarDialog } from "@/components/empresa-eliminar-dialog";
import { PlatformEntityActions } from "@/components/platform-entity-actions";
import { usePlatformToast } from "@/components/platform-toast";
import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformPermisos } from "@/lib/platform-auth-store";
import type { PlatformEmpresaResumenEliminacion } from "@kallpanexus/api-client";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { hasPlatformPermission } from "@kallpanexus/shared";
import { useCallback, useState } from "react";

export function EmpresaAcciones({
  id,
  estado,
  nombreComercial,
  onChanged,
}: {
  id: string;
  estado: string;
  nombreComercial?: string;
  onChanged: () => void;
}) {
  const api = usePlatformApi();
  const permisos = usePlatformPermisos();
  const { notificar } = usePlatformToast();
  const puede = hasPlatformPermission(permisos, "platform:empresas:modificar");
  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [eliminarBusy, setEliminarBusy] = useState(false);
  const [resumen, setResumen] = useState<PlatformEmpresaResumenEliminacion | null>(null);
  const [resumenLoading, setResumenLoading] = useState(false);
  const [resumenError, setResumenError] = useState<string | null>(null);

  const cargarResumen = useCallback(async () => {
    setResumenLoading(true);
    setResumenError(null);
    setResumen(null);
    try {
      const data = await api.empresas.resumenEliminacion(id);
      setResumen(data);
    } catch (err) {
      setResumenError(getApiErrorMessage(err) || "No se pudo cargar el resumen.");
    } finally {
      setResumenLoading(false);
    }
  }, [api.empresas, id]);

  if (!puede || !id) return null;

  const e = estado.trim().toLowerCase();
  const actions = [];
  const nombreConfirm = (nombreComercial ?? "").trim();

  if (e !== "suspendido" && e !== "cancelado") {
    actions.push({
      id: "suspend",
      label: "Suspender",
      confirmTitle: "Suspender empresa",
      confirm:
        "La empresa no podrá operar (estado Suspendido) y se desactivarán sus tenants. Los datos históricos se conservan.",
      successMessage: "Empresa suspendida.",
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
      confirmTitle: "Reactivar empresa",
      confirm: "Volverá a estado Activo y se reactivarán los tenants de esta empresa.",
      successMessage: "Empresa reactivada.",
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
      confirmTitle: "Cancelar empresa",
      confirm:
        "La empresa pasará a estado Cancelado y sus tenants se apagarán. No se borran datos históricos; podrás reactivarla más adelante si lo necesitas.",
      successMessage: "Empresa cancelada.",
      onClick: async () => {
        await api.empresas.cancelar(id);
        onChanged();
      },
    });
  }

  actions.push({
    id: "eliminar-empresa",
    label: "Eliminar empresa",
    variant: "danger" as const,
    onClick: async () => {
      setEliminarOpen(true);
      await cargarResumen();
    },
  });

  async function ejecutarEliminarDefinitivo() {
    if (!nombreConfirm) {
      notificar("Falta el nombre comercial para confirmar la eliminación.", "error");
      return;
    }
    setEliminarBusy(true);
    try {
      await api.empresas.eliminarDefinitivo(id, nombreConfirm, true);
      notificar("Empresa y datos operativos eliminados.", "exito");
      setEliminarOpen(false);
      onChanged();
    } catch (err) {
      notificar(getApiErrorMessage(err) || "No se pudo eliminar la empresa.", "error");
    } finally {
      setEliminarBusy(false);
    }
  }

  return (
    <>
      <PlatformEntityActions actions={actions} />
      <EmpresaEliminarDialog
        open={eliminarOpen}
        busy={eliminarBusy}
        nombreComercialConfirm={nombreConfirm}
        resumen={resumen}
        resumenLoading={resumenLoading}
        resumenError={resumenError}
        onCancel={() => {
          if (!eliminarBusy) setEliminarOpen(false);
        }}
        onConfirm={() => void ejecutarEliminarDefinitivo()}
      />
    </>
  );
}

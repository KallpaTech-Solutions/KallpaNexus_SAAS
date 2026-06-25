"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ConfirmacionModal,
  type ConfirmacionVariante,
} from "@/components/confirmacion-modal";
import {
  NotificacionToastStack,
  type NotificacionItem,
  type NotificacionTipo,
} from "@/components/notificacion-toast";
import {
  getApiErrorMessage,
  getCuentaDesactivadaMessage,
  isApiUnreachableError,
  isCuentaDesactivadaError,
} from "@kallpanexus/api-client";

export type ConfirmarOpciones = {
  titulo?: string;
  mensaje: string;
  confirmarTexto?: string;
  cancelarTexto?: string;
  variante?: ConfirmacionVariante;
};

type UiFeedbackContextValue = {
  confirmar: (opciones: ConfirmarOpciones) => Promise<boolean>;
  notificar: (mensaje: string, tipo?: NotificacionTipo) => void;
  notificarConexion: () => void;
  notificarErrorApi: (err: unknown) => void;
};

const UiFeedbackContext = createContext<UiFeedbackContextValue | null>(null);

export function UiFeedbackProvider({ children }: { children: ReactNode }) {
  const [confirmOpts, setConfirmOpts] = useState<ConfirmarOpciones | null>(null);
  const [confirmAbierto, setConfirmAbierto] = useState(false);
  const [toasts, setToasts] = useState<NotificacionItem[]>([]);
  const resolveRef = useRef<((valor: boolean) => void) | null>(null);
  const idToast = useRef(0);

  const cerrarConfirm = useCallback((valor: boolean) => {
    resolveRef.current?.(valor);
    resolveRef.current = null;
    setConfirmAbierto(false);
    setConfirmOpts(null);
  }, []);

  const confirmar = useCallback((opciones: ConfirmarOpciones) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setConfirmOpts(opciones);
      setConfirmAbierto(true);
    });
  }, []);

  const pushToast = useCallback((item: Omit<NotificacionItem, "id">, duracionMs: number) => {
    const id = ++idToast.current;
    setToasts((prev) => [...prev, { id, ...item }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duracionMs);
  }, []);

  const notificar = useCallback(
    (mensaje: string, tipo: NotificacionTipo = "info") => {
      pushToast({ mensaje, tipo }, tipo === "conexion" ? 8000 : 4500);
    },
    [pushToast]
  );

  const notificarConexion = useCallback(() => {
    pushToast({ mensaje: "", tipo: "conexion" }, 8000);
  }, [pushToast]);

  const notificarErrorApi = useCallback(
    (err: unknown) => {
      if (isCuentaDesactivadaError(err)) {
        pushToast(
          { mensaje: getCuentaDesactivadaMessage(err), tipo: "cuenta" },
          10_000
        );
        return;
      }
      if (isApiUnreachableError(err)) {
        notificarConexion();
        return;
      }
      const msg = getApiErrorMessage(err);
      notificar(msg || "No se pudo completar la operación.", "error");
    },
    [notificar, notificarConexion, pushToast]
  );

  const cerrarToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <UiFeedbackContext.Provider
      value={{ confirmar, notificar, notificarConexion, notificarErrorApi }}
    >
      {children}
      <ConfirmacionModal
        abierto={confirmAbierto && !!confirmOpts}
        titulo={confirmOpts?.titulo}
        mensaje={confirmOpts?.mensaje ?? ""}
        confirmarTexto={confirmOpts?.confirmarTexto}
        cancelarTexto={confirmOpts?.cancelarTexto}
        variante={confirmOpts?.variante}
        onConfirmar={() => cerrarConfirm(true)}
        onCancelar={() => cerrarConfirm(false)}
      />
      <NotificacionToastStack toasts={toasts} onCerrar={cerrarToast} />
    </UiFeedbackContext.Provider>
  );
}

export function useUiFeedback(): UiFeedbackContextValue {
  const ctx = useContext(UiFeedbackContext);
  if (!ctx) {
    throw new Error("useUiFeedback debe usarse dentro de UiFeedbackProvider");
  }
  return ctx;
}

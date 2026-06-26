"use client";

import type { NotificacionItem } from "@/components/notificacion-toast";
import { useCallback, useRef, useState } from "react";

export function useRegistroToast() {
  const [toasts, setToasts] = useState<NotificacionItem[]>([]);
  const idRef = useRef(0);

  const cerrar = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notificar = useCallback((mensaje: string, tipo: NotificacionItem["tipo"] = "error") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, tipo === "error" ? 7000 : 4500);
  }, []);

  return { toasts, cerrar, notificar };
}

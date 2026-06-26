"use client";

import { useEffect, useRef, useState } from "react";

/** Revela contenido al entrar en viewport (solo en cliente; SSR y primer paint coinciden en oculto). */
export function useInViewReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/** Activa animaciones de entrada tras montar (evita mismatch: inicia en false en servidor y cliente). */
export function useMountReveal() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return ready;
}

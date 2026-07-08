"use client";

import { useEffect, useRef } from "react";

type Props = {
  className?: string;
};

/** Líneas verticales tipo glitch (inspiración Optimus) — decoración hero. */
export function PublicLandingGlitchAccent({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let t = 0;
    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      t += reduce ? 0 : 0.012;

      const cols = Math.floor(w / 28);
      for (let i = 0; i < cols; i++) {
        const x = i * 28 + 14;
        const phase = i * 0.7;
        const len = 40 + Math.sin(t + phase) * 30 + Math.sin(t * 2.1 + i) * 20;
        const y0 = (h * 0.15 + ((t * 40 + i * 17) % (h * 0.7))) | 0;
        const alpha = 0.04 + 0.06 * ((Math.sin(t * 1.3 + phase) + 1) / 2);

        ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y0 + len);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha * 1.2})`;
        ctx.fillRect(x - 0.5, y0 + len * 0.5, 1.5, 1.5);
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      aria-hidden
    />
  );
}

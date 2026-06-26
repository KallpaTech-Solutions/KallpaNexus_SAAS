"use client";

import { readPlatformTheme, type PlatformTheme } from "@/lib/platform-theme";
import { useEffect, useRef, useState } from "react";

/** Partículas suaves (inspirado en futuristic-dashboard), solo en el área principal. */
export function PlatformConsoleBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<PlatformTheme>("light");

  useEffect(() => {
    setTheme(readPlatformTheme());
    const obs = new MutationObserver(() => {
      setTheme(readPlatformTheme());
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-platform-theme"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dark = theme === "dark";

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resize();

    type Dot = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const count = dark ? 72 : 64;
    const dots: Dot[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * (dark ? 0.35 : 0.25),
      vy: (Math.random() - 0.5) * (dark ? 0.35 : 0.25),
      r: Math.random() * 2 + 0.6,
      a: Math.random() * 0.35 + 0.15,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `rgba(56, 189, 248, ${d.a})`
          : `rgba(37, 99, 235, ${d.a * 0.55})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <div className="platform-console-backdrop" aria-hidden>
      <div className="platform-console-orb platform-console-orb-a" />
      <div className="platform-console-orb platform-console-orb-b" />
      <canvas ref={canvasRef} className="platform-console-canvas" />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

type Props = {
  className?: string;
};

type ParticleKind = "dot" | "plus" | "square";

type Particle = {
  nx: number;
  ny: number;
  nz: number;
  kind: ParticleKind;
  phase: number;
};

function fibonacciSphere(count: number, R: number): Particle[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const out: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    const roll = (i * 17 + Math.floor(i / 7) * 3) % 10;
    let kind: ParticleKind = "dot";
    if (roll < 4) kind = "plus";
    else if (roll < 7) kind = "square";

    out.push({
      nx: x * R,
      ny: y * R,
      nz: z * R,
      kind,
      phase: (i * 0.31) % (Math.PI * 2),
    });
  }

  return out;
}

/** Esfera de partículas (+, cuadrados, puntos) — estilo Optimus, sin líneas continuas. */
export function PublicLandingWaveSphere({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rotY = 0.55;
    const rotX = 0.18;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    let particles: Particle[] = [];
    let sphereR = 200;

    const rebuildParticles = (w: number, h: number) => {
      sphereR = Math.min(w, h) * 0.5;
      const count = w < 480 ? 580 : w < 900 ? 820 : 1000;
      particles = fibonacciSphere(count, sphereR);
    };

    rebuildParticles(canvas.clientWidth, canvas.clientHeight);
    const ro = new ResizeObserver(() => {
      resize();
      rebuildParticles(canvas.clientWidth, canvas.clientHeight);
    });
    ro.observe(canvas);

    const rotateY = (x: number, y: number, z: number, ay: number) => {
      const c = Math.cos(ay);
      const s = Math.sin(ay);
      return { x: x * c + z * s, y, z: -x * s + z * c };
    };

    const rotateX = (x: number, y: number, z: number, ax: number) => {
      const c = Math.cos(ax);
      const s = Math.sin(ax);
      return { x, y: y * c - z * s, z: y * s + z * c };
    };

    const project = (x: number, y: number, z: number, cx: number, cy: number) => {
      const f = 540;
      const scale = f / (f + z);
      return { px: cx + x * scale, py: cy + y * scale, scale, z };
    };

    const drawPlus = (px: number, py: number, size: number, alpha: number) => {
      ctx.strokeStyle = `rgba(29, 78, 216, ${alpha})`;
      ctx.lineWidth = Math.max(1.1, size * 0.28);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px - size, py);
      ctx.lineTo(px + size, py);
      ctx.moveTo(px, py - size);
      ctx.lineTo(px, py + size);
      ctx.stroke();
    };

    const drawSquare = (px: number, py: number, size: number, alpha: number) => {
      const s = size * 1.65;
      ctx.fillStyle = `rgba(29, 78, 216, ${alpha})`;
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    };

    const drawDot = (px: number, py: number, r: number, alpha: number) => {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.fill();
    };

    const draw = (time: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.52;
      const cy = h * 0.48;
      const R = sphereR;
      const t = time * 0.001;

      if (!reduceMotion) {
        rotY += 0.0042;
      }

      type Drawn = {
        px: number;
        py: number;
        z: number;
        scale: number;
        kind: ParticleKind;
        phase: number;
        pulse: number;
      };
      const projected: Drawn[] = [];

      for (const p of particles) {
        const wobble =
          1 + 0.012 * Math.sin(p.phase + t * 2.2) * Math.sin(rotY * 2 + p.phase);
        const x0 = p.nx * wobble;
        const y0 = p.ny * wobble;
        const z0 = p.nz * wobble;

        let r = rotateY(x0, y0, z0, rotY);
        r = rotateX(r.x, r.y, r.z, rotX);
        const { px, py, scale, z } = project(r.x, r.y, r.z, cx, cy);

        projected.push({
          px,
          py,
          z,
          scale,
          kind: p.kind,
          phase: p.phase,
          pulse: Math.sin(rotY * 3 + p.phase + t * 1.5),
        });
      }

      projected.sort((a, b) => a.z - b.z);

      const rim = ctx.createRadialGradient(cx, cy, R * 0.12, cx, cy, R * 1.12);
      rim.addColorStop(0, "rgba(191, 219, 254, 0.28)");
      rim.addColorStop(0.5, "rgba(59, 130, 246, 0.14)");
      rim.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();

      for (const p of projected) {
        const depth = (p.z + R) / (R * 2);
        if (depth < 0.22) continue;

        const flicker = 0.88 + 0.12 * p.pulse;
        const alpha = (0.1 + depth * 0.72) * flicker;

        const base = (1.6 + depth * 3.2) * p.scale;

        if (p.kind === "plus") {
          if (depth < 0.26) continue;
          const plusAlpha = Math.min(1, alpha * 1.35);
          drawPlus(p.px, p.py, base * 1.55, plusAlpha);
        } else if (p.kind === "square") {
          if (depth < 0.3) continue;
          const sqAlpha = Math.min(1, alpha * 1.25);
          drawSquare(p.px, p.py, base * 0.85, sqAlpha);
        } else {
          drawDot(p.px, p.py, Math.max(0.5, base * 0.38), alpha * 0.75);
        }
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
    <div
      className={`relative h-full w-full ${className ?? ""}`}
      aria-hidden
    >
      <div className="absolute inset-[2%] rounded-full bg-blue-500/20 blur-3xl kallpa-landing-sphere-glow" />
      <canvas ref={canvasRef} className="relative h-full w-full" />
    </div>
  );
}

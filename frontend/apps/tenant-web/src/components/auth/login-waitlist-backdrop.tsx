"use client";

/** Fondo tipo clerk-waitlist-starter (rejilla suave, sin Three.js). */
export function LoginWaitlistBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="login-waitlist-grid absolute inset-0 opacity-70" />
      <div className="absolute -left-1/4 top-0 h-[480px] w-[480px] rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute -right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-sky-300/25 blur-3xl" />
    </div>
  );
}

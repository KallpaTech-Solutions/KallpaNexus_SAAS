"use client";

import { cn } from "@/lib/cn";
import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";

/** Mismas marcas que clerk-waitlist-starter (placeholder hasta aliados Kallpa). */
const PARTNER_LOGOS = [
  { alt: "Leap", href: "https://leap.new", src: "/partners/leap-logo.png", height: 20 },
  { alt: "Orchids", href: "https://orchids.app", src: "/partners/orchids.png", height: 40 },
  { alt: "v0", href: "https://v0.app", src: "/partners/v0-logo.png", height: 24 },
  { alt: "Replit", href: "https://replit.com", src: "/partners/replit-logo.png", height: 28 },
  { alt: "Bolt", href: "https://bolt.new", src: "/partners/bolt-logo.png", height: 28 },
  { alt: "Stripe", href: "https://stripe.com", src: "/partners/stripe-logo.png", height: 28 },
  { alt: "Lovable", href: "https://lovable.dev", src: "/partners/lovable-logo.png", height: 24 },
] as const;

function Marquee({
  className,
  pauseOnHover = false,
  repeat = 2,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  pauseOnHover?: boolean;
  repeat?: number;
}) {
  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--duration:32s] [--gap:3rem] [gap:var(--gap)]",
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "login-marquee-track flex shrink-0 [gap:var(--gap)]",
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

export function LoginPartnerMarquee() {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-24" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-24" />
      <Marquee pauseOnHover repeat={2}>
        {PARTNER_LOGOS.map((logo) => (
          <a
            key={logo.alt}
            href={logo.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center opacity-60 transition-opacity hover:opacity-100"
            title={logo.alt}
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={120}
              height={logo.height}
              className="h-auto w-auto max-h-8 object-contain sm:max-h-10"
              style={{ height: logo.height, width: "auto" }}
            />
          </a>
        ))}
      </Marquee>
    </div>
  );
}

"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { useInViewReveal } from "./use-in-view-reveal";

type Props = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  as?: "div" | "section";
};

export function PublicLandingReveal({
  children,
  className,
  delayMs = 0,
  as: Tag = "div",
}: Props) {
  const { ref, visible } = useInViewReveal();

  return (
    <Tag
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className
      )}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </Tag>
  );
}

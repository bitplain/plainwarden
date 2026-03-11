"use client";

import { memo } from "react";

interface GlowingEffectProps {
  active?: boolean;
  className?: string;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const GlowingEffect = memo(function GlowingEffect({
  active = false,
  className,
}: GlowingEffectProps) {
  return (
    <div
      aria-hidden="true"
      data-cal2-glow-active={active ? "true" : "false"}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] opacity-70 transition duration-300 ease-out",
        active ? "opacity-100" : "group-hover/calcell:opacity-100",
        className,
      )}
    >
      <div
        className={cn(
          "absolute -inset-[1px] rounded-[inherit] transition duration-300 ease-out",
          active ? "opacity-100" : "opacity-55 group-hover/calcell:opacity-90",
        )}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, var(--cal2-glow-line-strong) 22%, var(--cal2-glow-line) 58%, rgba(255,255,255,0.16) 100%)",
          boxShadow:
            "0 0 0 1px var(--cal2-glow-line), 0 18px 40px -26px var(--cal2-glow-ambient-strong)",
        }}
      />

      <div
        className={cn(
          "absolute -inset-2 rounded-[inherit] blur-xl transition duration-300 ease-out",
          active ? "opacity-95" : "opacity-0 group-hover/calcell:opacity-75",
        )}
        style={{
          background:
            "radial-gradient(circle at top, var(--cal2-glow-ambient-strong) 0%, var(--cal2-glow-ambient) 28%, rgba(94,106,210,0) 72%)",
        }}
      />

      <div
        className={cn(
          "absolute inset-0 rounded-[inherit] transition duration-300 ease-out",
          active ? "opacity-100" : "opacity-40 group-hover/calcell:opacity-80",
        )}
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      />
    </div>
  );
});

export { GlowingEffect };

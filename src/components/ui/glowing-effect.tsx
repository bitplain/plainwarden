"use client";

import { animate } from "motion/react";
import { memo, useCallback, useEffect, useRef, type CSSProperties } from "react";

interface GlowingEffectProps {
  active?: boolean;
  className?: string;
  movementDuration?: number;
  borderWidth?: number;
  spread?: number;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const GlowingEffect = memo(function GlowingEffect({
  active = false,
  className,
  movementDuration = 0.35,
  borderWidth = 1,
  spread = 34,
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);
  const frameRef = useRef<number>(0);

  const syncGlowVisibility = useCallback(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    element.style.setProperty("--active", hoveredRef.current || active ? "1" : "0");
  }, [active]);

  const updatePointerAngle = useCallback((clientX: number, clientY: number) => {
    const element = containerRef.current;
    const host = element?.parentElement;
    if (!element || !host) {
      return;
    }

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      const rect = host.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const currentAngle = Number.parseFloat(
        element.style.getPropertyValue("--start") || "0",
      );
      const targetAngle =
        (180 * Math.atan2(clientY - centerY, clientX - centerX)) / Math.PI + 90;
      const angleDelta = ((targetAngle - currentAngle + 180) % 360) - 180;
      const nextAngle = currentAngle + angleDelta;

      animationRef.current?.stop();
      animationRef.current = animate(currentAngle, nextAngle, {
        duration: movementDuration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (value) => {
          element.style.setProperty("--start", String(value));
        },
      });
    });
  }, [movementDuration]);

  useEffect(() => {
    syncGlowVisibility();
  }, [syncGlowVisibility]);

  useEffect(() => {
    const element = containerRef.current;
    const host = element?.parentElement;
    if (!element || !host) {
      return;
    }

    const supportsPointerTracking =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!supportsPointerTracking) {
      return;
    }

    const handlePointerEnter = (event: PointerEvent) => {
      hoveredRef.current = true;
      syncGlowVisibility();
      updatePointerAngle(event.clientX, event.clientY);
    };

    const handlePointerMove = (event: PointerEvent) => {
      hoveredRef.current = true;
      syncGlowVisibility();
      updatePointerAngle(event.clientX, event.clientY);
    };

    const handlePointerLeave = () => {
      hoveredRef.current = false;
      syncGlowVisibility();
    };

    host.addEventListener("pointerenter", handlePointerEnter);
    host.addEventListener("pointermove", handlePointerMove);
    host.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      animationRef.current?.stop();
      host.removeEventListener("pointerenter", handlePointerEnter);
      host.removeEventListener("pointermove", handlePointerMove);
      host.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [syncGlowVisibility, updatePointerAngle]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-cal2-glow-mode="pointer"
      data-cal2-glow-active={active ? "true" : "false"}
      style={
        {
          "--start": "0",
          "--active": active ? "1" : "0",
          "--spread": spread,
          "--glow-border-width": `${borderWidth}px`,
          "--glow-gradient":
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 28%), linear-gradient(135deg, rgba(255,255,255,0.24) 0%, var(--cal2-glow-line-strong) 26%, var(--cal2-glow-line) 62%, rgba(255,255,255,0.2) 100%)",
        } as CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute -inset-[1px] rounded-[inherit] transition duration-300 ease-out",
          active ? "opacity-100" : "opacity-55",
        )}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.02) 34%, rgba(255,255,255,0.08) 100%)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      />

      <div
        className={cn(
          "absolute -inset-2 rounded-[inherit] blur-xl transition duration-300 ease-out",
          active ? "opacity-90" : "opacity-0",
        )}
        style={{
          background:
            "radial-gradient(circle at top, var(--cal2-glow-ambient-strong) 0%, var(--cal2-glow-ambient) 30%, rgba(94,106,210,0) 72%)",
        }}
      />

      <div
        className={cn(
          "absolute inset-0 rounded-[inherit]",
          'after:content-[""] after:absolute after:inset-[calc(-1*var(--glow-border-width))] after:rounded-[inherit]',
          "after:[border:var(--glow-border-width)_solid_transparent]",
          "after:[background:var(--glow-gradient)] after:[background-attachment:fixed]",
          "after:opacity-[var(--active)] after:transition-opacity after:duration-200",
          "after:[mask-clip:padding-box,border-box]",
          "after:[mask-composite:intersect]",
          "after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]",
        )}
      />
    </div>
  );
});

export { GlowingEffect };

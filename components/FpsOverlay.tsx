"use client";

/**
 * 右上角实时帧率：直接写 DOM，避免每帧 setState 拖累场景。
 */
import { useEffect, useRef } from "react";

const SAMPLE_MS = 400;

export function FpsOverlay({ className = "pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-white/80 px-3 py-1.5 text-xs text-zinc-700 shadow ring-1 ring-black/5 backdrop-blur" }: { className?: string }) {
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      frames += 1;
      const elapsed = now - last;
      if (elapsed >= SAMPLE_MS) {
        const fps = Math.round((frames * 1000) / elapsed);
        const el = valueRef.current;
        if (el) el.textContent = String(fps);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={className}
      aria-live="off"
    >
      <span
        ref={valueRef}
        className="inline-block min-w-[1.6em] text-right font-medium tabular-nums"
      >
        —
      </span>
      <span className="ml-1 text-zinc-500">FPS</span>
    </div>
  );
}

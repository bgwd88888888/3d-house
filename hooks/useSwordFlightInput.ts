"use client";

import { useEffect, useRef } from "react";

const FLIGHT_CODES = new Set([
  "KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Space", "KeyC", "ShiftLeft", "ShiftRight", "KeyP", "Escape", "KeyR",
]);

export function useSwordFlightInput(onToggle: () => void, onPause: () => void, onReset: () => void) {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const pressed = keys.current;
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, button, a, [contenteditable=true]")) return;
      if (!FLIGHT_CODES.has(event.code) || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      pressed.add(event.code);
      if (event.repeat) return;
      if (event.code === "KeyP") onToggle();
      if (event.code === "Escape") onPause();
      if (event.code === "KeyR") onReset();
    };
    const keyup = (event: KeyboardEvent) => { pressed.delete(event.code); };
    const blur = () => { pressed.clear(); onPause(); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      pressed.clear();
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [onToggle, onPause, onReset]);

  return keys;
}

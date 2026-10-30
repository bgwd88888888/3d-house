"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { KUNGFU_ACTIONS, type KungfuAction, type KungfuMode, type KungfuMotion } from "@/lib/kungfuSpec";
import { INITIAL_KUNGFU_QUEUE, kungfuQueueReducer } from "@/lib/kungfuQueue";
import { useKungfuCharacter } from "@/hooks/useKungfuCharacter";
import { useKungfuImpactSound } from "@/hooks/useKungfuImpactSound";
import type { KungfuImpact } from "@/lib/kungfuSparring";
import { KUNGFU_STYLES } from "@/lib/kungfuStyles";

export function useKungfuControls() {
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<KungfuMode>("sparring");
  const [impact, setImpact] = useState<KungfuImpact | null>(null);
  const { enabled: soundEnabled, toggle: toggleSound, unlock, play: playImpactSound } = useKungfuImpactSound();
  const [{ command, pending }, dispatch] = useReducer(kungfuQueueReducer, INITIAL_KUNGFU_QUEUE);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const { ready, character, opponent, characterKey, selectCharacter, selectOpponent, reloadCharacter, onReady } = useKungfuCharacter(reset);
  const style = KUNGFU_STYLES[character.style];
  const opponentStyle = KUNGFU_STYLES[opponent.style];
  const selectMode = useCallback((next: KungfuMode) => {
    if (next === mode) return;
    reloadCharacter();
    setMode(next);
  }, [mode, reloadCharacter]);

  const play = useCallback((motion: KungfuMotion) => {
    if (!ready) return;
    if (mode === "sparring" && motion !== "idle") unlock();
    dispatch(motion === "idle" ? { type: "reset" } : { type: "enqueue", actions: [motion] });
  }, [ready, mode, unlock]);
  const playCombo = useCallback((actions: readonly KungfuAction[]) => {
    if (!ready) return;
    if (mode === "sparring") unlock();
    dispatch({ type: "enqueue", actions });
  }, [ready, mode, unlock]);
  const onComplete = useCallback((sequence: number) => dispatch({ type: "complete", sequence }), []);
  const onImpact = useCallback((event: KungfuImpact) => {
    setImpact(event);
    if (event.kind !== "miss") playImpactSound(event.kind);
  }, [playImpactSound]);
  const feedback = mode === "sparring" && impact?.sequence === command.sequence ? impact.kind : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
        (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)))
      ) return;
      const action = KUNGFU_ACTIONS.find((item) => item.key === event.key);
      if (action) {
        event.preventDefault();
        play(action.id);
      } else if (event.key === "Escape") {
        play("idle");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [play]);

  return { ready, character, opponent, style, opponentStyle, characterKey, selectCharacter, selectOpponent, mode, selectMode, speed, setSpeed, command, activeMotion: command.motion, pending, play, playCombo, onReady, onComplete, onImpact, feedback, soundEnabled, toggleSound };
}

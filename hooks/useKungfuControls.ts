"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { KUNGFU_ACTIONS, type KungfuAction, type KungfuMotion } from "@/lib/kungfuSpec";
import { INITIAL_KUNGFU_QUEUE, kungfuQueueReducer } from "@/lib/kungfuQueue";
import { useKungfuCharacter } from "@/hooks/useKungfuCharacter";

export function useKungfuControls() {
  const [speed, setSpeed] = useState(1);
  const [{ command, pending }, dispatch] = useReducer(kungfuQueueReducer, INITIAL_KUNGFU_QUEUE);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const { ready, character, characterKey, selectCharacter, onReady } = useKungfuCharacter(reset);

  const play = useCallback((motion: KungfuMotion) => {
    if (!ready) return;
    dispatch(motion === "idle" ? { type: "reset" } : { type: "enqueue", actions: [motion] });
  }, [ready]);
  const playCombo = useCallback((actions: readonly KungfuAction[]) => {
    if (!ready) return;
    dispatch({ type: "enqueue", actions });
  }, [ready]);
  const onComplete = useCallback((sequence: number) => dispatch({ type: "complete", sequence }), []);

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

  return { ready, character, characterKey, selectCharacter, speed, setSpeed, command, activeMotion: command.motion, pending, play, playCombo, onReady, onComplete };
}

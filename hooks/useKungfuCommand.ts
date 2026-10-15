"use client";

import { useEffect, useRef } from "react";
import type { KungfuFighterState } from "@/hooks/useKungfuFighter";
import type { KungfuCommand } from "@/lib/kungfuSpec";

/** 单人和陪练共用指令播放与完成通知，每个序号只消费一次。 */
export function useKungfuCommand(fighter: KungfuFighterState, command: KungfuCommand, onComplete: (sequence: number) => void) {
  const playback = useRef({ sequence: -1, completed: false });

  useEffect(() => {
    playback.current = { sequence: command.sequence, completed: false };
    fighter.play(command.motion, command.reset === true);
    fighter.update(0);
  }, [command, fighter]);

  return function finishCommand() {
    const current = playback.current;
    const action = fighter.activeRef.current;
    if (current.sequence !== command.sequence || current.completed || command.motion === "idle" || !action) return;
    if (action.time < action.getClip().duration) return;
    current.completed = true;
    onComplete(command.sequence);
  };
}

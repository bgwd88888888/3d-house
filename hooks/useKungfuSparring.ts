"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useKungfuFighter } from "@/hooks/useKungfuFighter";
import { useKungfuCommand } from "@/hooks/useKungfuCommand";
import type { KungfuSoloOptions } from "@/hooks/useKungfuSolo";
import { KUNGFU_MOTIONS_URL } from "@/lib/kungfuSpec";
import { getKungfuAdvance, getKungfuAttack, getKungfuContact, KUNGFU_SPARRING_DISTANCE, type KungfuImpact } from "@/lib/kungfuSparring";

export type KungfuSparringOptions = KungfuSoloOptions & {
  opponentUrl: string;
  onImpact: (impact: KungfuImpact) => void;
};

export function useKungfuSparring({ modelUrl, opponentUrl, command, speed, onReady, onComplete, onImpact }: KungfuSparringOptions) {
  const models = useGLTF([modelUrl, opponentUrl]);
  const json = useLoader(THREE.FileLoader, KUNGFU_MOTIONS_URL) as string;
  const player = useKungfuFighter(models[0].scene, json);
  const opponent = useKungfuFighter(models[1].scene, json);
  const finishCommand = useKungfuCommand(player, command, onComplete);
  const round = useRef({ sequence: -1, resolved: false, pause: 0 });
  const contact = useMemo(() => ({
    previous: new THREE.Vector3(),
    current: new THREE.Vector3(),
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    limbs: new Map(["LeftHand", "RightHand", "RightFoot"].map((name) => [name, player.character.getObjectByName(name)])),
    targets: {
      block: [["LeftForeArm", "LeftHand", 0.1], ["RightForeArm", "RightHand", 0.1], ["LeftArm", "LeftForeArm", 0.09], ["RightArm", "RightForeArm", 0.09]],
      hit: [["Spine", "Spine2", 0.2], ["Spine2", "Head", 0.16]],
    } as const,
    bones: new Map(["LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand", "Spine", "Spine2", "Head"].map((name) => [name, opponent.character.getObjectByName(name)])),
  }), [player.character, opponent.character]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useEffect(() => {
    round.current = { sequence: command.sequence, resolved: false, pause: 0 };
    const attack = getKungfuAttack(command.motion);
    const immediate = command.reset === true;
    opponent.play(attack?.kind === "block" || command.motion === "block" ? "guard" : "idle", immediate);
    player.setPosition(-KUNGFU_SPARRING_DISTANCE / 2);
    opponent.update(0);
  }, [command, player, opponent]);

  useFrame((_, delta) => {
    const current = round.current;
    if (current.sequence !== command.sequence) return;
    if (current.pause > 0) {
      current.pause = Math.max(0, current.pause - delta);
      return;
    }
    const elapsed = Math.min(delta, 0.05) * speed;
    const action = player.activeRef.current;
    if (!action) return;
    const duration = action.getClip().duration;
    const previousProgress = action.time / duration;
    const attack = getKungfuAttack(command.motion);
    const limb = attack ? contact.limbs.get(attack.bone) : undefined;
    limb?.getWorldPosition(contact.previous);
    const nextProgress = command.motion === "idle" ? 0 : Math.min((action.time + elapsed) / duration, 1);
    player.setPosition(-KUNGFU_SPARRING_DISTANCE / 2 + getKungfuAdvance(command.motion, nextProgress));
    player.update(elapsed);
    opponent.update(elapsed);
    const progress = action.time / duration;

    if (attack && limb && !current.resolved && progress >= attack.start && previousProgress <= attack.end) {
      limb.getWorldPosition(contact.current);
      for (const [startName, endName, radius] of contact.targets[attack.kind]) {
        const start = contact.bones.get(startName), end = contact.bones.get(endName);
        if (!start || !end) continue;
        start.getWorldPosition(contact.start);
        end.getWorldPosition(contact.end);
        if (!getKungfuContact(contact.previous, contact.current, contact.start, contact.end, radius + attack.radius)) continue;
        current.resolved = true;
        current.pause = attack.kind === "block" ? 0.045 : 0.075;
        opponent.play(attack.kind === "block" ? "deflect" : "recoil");
        onImpact({ sequence: command.sequence, kind: attack.kind });
        break;
      }
    }
    if (attack && !current.resolved && progress > attack.end) {
      current.resolved = true;
      onImpact({ sequence: command.sequence, kind: "miss" });
    }

    const reaction = opponent.activeRef.current;
    if (reaction && (reaction.getClip().name === "recoil" || reaction.getClip().name === "deflect") && reaction.time >= reaction.getClip().duration) {
      opponent.play(attack?.kind === "block" ? "guard" : "idle");
    }
    finishCommand();
  });

  return { player, opponent };
}

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { createFlightFairy, FAIRY_MODEL_URL, FAIRY_SCALE } from "@/lib/flightFairyRig";
import { advanceRiderMotion, createRiderMotion } from "@/lib/flightRiderPose";
import type { FlightState } from "@/lib/swordFlightTypes";

export function useFlightRiderMotion(flight: RefObject<FlightState>, running: RefObject<boolean>) {
  const { scene } = useGLTF(FAIRY_MODEL_URL);
  const fairy = useMemo(() => {
    const character = createFlightFairy(scene);
    character.apply(createRiderMotion("flying"));
    return character;
  }, [scene]);
  const sword = useRef<Group>(null);
  const stance = useRef<Group>(null);
  const motion = useRef(createRiderMotion("flying"));
  const previous = useRef<FlightState | null>(null);
  useFrame((_, delta) => {
    if (!running.current) return;
    const state = flight.current;
    let direction = motion.current.direction;
    if (previous.current && state.mode === "walking") {
      const dx = state.position[0] - previous.current.position[0];
      const dz = state.position[2] - previous.current.position[2];
      const forward = dx * Math.sin(state.yaw) - dz * Math.cos(state.yaw);
      if (Math.abs(forward) > 0.0001) direction = Math.sign(forward);
    }
    motion.current = advanceRiderMotion(motion.current, state, direction, delta);
    fairy.apply(motion.current);
    const blend = motion.current.flight;
    if (stance.current) stance.current.position.y = -0.16 + blend * 0.215;
    if (sword.current) {
      sword.current.scale.setScalar(blend);
      sword.current.visible = blend > 0.02;
    }
    previous.current = state;
  });
  useEffect(() => () => fairy.dispose(), [fairy]);
  return { sword, stance, model: fairy.model, scale: FAIRY_SCALE };
}

useGLTF.preload(FAIRY_MODEL_URL);

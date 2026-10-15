"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, PerspectiveCamera, Vector3 } from "three";
import { advanceFlight } from "@/lib/swordFlightSimulation";
import type { SwordFlightControls } from "./useSwordFlight";

export type FlightRuntime = Pick<SwordFlightControls, "flight" | "running" | "resetVersion" | "keys">;

export function useSwordFlightFrame(runtime: FlightRuntime, riderRef: RefObject<Group | null>, wakeRef: RefObject<Group | null>) {
  const { flight: flightRef, running, resetVersion, keys } = runtime;
  const initialized = useRef(false);
  const lastReset = useRef(-1);
  const vectors = useMemo(() => ({ camera: new Vector3(), target: new Vector3(), look: new Vector3() }), []);

  useFrame(({ camera }, delta) => {
    const previous = flightRef.current;
    const pressed = keys.current;
    const dt = Math.min(delta, 0.05);
    if (running.current) {
      flightRef.current = advanceFlight(previous, {
        turn: Number(pressed.has("KeyD") || pressed.has("ArrowRight")) - Number(pressed.has("KeyA") || pressed.has("ArrowLeft")),
        pitch: Number(pressed.has("KeyW") || pressed.has("ArrowUp")) - Number(pressed.has("KeyS") || pressed.has("ArrowDown")),
        lift: Number(pressed.has("Space")) - Number(pressed.has("KeyC")),
        boost: pressed.has("ShiftLeft") || pressed.has("ShiftRight"),
      }, dt);
    }
    const state = flightRef.current;
    const [x, y, z] = state.position;
    if (riderRef.current) {
      riderRef.current.position.set(x, y, z);
      riderRef.current.rotation.set(state.pitch, -state.yaw, state.bank, "YXZ");
    }
    if (wakeRef.current) wakeRef.current.scale.z = state.speed / 18;
    const forwardX = Math.sin(state.yaw);
    const forwardZ = -Math.cos(state.yaw);
    vectors.camera.set(x - forwardX * 11, y + 4.6, z - forwardZ * 11);
    vectors.target.set(x + forwardX * 13, y + 1.2 + Math.sin(state.pitch) * 10, z + forwardZ * 13);
    const teleported = Math.hypot(x - previous.position[0], z - previous.position[2]) > 8;
    if (!initialized.current || lastReset.current !== resetVersion.current || teleported) {
      camera.position.copy(vectors.camera);
      vectors.look.copy(vectors.target);
      initialized.current = true;
      lastReset.current = resetVersion.current;
    } else {
      camera.position.lerp(vectors.camera, 1 - Math.exp(-dt * 6));
      vectors.look.lerp(vectors.target, 1 - Math.exp(-dt * 8));
    }
    camera.lookAt(vectors.look);
    if (camera instanceof PerspectiveCamera) {
      const targetFov = 58 + (state.speed - 18) * 0.45;
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 4));
        camera.updateProjectionMatrix();
      }
    }
  });
}

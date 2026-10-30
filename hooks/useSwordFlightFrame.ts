"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Euler, Group, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { advanceFlight } from "@/lib/swordFlightSimulation";
import { FLIGHT_CAMERA_BODY, traceFlightMotion } from "@/lib/swordFlightCollision";
import type { SwordFlightControls } from "./useSwordFlight";

export type FlightRuntime = Pick<SwordFlightControls, "flight" | "running" | "resetVersion" | "keys">;

export function useSwordFlightFrame(runtime: FlightRuntime, riderRef: RefObject<Group | null>, wakeRef: RefObject<Group | null>) {
  const { flight: flightRef, running, resetVersion, keys } = runtime;
  const initialized = useRef(false);
  const lastReset = useRef(-1);
  const vectors = useMemo(() => ({ camera: new Vector3(), target: new Vector3(), look: new Vector3(), rotation: new Quaternion(), angles: new Euler() }), []);
  const arrival = useRef({ offset: 0, progress: 1 });

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
        brake: pressed.has("KeyX"),
        land: pressed.has("KeyE"),
      }, dt);
    }
    pressed.delete("KeyE");
    const state = flightRef.current;
    const [x, y, z] = state.position;
    if (lastReset.current !== resetVersion.current) {
      arrival.current = { offset: 0, progress: 1 };
    } else if (previous.mode !== state.mode) {
      arrival.current = { offset: previous.position[1] - y, progress: 0 };
    }
    if (running.current) arrival.current.progress = Math.min(1, arrival.current.progress + dt / 0.45);
    if (riderRef.current) {
      const offset = arrival.current.offset * (1 - arrival.current.progress) ** 3;
      const visiblePosition = Math.abs(offset) > 0.01 ? traceFlightMotion(state.position, [x, y + offset, z]).position : state.position;
      riderRef.current.position.set(...visiblePosition);
      vectors.rotation.setFromEuler(vectors.angles.set(state.pitch, -state.yaw, state.bank, "YXZ"));
      if (!initialized.current || lastReset.current !== resetVersion.current) riderRef.current.quaternion.copy(vectors.rotation);
      else if (running.current) riderRef.current.quaternion.slerp(vectors.rotation, 1 - Math.exp(-dt * 12));
    }
    if (wakeRef.current) {
      wakeRef.current.visible = state.mode === "flying";
      wakeRef.current.scale.z = state.speed / 18;
    }
    const forwardX = Math.sin(state.yaw);
    const forwardZ = -Math.cos(state.yaw);
    const walking = state.mode === "walking";
    const follow = walking ? 6.4 : 11;
    const lookAhead = walking ? 3 : 13;
    vectors.camera.set(x - forwardX * follow, y + (walking ? 3.1 : 4.6), z - forwardZ * follow);
    vectors.target.set(x + forwardX * lookAhead, y + 1.2 + Math.sin(state.pitch) * 10, z + forwardZ * lookAhead);
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
    // Clip the follow camera against the same surfaces as the rider, including roofs.
    const clearCamera = traceFlightMotion([x, y + 1.6, z], [camera.position.x, camera.position.y, camera.position.z], FLIGHT_CAMERA_BODY);
    if (clearCamera.blocked) camera.position.set(...clearCamera.position);
    camera.lookAt(vectors.look);
    if (camera instanceof PerspectiveCamera) {
      const targetFov = walking ? 52 : 58 + Math.max(0, state.speed - 18) * 0.3;
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 4));
        camera.updateProjectionMatrix();
      }
    }
  });
}

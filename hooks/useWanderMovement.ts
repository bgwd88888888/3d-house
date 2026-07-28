"use client";

/**
 * 庭院随机走动：在家附近选目标，边走边避障，不跑太远。
 * 返回 groupRef（驱动位置朝向）与 isMovingRef（切动画用）。
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import {
  createSeededRandom,
  distance2,
  isWalkable,
  sampleWanderTarget,
  type Vec2,
  DEFAULT_AGENT_RADIUS,
  DEFAULT_HOME_RADIUS,
} from "@/lib/gardenNavigation";

type WanderOptions = {
  homeX: number;
  homeZ: number;
  initialRotation: number;
  /** 移动速度（场景单位/秒） */
  speed?: number;
  homeRadius?: number;
  agentRadius?: number;
  seed?: number;
};

type WanderState = {
  mode: "idle" | "walk";
  timer: number;
  target: Vec2 | null;
  facing: number;
  /** 连续无法迈步的时间，用于脱困 */
  stuckTime: number;
};

/** 出生点若在障碍里，螺旋外扩找最近可行走点 */
function resolveSpawn(x: number, z: number, agentRadius: number): Vec2 {
  if (isWalkable(x, z, agentRadius)) return { x, z };
  for (let ring = 1; ring <= 12; ring += 1) {
    const radius = ring * 0.55;
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      const nx = x + Math.cos(angle) * radius;
      const nz = z + Math.sin(angle) * radius;
      if (isWalkable(nx, nz, agentRadius)) return { x: nx, z: nz };
    }
  }
  return { x, z };
}

export function useWanderMovement({
  homeX,
  homeZ,
  initialRotation,
  speed = 1.35,
  homeRadius = DEFAULT_HOME_RADIUS,
  agentRadius = DEFAULT_AGENT_RADIUS,
  seed = 1,
}: WanderOptions) {
  const groupRef = useRef<Group>(null);
  const isMovingRef = useRef(false);
  const randomRef = useRef(createSeededRandom(seed));
  const homePosRef = useRef<Vec2>({ x: homeX, z: homeZ });
  const stateRef = useRef<WanderState>({
    mode: "idle",
    timer: 0.6 + randomRef.current() * 1.8,
    target: null,
    facing: initialRotation,
    stuckTime: 0,
  });

  useEffect(() => {
    const spawn = resolveSpawn(homeX, homeZ, agentRadius);
    homePosRef.current = spawn;
    const group = groupRef.current;
    if (!group) return;
    group.position.set(spawn.x, 0, spawn.z);
    group.rotation.set(0, initialRotation, 0);
    stateRef.current.facing = initialRotation;
    stateRef.current.mode = "idle";
    stateRef.current.target = null;
    stateRef.current.stuckTime = 0;
    stateRef.current.timer = 0.4 + randomRef.current() * 1.2;
  }, [homeX, homeZ, initialRotation, agentRadius]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const state = stateRef.current;
    const random = randomRef.current;
    const homePos = homePosRef.current;

    state.timer -= dt;

    if (state.mode === "idle") {
      isMovingRef.current = false;
      state.stuckTime = 0;
      if (state.timer <= 0) {
        const target = sampleWanderTarget(
          homePos,
          random,
          homeRadius,
          agentRadius,
        );
        if (target) {
          state.mode = "walk";
          state.target = target;
          state.timer = 4 + random() * 5;
        } else {
          state.timer = 1 + random() * 1.5;
        }
      }
      return;
    }

    const target = state.target;
    if (!target || state.timer <= 0) {
      state.mode = "idle";
      state.target = null;
      state.timer = 1.2 + random() * 2.8;
      state.stuckTime = 0;
      isMovingRef.current = false;
      return;
    }

    const pos = group.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.35) {
      state.mode = "idle";
      state.target = null;
      state.timer = 1.4 + random() * 3.2;
      state.stuckTime = 0;
      isMovingRef.current = false;
      return;
    }

    const desiredYaw = Math.atan2(dx, dz);
    let yawDelta = desiredYaw - state.facing;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    state.facing += yawDelta * Math.min(1, dt * 6);
    group.rotation.y = state.facing;

    const step = Math.min(speed * dt, dist);
    const dirX = Math.sin(state.facing);
    const dirZ = Math.cos(state.facing);
    const nextX = pos.x + dirX * step;
    const nextZ = pos.z + dirZ * step;

    // 离家过远则改回家方向
    if (distance2({ x: nextX, z: nextZ }, homePos) > homeRadius + 0.4) {
      state.target = {
        x: homePos.x + (random() - 0.5) * 2,
        z: homePos.z + (random() - 0.5) * 2,
      };
      isMovingRef.current = true;
      state.stuckTime = 0;
      return;
    }

    if (isWalkable(nextX, nextZ, agentRadius)) {
      pos.x = nextX;
      pos.z = nextZ;
      isMovingRef.current = true;
      state.stuckTime = 0;
      return;
    }

    // 撞障：试着侧向绕开
    const side = random() > 0.5 ? 1 : -1;
    const slideX = pos.x + dirZ * side * step;
    const slideZ = pos.z - dirX * side * step;
    if (isWalkable(slideX, slideZ, agentRadius)) {
      pos.x = slideX;
      pos.z = slideZ;
      state.facing += side * 0.7;
      group.rotation.y = state.facing;
      isMovingRef.current = true;
      state.stuckTime = 0;
      return;
    }

    state.stuckTime += dt;
    // 卡住超过 1.2s：拉回可走点并重选目标，避免永远顶在树/墙边
    if (state.stuckTime > 1.2) {
      const rescue = resolveSpawn(pos.x, pos.z, agentRadius);
      pos.x = rescue.x;
      pos.z = rescue.z;
      state.target = sampleWanderTarget(
        homePos,
        random,
        homeRadius,
        agentRadius,
      );
      state.stuckTime = 0;
      state.timer = state.target ? 3 + random() * 3 : 1;
      if (!state.target) {
        state.mode = "idle";
        isMovingRef.current = false;
      }
      return;
    }

    const retarget = sampleWanderTarget(homePos, random, homeRadius, agentRadius);
    state.target = retarget;
    state.timer = retarget ? 3 + random() * 3 : 1;
    if (!retarget) {
      state.mode = "idle";
      isMovingRef.current = false;
    }
  });

  return { groupRef, isMovingRef };
}

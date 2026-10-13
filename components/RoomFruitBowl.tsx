"use client";

/**
 * 茶几果盘：三只木碗分装亚洲梨、苹果、青柠与石榴。
 */
import { useRoomFruitModels } from "@/hooks/useRoomFruitModels";
import { ROOM } from "@/lib/roomSpec";

export function RoomFruitBowl() {
  const { bowls, pears, apples, limes, pomegranates } =
    useRoomFruitModels();

  return (
    <group position={[0, ROOM.coffee.height + 0.006, ROOM.coffee.z]}>
      <group position={[0, 0, 0.12]}>
        <primitive object={bowls[0]} scale={1.02} rotation={[0, 0.35, 0]} />
        <primitive
          object={pears[0]}
          position={[-0.015, 0.058, 0.005]}
          rotation={[0, -0.28, 0]}
        />
        <primitive
          object={apples[0]}
          position={[0.1, 0.055, -0.025]}
          rotation={[0.08, 0.7, -0.12]}
          scale={0.94}
        />
        <primitive
          object={apples[1]}
          position={[-0.095, 0.052, 0.065]}
          rotation={[-0.05, -0.8, 0.1]}
          scale={0.86}
        />
      </group>

      <group position={[-0.32, 0, -0.14]}>
        <primitive object={bowls[1]} scale={0.72} rotation={[0, -0.4, 0]} />
        <primitive
          object={limes[0]}
          position={[-0.055, 0.04, 0.005]}
          rotation={[0.18, 0.2, -0.12]}
          scale={0.9}
        />
        <primitive
          object={limes[1]}
          position={[0.02, 0.038, 0.045]}
          rotation={[-0.1, 0.8, 0.2]}
          scale={0.84}
        />
        <primitive
          object={limes[2]}
          position={[0.06, 0.04, -0.035]}
          rotation={[0.12, -0.5, 0.15]}
          scale={0.88}
        />
        <primitive
          object={apples[2]}
          position={[-0.02, 0.044, -0.04]}
          rotation={[0.05, -0.65, -0.08]}
          scale={0.78}
        />
      </group>

      <group position={[0.32, 0, -0.12]}>
        <primitive object={bowls[2]} scale={0.78} rotation={[0, 0.18, 0]} />
        <primitive
          object={pears[1]}
          position={[-0.02, 0.043, 0.01]}
          rotation={[0, 0.55, 0]}
          scale={0.74}
        />
        <primitive
          object={pomegranates[0]}
          position={[0.065, 0.04, -0.015]}
          rotation={[0.04, -0.35, 0.12]}
          scale={0.68}
        />
        <primitive
          object={apples[3]}
          position={[-0.07, 0.042, -0.045]}
          rotation={[-0.06, 0.4, 0.08]}
          scale={0.76}
        />
      </group>
    </group>
  );
}

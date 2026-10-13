"use client";

import { useCursor } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** 门的悬停与导航；拖动轨道视角时不触发跳转。 */
export function useDoorNavigation(
  href: string,
  isDoorHit?: (event: ThreeEvent<MouseEvent>) => boolean,
) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const canvas = useThree((state) => state.gl.domElement);
  useCursor(hovered, "pointer", "auto", canvas);

  const onPointerHover = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(isDoorHit ? isDoorHit(event) : true);
  };

  return {
    hovered,
    events: {
      onPointerOver: onPointerHover,
      onPointerMove: onPointerHover,
      onPointerOut: () => setHovered(false),
      onClick: (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (event.delta > 4 || (isDoorHit && !isDoorHit(event))) return;
        router.push(href);
      },
    },
  };
}

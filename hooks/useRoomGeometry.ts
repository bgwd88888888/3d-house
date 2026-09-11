"use client";

import { useEffect, useMemo } from "react";
import { buildRoomLayers, disposeRoomLayers } from "@/lib/roomGeometry";

/** 室内几何只建一次；卸载时释放，避免和院子场景抢 GPU。 */
export function useRoomGeometry() {
  const layers = useMemo(() => buildRoomLayers(), []);

  useEffect(() => () => disposeRoomLayers(layers), [layers]);

  return layers;
}

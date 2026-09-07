"use client";

import { useLayoutEffect, useMemo } from "react";
import { buildCottageShrubGeometry } from "@/lib/cottageShrubGeometry";
import { getCottageShrubLayout } from "@/lib/cottageShrubLayout";

/** 管理栅栏灌木的几何生命周期，场景切换时释放本地资源。 */
export function useCottageShrubs() {
  const foliage = useMemo(() => buildCottageShrubGeometry(getCottageShrubLayout()), []);

  useLayoutEffect(() => () => foliage?.dispose(), [foliage]);

  return foliage;
}

"use client";

/**
 * 首页：全屏 R3F + 建筑场景切换 + 天气切换。
 * 天空 / 草地 / 天气共用；西式小院与四进合院分立。
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_WEATHER,
  WEATHER_KINDS,
  WEATHER_LABELS,
  type WeatherKind,
} from "@/lib/weatherPresets";
import {
  DEFAULT_SCENE,
  SCENE_KINDS,
  SCENE_LABELS,
  type SceneKind,
} from "@/lib/sceneKinds";
import { FpsOverlay } from "@/components/FpsOverlay";

const CityCanvas = dynamic(
  () =>
    import("@/components/CityCanvas").then((m) => ({ default: m.CityCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#e9ebf0] text-zinc-500">
        加载中…
      </div>
    ),
  },
);

export default function Home() {
  const [weather, setWeather] = useState<WeatherKind>(DEFAULT_WEATHER);
  const [scene, setScene] = useState<SceneKind>(DEFAULT_SCENE);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#e9ebf0]">
      <CityCanvas
        className="absolute inset-0 h-full w-full"
        stage="details"
        weather={weather}
        scene={scene}
      />

      <FpsOverlay />

      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
        <div
          className="flex gap-1 rounded-full bg-white/80 p-1 shadow ring-1 ring-black/5 backdrop-blur"
          role="group"
          aria-label="建筑场景"
        >
          {SCENE_KINDS.map((kind) => {
            const active = scene === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => setScene(kind)}
                className={
                  active
                    ? "rounded-full bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-white"
                    : "rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-white/90"
                }
              >
                {SCENE_LABELS[kind]}
              </button>
            );
          })}
        </div>
        <p className="pointer-events-none rounded-full bg-white/78 px-3 py-1.5 text-xs text-zinc-700 shadow ring-1 ring-black/5 backdrop-blur">
          拖动旋转，滚轮缩放
        </p>
        <Link
          href="/room"
          className="rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-medium text-zinc-600 shadow ring-1 ring-black/5 backdrop-blur hover:bg-white/90"
        >
          室内灯火
        </Link>
      </div>

      <div
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-white/80 p-1 shadow ring-1 ring-black/5 backdrop-blur"
        role="group"
        aria-label="天气"
      >
        {WEATHER_KINDS.map((kind) => {
          const active = weather === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setWeather(kind)}
              className={
                active
                  ? "rounded-full bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-white"
                  : "rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-white/90"
              }
            >
              {WEATHER_LABELS[kind]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

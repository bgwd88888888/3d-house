"use client";

/**
 * 首页：全屏 R3F 场景 + 简易天气切换（晴 / 阴 / 黄昏）。
 */
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  DEFAULT_WEATHER,
  WEATHER_KINDS,
  WEATHER_LABELS,
  type WeatherKind,
} from "@/lib/weatherPresets";

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

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#e9ebf0]">
      <CityCanvas
        className="absolute inset-0 h-full w-full"
        stage="details"
        weather={weather}
      />

      <p className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-white/78 px-3 py-1.5 text-xs text-zinc-700 shadow ring-1 ring-black/5 backdrop-blur">
        拖动旋转，滚轮缩放
      </p>

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

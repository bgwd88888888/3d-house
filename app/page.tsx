"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  BUILD_STAGES,
  BUILD_STAGE_LABELS,
  type BuildStage,
} from "@/lib/geoBuildings";

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
  const [stage, setStage] = useState<BuildStage>("base");

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#e9ebf0]">
      <CityCanvas className="absolute inset-0 h-full w-full" stage={stage} />

      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100vw-24px)] flex-col gap-3">
        <div className="rounded-2xl bg-white/88 px-4 py-3 shadow-lg ring-1 ring-black/6 backdrop-blur">
          <p className="text-sm font-medium text-zinc-800">
            Build A House
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            从长方体开始，逐步加上屋顶、门、窗和细节。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BUILD_STAGES.map((item) => {
              const active = item === stage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStage(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-[#cf4b15] text-white shadow"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {BUILD_STAGE_LABELS[item]}
                </button>
              );
            })}
          </div>
        </div>

        <p className="pointer-events-none rounded-full bg-white/78 px-3 py-1.5 text-xs text-zinc-700 shadow ring-1 ring-black/5 backdrop-blur">
          拖动旋转，滚轮缩放
        </p>
      </div>
    </div>
  );
}

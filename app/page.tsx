"use client";

import dynamic from "next/dynamic";

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
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#e9ebf0]">
      <CityCanvas className="absolute inset-0 h-full w-full" stage="details" />

      <p className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-white/78 px-3 py-1.5 text-xs text-zinc-700 shadow ring-1 ring-black/5 backdrop-blur">
        拖动旋转，滚轮缩放
      </p>
    </div>
  );
}

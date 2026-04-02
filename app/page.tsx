"use client";

import dynamic from "next/dynamic";

const CityCanvas = dynamic(
  () =>
    import("@/components/CityCanvas").then((m) => ({ default: m.CityCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#080812] text-zinc-400">
        加载中…
      </div>
    ),
  },
);

export default function Home() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#080812]">
      <CityCanvas className="absolute inset-0 h-full w-full" />
      <p className="pointer-events-none absolute left-3 top-3 z-10 text-sm text-white/90">
        Geo City 3D — 拖动旋转，滚轮缩放
      </p>
    </div>
  );
}

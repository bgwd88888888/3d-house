"use client";

/**
 * 室内灯火：独立路由，近距厅堂夜景。
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { FpsOverlay } from "@/components/FpsOverlay";
import {
  DEFAULT_ROOM_VIEW,
  ROOM_VIEWS,
  type RoomViewId,
} from "@/lib/roomSpec";

const RoomCanvas = dynamic(
  () =>
    import("@/components/RoomCanvas").then((m) => ({ default: m.RoomCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#241910] text-zinc-400">
        加载中…
      </div>
    ),
  },
);

export default function RoomPage() {
  const [view, setView] = useState<RoomViewId>(DEFAULT_ROOM_VIEW);
  const [shot, setShot] = useState(0);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#241910]">
      <RoomCanvas
        className="absolute inset-0 h-full w-full"
        view={view}
        shot={shot}
      />

      <FpsOverlay />

      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
        <Link
          href="/"
          className="rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-medium text-zinc-700 shadow ring-1 ring-black/5 backdrop-blur hover:bg-white"
        >
          院子
        </Link>
        <p className="pointer-events-none rounded-full bg-white/78 px-3 py-1.5 text-xs text-zinc-700 shadow ring-1 ring-black/5 backdrop-blur">
          拖动旋转，滚轮缩放
        </p>
      </div>

      <div
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-white/80 p-1 shadow ring-1 ring-black/5 backdrop-blur"
        role="group"
        aria-label="视角"
      >
        {ROOM_VIEWS.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setView(item.id);
                setShot((count) => count + 1);
              }}
              className={
                active
                  ? "rounded-full bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-white"
                  : "rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-white/90"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

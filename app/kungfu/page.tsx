"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FpsOverlay } from "@/components/FpsOverlay";
import { KungfuControls } from "@/components/kungfu/KungfuControls";
import { KungfuCharacterPicker } from "@/components/kungfu/KungfuCharacterPicker";
import { useKungfuControls } from "@/hooks/useKungfuControls";
import { KUNGFU_ACTIONS } from "@/lib/kungfuSpec";

const KungfuCanvas = dynamic(
  () => import("@/components/kungfu/KungfuCanvas").then((module) => module.KungfuCanvas),
  { ssr: false },
);

export default function KungfuPage() {
  const controls = useKungfuControls();
  const action = KUNGFU_ACTIONS.find((item) => item.id === controls.activeMotion);

  return (
    <main className="flex h-dvh min-h-[640px] flex-col overflow-hidden bg-[#08090b] text-white">
      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 pt-6 sm:px-10 sm:pt-8">
        <div>
          <Link href="/" className="text-[10px] tracking-[0.18em] text-zinc-500 transition hover:text-zinc-200">← 返回庭院</Link>
          <h1 className="mt-3 text-2xl font-medium tracking-[0.18em] sm:text-3xl">功夫达人<span className="ml-2 text-amber-300">.</span></h1>
          <p className="mt-2 text-[9px] tracking-[0.3em] text-zinc-600">KUNG FU / MOTION STUDIO</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <KungfuCharacterPicker selected={controls.character.id} onSelect={controls.selectCharacter} />
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] tracking-widest text-zinc-400" role="status" aria-live="polite">
            <span className={`h-1.5 w-1.5 rounded-full ${controls.ready ? "bg-amber-300" : "animate-pulse bg-zinc-600"}`} />
            {!controls.ready ? "准备中" : action ? action.label : "备战姿态"}
          </div>
          <FpsOverlay className="pointer-events-none rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 text-[10px] tracking-widest text-zinc-400" />
        </div>
      </header>

      <div className="relative min-h-0 flex-1" aria-label="聚光灯下的功夫人物">
        <KungfuCanvas characterKey={controls.characterKey} modelUrl={controls.character.modelUrl} command={controls.command} speed={controls.speed} onReady={controls.onReady} onComplete={controls.onComplete} />
        {!controls.ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs tracking-widest text-zinc-500" role="status">
            正在准备人物与动作…
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
          <p className="text-[10px] tracking-[0.22em] text-zinc-500">{action?.hint ?? "凝神 · 蓄势 · 出招"}</p>
        </div>
      </div>

      <KungfuControls ready={controls.ready} activeMotion={controls.activeMotion} speed={controls.speed} pending={controls.pending} onPlay={controls.play} onCombo={controls.playCombo} onSpeedChange={controls.setSpeed} />
    </main>
  );
}

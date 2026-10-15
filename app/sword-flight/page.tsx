"use client";

import dynamic from "next/dynamic";
import { FlightHud } from "@/components/sword-flight/FlightHud";
import { useSwordFlight } from "@/hooks/useSwordFlight";

const SwordFlightCanvas = dynamic(
  () => import("@/components/sword-flight/SwordFlightCanvas").then((module) => module.SwordFlightCanvas),
  { ssr: false },
);

export default function SwordFlightPage() {
  const controls = useSwordFlight();
  return (
    <main className="relative h-dvh min-h-[600px] min-w-[1000px] overflow-hidden bg-[#c9dee6]" aria-label="御剑飞行，桌面键盘体验">
      <SwordFlightCanvas flight={controls.flight} running={controls.running} resetVersion={controls.resetVersion} keys={controls.keys} onReady={controls.onReady} />
      <FlightHud snapshot={controls.snapshot} ready={controls.ready} active={controls.active} toggle={controls.toggle} reset={controls.reset} />
    </main>
  );
}

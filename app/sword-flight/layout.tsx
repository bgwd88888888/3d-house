import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "御剑云游 · Geo City 3D",
  description: "御剑自由探索十座云岛，收剑登台漫步，离开平台继续飞行。",
};

export default function SwordFlightLayout({ children }: { children: React.ReactNode }) {
  return children;
}

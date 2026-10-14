import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "功夫达人 · Geo City 3D",
  description: "聚光灯下的写实功夫人物，点击体验踢腿、防守与拳法。",
};

export default function KungfuLayout({ children }: { children: React.ReactNode }) {
  return children;
}

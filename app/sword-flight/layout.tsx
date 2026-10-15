import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "御剑云游 · Geo City 3D",
  description: "御剑穿行于浮岛云海之间，轻量桌面飞行体验。",
};

export default function SwordFlightLayout({ children }: { children: React.ReactNode }) {
  return children;
}

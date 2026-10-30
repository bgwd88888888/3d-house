import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "刚好十秒 | Geo City 3D",
  description: "点击开始，在 10.000 秒按停。挑战你的时间感，刷新本地最佳纪录。",
};

export default function TenSecondChallengePage() {
  return (
    <iframe
      title="刚好十秒：3D 风格计时挑战"
      src="/games/ten-second-challenge/index.html"
      className="block h-dvh w-full border-0"
    />
  );
}

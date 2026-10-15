"use client";

import Link from "next/link";

export default function SwordFlightError({ reset }: { reset: () => void }) {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-5 bg-[#c9dee6] text-[#26434b]">
      <h1 className="text-xl">云海暂时未能展开</h1>
      <p className="text-sm">请确认浏览器支持 WebGL，或重试加载场景。</p>
      <button type="button" onClick={reset} className="rounded-full bg-[#315f65] px-6 py-2 text-white">重新加载</button>
      <Link href="/" className="text-sm">返回庭院</Link>
    </main>
  );
}

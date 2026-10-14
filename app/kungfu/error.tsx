"use client";

import Link from "next/link";

export default function KungfuError() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#08090b] px-6 text-center text-zinc-200">
      <h1 className="text-xl">人物暂时未能加载</h1>
      <p className="text-sm text-zinc-500">请检查网络连接后重试。</p>
      <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-amber-200 px-6 py-2.5 text-sm font-medium text-zinc-900">重新加载</button>
      <Link href="/" className="text-xs text-zinc-500 hover:text-white">返回庭院</Link>
    </main>
  );
}

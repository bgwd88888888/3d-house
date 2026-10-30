"use client";

import { KUNGFU_CHARACTERS, type KungfuCharacterId } from "@/lib/kungfuCharacters";

type KungfuCharacterPickerProps = {
  selected: KungfuCharacterId;
  onSelect: (id: KungfuCharacterId) => void;
  label?: string;
};

export function KungfuCharacterPicker({ selected, onSelect, label = "操控" }: KungfuCharacterPickerProps) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 text-xs">
      <span className="text-zinc-500">{label}</span>
      <select value={selected} onChange={(event) => onSelect(event.target.value as KungfuCharacterId)} aria-label={`${label}角色`} className="min-w-0 bg-transparent text-amber-200 outline-none focus-visible:ring-1 focus-visible:ring-amber-200/60">
        {KUNGFU_CHARACTERS.map((character) => (
          <option key={character.id} value={character.id} className="bg-[#111317] text-zinc-200">{character.label}</option>
        ))}
      </select>
    </label>
  );
}

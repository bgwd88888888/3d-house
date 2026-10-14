"use client";

import { KUNGFU_CHARACTERS, type KungfuCharacterId } from "@/lib/kungfuCharacters";

type KungfuCharacterPickerProps = {
  selected: KungfuCharacterId;
  onSelect: (id: KungfuCharacterId) => void;
};

export function KungfuCharacterPicker({ selected, onSelect }: KungfuCharacterPickerProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.025] p-1" role="group" aria-label="切换角色">
      {KUNGFU_CHARACTERS.map((character) => (
        <button
          key={character.id}
          type="button"
          aria-pressed={selected === character.id}
          onClick={() => onSelect(character.id)}
          className={`rounded-full px-3 py-1.5 text-xs transition ${selected === character.id ? "bg-amber-200/15 text-amber-200" : "text-zinc-500 hover:text-zinc-200"}`}
        >
          {character.label}
        </button>
      ))}
    </div>
  );
}

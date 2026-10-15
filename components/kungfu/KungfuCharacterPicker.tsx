"use client";

import { KUNGFU_CHARACTERS, type KungfuCharacterId } from "@/lib/kungfuCharacters";
import { KungfuOptionPicker } from "./KungfuOptionPicker";

type KungfuCharacterPickerProps = {
  selected: KungfuCharacterId;
  onSelect: (id: KungfuCharacterId) => void;
};

export function KungfuCharacterPicker({ selected, onSelect }: KungfuCharacterPickerProps) {
  return (
    <KungfuOptionPicker options={KUNGFU_CHARACTERS} selected={selected} onSelect={onSelect} label="切换角色" />
  );
}

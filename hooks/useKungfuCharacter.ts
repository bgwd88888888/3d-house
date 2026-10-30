"use client";

import { useCallback, useState } from "react";
import { KUNGFU_CHARACTERS, type KungfuCharacterId } from "@/lib/kungfuCharacters";

type Selection = {
  character: (typeof KUNGFU_CHARACTERS)[number];
  opponent: (typeof KUNGFU_CHARACTERS)[number];
  revision: number;
  ready: boolean;
};

/** 用每次切换的版本隔离旧模型的加载回调。 */
export function useKungfuCharacter(onChange: () => void) {
  const [selection, setSelection] = useState<Selection>({ character: KUNGFU_CHARACTERS[0], opponent: KUNGFU_CHARACTERS[1], revision: 0, ready: false });
  const reloadCharacter = useCallback((fighters?: Pick<Selection, "character" | "opponent">) => {
    onChange();
    setSelection((current) => ({ ...current, ...fighters, revision: current.revision + 1, ready: false }));
  }, [onChange]);
  const selectFighter = useCallback((role: "character" | "opponent", id: KungfuCharacterId) => {
    if (id === selection[role].id) return;
    const character = KUNGFU_CHARACTERS.find((item) => item.id === id);
    if (!character) return;
    const otherRole = role === "character" ? "opponent" : "character";
    const fighters = { character: selection.character, opponent: selection.opponent };
    if (fighters[otherRole].id === id) fighters[otherRole] = fighters[role];
    fighters[role] = character;
    reloadCharacter(fighters);
  }, [reloadCharacter, selection]);
  const selectCharacter = useCallback((id: KungfuCharacterId) => selectFighter("character", id), [selectFighter]);
  const selectOpponent = useCallback((id: KungfuCharacterId) => selectFighter("opponent", id), [selectFighter]);
  const revision = selection.revision;
  const onReady = useCallback(() => {
    setSelection((current) => current.revision !== revision || current.ready ? current : { ...current, ready: true });
  }, [revision]);

  return {
    character: selection.character,
    opponent: selection.opponent,
    characterKey: selection.revision,
    ready: selection.ready,
    selectCharacter,
    selectOpponent,
    reloadCharacter,
    onReady,
  };
}

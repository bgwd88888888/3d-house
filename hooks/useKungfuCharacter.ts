"use client";

import { useCallback, useState } from "react";
import { KUNGFU_CHARACTERS, type KungfuCharacterId } from "@/lib/kungfuCharacters";

type Selection = {
  character: (typeof KUNGFU_CHARACTERS)[number];
  revision: number;
  ready: boolean;
};

/** 用每次切换的版本隔离旧模型的加载回调。 */
export function useKungfuCharacter(onChange: () => void) {
  const [selection, setSelection] = useState<Selection>({ character: KUNGFU_CHARACTERS[0], revision: 0, ready: false });
  const reloadCharacter = useCallback((character?: Selection["character"]) => {
    onChange();
    setSelection((current) => ({ character: character ?? current.character, revision: current.revision + 1, ready: false }));
  }, [onChange]);
  const selectCharacter = useCallback((id: KungfuCharacterId) => {
    if (id === selection.character.id) return;
    const character = KUNGFU_CHARACTERS.find((item) => item.id === id);
    if (!character) return;
    reloadCharacter(character);
  }, [reloadCharacter, selection.character.id]);
  const revision = selection.revision;
  const onReady = useCallback(() => {
    setSelection((current) => current.revision !== revision || current.ready ? current : { ...current, ready: true });
  }, [revision]);

  return {
    character: selection.character,
    characterKey: selection.revision,
    ready: selection.ready,
    selectCharacter,
    reloadCharacter,
    onReady,
  };
}

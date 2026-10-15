"use client";

type KungfuOptionPickerProps<T extends string> = {
  options: readonly { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
  label: string;
};

export function KungfuOptionPicker<T extends string>({ options, selected, onSelect, label }: KungfuOptionPickerProps<T>) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.025] p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={selected === option.id}
          onClick={() => onSelect(option.id)}
          className={`rounded-full px-3 py-1.5 text-xs transition ${selected === option.id ? "bg-amber-200/15 text-amber-200" : "text-zinc-500 hover:text-zinc-200"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

'use client';

export function AIQuickPrompt({
  label,
  onPick,
}: {
  label: string;
  onPick: (label: string) => void;
}) {
  return (
    <button type="button" className="md-chip" onClick={() => onPick(label)}>
      {label}
    </button>
  );
}

"use client";

type Props = {
  businessId: string;
  onSave: (id: string) => void | Promise<void>;
};

export function SaveButton({ businessId, onSave }: Props) {
  return (
    <button
      type="button"
      onClick={() => void onSave(businessId)}
      className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
    >
      Save
    </button>
  );
}

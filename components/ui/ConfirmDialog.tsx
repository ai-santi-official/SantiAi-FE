"use client";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Go back",
  confirmClassName = "bg-santi-primary text-black",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-t-3xl px-6 pt-6 pb-10 w-full max-w-md space-y-4">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
        <h3 className="text-base font-bold text-black">{title}</h3>
        <p className="text-sm text-black/60 leading-relaxed">{message}</p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-santi border-2 border-slate-200 text-sm font-bold text-black/60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-santi text-sm font-bold ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

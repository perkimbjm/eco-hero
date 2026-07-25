import { useCallback, useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal yes/no prompt for actions that would throw work away.
 *
 * Rendered inline rather than through a portal so it stays visible when an
 * ancestor is the fullscreen element — a portal to `document.body` would be
 * painted outside it and never show up during fullscreen gameplay.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Cancel is the safe answer, so it takes focus and owns the Enter key.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      // Keep focus inside the dialog: only two controls, so Tab just alternates.
      if (event.key === 'Tab') {
        event.preventDefault();
        const target = document.activeElement === cancelRef.current ? confirmRef : cancelRef;
        target.current?.focus();
      }
    },
    [onCancel]
  );

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        // The backdrop closes on click; the panel must not inherit that.
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-2xl"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-extrabold text-white">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm leading-relaxed text-slate-300">
          {message}
        </p>

        <div className="mt-5 flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition-all hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300 active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-slate-700 px-4 py-3 font-bold text-white transition-all hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

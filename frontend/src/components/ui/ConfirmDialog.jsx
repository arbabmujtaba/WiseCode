import { useEffect, useRef } from 'react';

// Accessible confirmation dialog built on the native <dialog> element.
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  tone = 'btn-error',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal" onClose={onCancel} aria-labelledby="confirm-title">
      <div className="modal-box">
        <h3 id="confirm-title" className="text-lg font-bold">
          {title}
        </h3>
        <div className="py-3 text-base-content/70">{children}</div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={`btn ${tone}`} onClick={onConfirm} disabled={busy}>
            {busy && <span className="loading loading-spinner loading-sm" />}
            {confirmLabel}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Close">close</button>
      </form>
    </dialog>
  );
}

// Modal over a 50% neutral-900 backdrop, 440px max, surface fill, shadow-lg,
// no radius. Quotes the fear; actions right-aligned.
export default function DeleteDialog({
  fearText,
  onKeep,
  onDelete,
  busy,
}: {
  fearText: string;
  onKeep: () => void;
  onDelete: () => void;
  busy?: boolean;
}) {
  return (
    <div className="dialog-backdrop" style={{ zIndex: 50 }} onClick={onKeep}>
      <div className="dialog elev-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dialog-title">Delete this entry?</div>
        <div className="dialog-body">
          “{fearText}” and its truth statement will be removed. This can't be undone.
        </div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onKeep} disabled={busy}>
            Keep it
          </button>
          <button className="btn btn-primary" onClick={onDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

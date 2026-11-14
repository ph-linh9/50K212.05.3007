import Flash from './Flash.jsx';

export function Modal({ title, onClose, onBackdrop, children, width = 560, scroll = true }) {
  return (
    <div className="overlay" onMouseDown={onBackdrop ? (e) => { if (e.target === e.currentTarget) onBackdrop(); } : undefined}>
      <div className="modal" style={{ width }} role="dialog" aria-modal="true">
        {(title || onClose) && <div className="modal-head">
          <h2>{title}</h2>
          {onClose && (
            <button className="x-btn" onClick={onClose} aria-label="Đóng">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
          )}
        </div>}
        <div className={scroll ? 'modal-body' : ''}>{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, loi, children, huy = 'Hủy', ok, danger, onCancel, onOk, busy }) {
  return (
    <div className="overlay overlay-top">
      <div className="confirm" role="alertdialog" aria-modal="true">
        {title && <h2>{title}</h2>}
        {loi && <Flash kieu="loi">{loi}</Flash>}
        <p>{children}</p>
        <div className="confirm-actions">
          <button className="btn-outline" onClick={onCancel} disabled={busy}>{huy}</button>
          <button className={danger ? 'btn-danger' : 'btn-fill'} onClick={onOk} disabled={busy}>{ok}</button>
        </div>
      </div>
    </div>
  );
}

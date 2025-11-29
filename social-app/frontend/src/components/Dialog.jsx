import './Dialog.css'

function Dialog({ isOpen, onClose, title, message, type = 'info', onConfirm, confirmText = 'OK', cancelText = 'Cancel', showCancel = false }) {
  if (!isOpen) return null

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={!showCancel ? handleCancel : undefined}>
      <div className="dialog-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`dialog-icon ${type}`}>
          {type === 'success' && <i className="fa fa-check-circle"></i>}
          {type === 'error' && <i className="fa fa-exclamation-circle"></i>}
          {type === 'warning' && <i className="fa fa-exclamation-triangle"></i>}
          {type === 'info' && <i className="fa fa-info-circle"></i>}
        </div>
        <div className="dialog-content">
          {title && <h3 className="dialog-title">{title}</h3>}
          {message && message.trim() && <div className="dialog-message" style={{ whiteSpace: 'pre-line' }}>{message}</div>}
        </div>
        <div className="dialog-actions">
          {showCancel && (
            <button className="dialog-btn dialog-btn-cancel" onClick={handleCancel}>
              {cancelText}
            </button>
          )}
          <button className={`dialog-btn dialog-btn-${type}`} onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dialog



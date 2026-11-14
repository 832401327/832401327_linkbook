import { AlertIcon, CheckIcon, CloseIcon } from './Icons.jsx';

export default function Toasts({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'error' ? <AlertIcon width={16} height={16} /> : <CheckIcon width={16} height={16} />}
          </span>
          <span>{toast.message}</span>
          <button type="button" className="icon-button subtle" aria-label="关闭提示" onClick={() => onDismiss(toast.id)}>
            <CloseIcon width={14} height={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

import { useNotifications } from '../context/NotificationContext';
import { resolveMediaUrl } from '../utils/media';

function ToastContainer() {
  const { toasts, removeToast } = useNotifications();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item toast-${toast.type}`}
          role="alert"
          onClick={() => {
            if (toast.onClick) toast.onClick();
            removeToast(toast.id);
          }}
        >
          {toast.avatar && (
            <img
              src={resolveMediaUrl(toast.avatar)}
              alt=""
              className="toast-avatar"
            />
          )}
          <div className="toast-content">
            {toast.title && <p className="toast-title">{toast.title}</p>}
            {toast.message && <p className="toast-message">{toast.message}</p>}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            aria-label="Yopish"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;

import { useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { resolveMediaUrl } from '../utils/media';

function ToastContainer() {
  const { toasts, removeToast, addToast } = useNotifications();
  const recentToastRef = useRef(new Map());

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const sweepRecentMap = () => {
      const now = Date.now();
      const map = recentToastRef.current;
      map.forEach((value, key) => {
        if (now - value > 5000) {
          map.delete(key);
        }
      });
    };

    const emitFormMessageToasts = () => {
      const nodes = document.querySelectorAll('.form-message');
      if (nodes.length === 0) {
        return;
      }

      sweepRecentMap();

      nodes.forEach((node) => {
        const message = node.textContent?.trim();
        if (!message) {
          node.removeAttribute('data-toast-message');
          return;
        }

        const lastBridgedMessage = node.getAttribute('data-toast-message') || '';
        node.setAttribute('data-toast-bridged', '1');
        if (lastBridgedMessage === message) {
          return;
        }
        node.setAttribute('data-toast-message', message);

        let type = 'info';
        let title = "Ma'lumot";

        if (node.classList.contains('error')) {
          type = 'error';
          title = 'Xatolik';
        } else if (node.classList.contains('success')) {
          type = 'success';
          title = 'Muvaffaqiyatli';
        }

        const dedupeKey = `${type}:${message}`;
        const lastShownAt = recentToastRef.current.get(dedupeKey) || 0;
        if (Date.now() - lastShownAt < 1200) {
          return;
        }

        recentToastRef.current.set(dedupeKey, Date.now());
        addToast({
          type,
          title,
          message,
          dedupeKey,
          dedupeMs: 5000,
          duration: 3000,
        });
      });
    };

    emitFormMessageToasts();

    const observer = new MutationObserver(() => {
      emitFormMessageToasts();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [addToast]);

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

export const WS_RECONNECT_DELAY_MS = 1500;
export const FALLBACK_POLL_INTERVAL_MS = 2500;
export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;
export const QUICK_EMOJIS = ['😀', '😁', '😂', '🙂', '😉', '😍', '🤝', '👍', '🙏', '👏', '🔥', '✅', '❗', '🎉'];
export const VACANCY_STATUS_LABELS = {
  open: 'Yangi',
  in_progress: 'Jarayonda',
  completed: 'Yakunlangan',
  cancelled: 'Bekor qilingan',
};

export function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const isSameDay = (
    d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
  );
  if (isSameDay) {
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  }
  const day = d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

export function formatLastSeen(dateStr) {
  if (!dateStr) return 'noma`lum';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'noma`lum';
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 3) return 'online';
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} soat oldin`;
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function mergeMessageLists(current, incoming) {
  const map = new Map();
  current.forEach((item) => {
    map.set(item.id, item);
  });
  incoming.forEach((item) => {
    map.set(item.id, item);
  });

  return Array.from(map.values()).sort((a, b) => {
    const left = Date.parse(a.created_at || '') || 0;
    const right = Date.parse(b.created_at || '') || 0;
    if (left !== right) {
      return left - right;
    }
    return (a.id || 0) - (b.id || 0);
  });
}

export function buildWsUrl(threadId, token) {
  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
  const wsBase = apiBase.startsWith('https')
    ? apiBase.replace(/^https/, 'wss')
    : apiBase.replace(/^http/, 'ws');

  return `${wsBase}/ws/chat/threads/${threadId}/?token=${encodeURIComponent(token)}`;
}

export function getOtherUserId(thread, currentUserId) {
  if (!thread) return null;
  if (thread.client_id === currentUserId) return thread.worker_id;
  return thread.client_id;
}

export function getOwnMessageState(message, activeThread, currentUserId) {
  if (!message || !activeThread || !currentUserId) return null;
  if (message.is_system || message.sender_id !== currentUserId) return null;

  const senderIsClient = activeThread.client_id === currentUserId;
  const deliveredAt = senderIsClient ? message.delivered_to_worker_at : message.delivered_to_client_at;
  const readAt = senderIsClient ? message.read_by_worker_at : message.read_by_client_at;

  if (readAt) return 'read';
  if (deliveredAt) return 'delivered';
  return 'sent';
}

export function splitMessageVacancyContext(body) {
  const text = `${body || ''}`;
  const lines = text.split('\n');
  const firstLine = `${lines[0] || ''}`.trim();
  if (!firstLine.toLowerCase().startsWith("e`lon:")) {
    return { vacancyTitle: '', content: text };
  }
  const vacancyTitle = firstLine.replace(/^e`lon:\s*/i, '').trim();
  const content = lines.slice(1).join('\n').trim();
  return {
    vacancyTitle,
    content,
  };
}

export function resolveAttachmentUrl(value) {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
  return `${apiBase}${value.startsWith('/') ? value : `/${value}`}`;
}

export function isImageAttachment(name = '') {
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(name);
}

export function getProposalGroupKey(option) {
  if (!option) return '';
  if (option.vacancy_id !== null && option.vacancy_id !== undefined && option.vacancy_id !== '') {
    return `vacancy-${option.vacancy_id}`;
  }
  if (option.id !== null && option.id !== undefined && option.id !== '') {
    return `proposal-${option.id}`;
  }
  return '';
}

export function getThreadProposalOptions(thread) {
  if (!thread) {
    return [];
  }
  const options = Array.isArray(thread.proposal_options)
    ? thread.proposal_options.filter(Boolean)
    : [];
  if (options.length > 0) {
    return options;
  }

  if (thread.vacancy_id || thread.vacancy_title || thread.proposal_id) {
    return [
      {
        id: thread.proposal_id || null,
        vacancy_id: thread.vacancy_id || null,
        vacancy_title: thread.vacancy_title || 'E`lon ko`rsatilmagan',
        status: thread.proposal_status || null,
      },
    ];
  }
  return [];
}

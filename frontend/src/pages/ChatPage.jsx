import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, SendHorizonal } from 'lucide-react';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { resolveMediaUrl } from '../utils/media';
import { PROPOSAL_STATUS_LABELS as proposalStatusLabels, normalizeListResponse as normalizeList } from '../utils/format';

function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Hozir';
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} soat oldin`;
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
}

function formatLastSeen(dateStr) {
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

const WS_RECONNECT_DELAY_MS = 1500;
const FALLBACK_POLL_INTERVAL_MS = 2500;

function mergeMessageLists(current, incoming) {
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

function buildWsUrl(threadId, token) {
  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
  const wsBase = apiBase.startsWith('https')
    ? apiBase.replace(/^https/, 'wss')
    : apiBase.replace(/^http/, 'ws');

  return `${wsBase}/ws/chat/threads/${threadId}/?token=${encodeURIComponent(token)}`;
}

function ChatPage() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const { isAuthenticated, tokens, user } = useAuth();
  const { markThreadRead, getThreadUnread, setActiveThread } = useNotifications();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(() => (threadId ? Number(threadId) : null));
  const [draft, setDraft] = useState('');
  const socketRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [wsRetryTick, setWsRetryTick] = useState(0);
  const [status, setStatus] = useState({
    threadsLoading: true,
    messagesLoading: false,
    sending: false,
    accepting: false,
    rejecting: false,
    error: '',
    success: '',
  });

  useEffect(() => {
    if (!isAuthenticated || !tokens.access) {
      return;
    }

    let active = true;
    setStatus((prev) => ({ ...prev, threadsLoading: true, error: '', success: '' }));

    authApi.listChatThreads(tokens.access)
      .then((data) => {
        if (!active) {
          return;
        }
        const list = normalizeList(data);
        setThreads(list);

        if (list.length === 0) {
          setActiveThreadId(null);
          setMessages([]);
          setStatus((prev) => ({ ...prev, threadsLoading: false }));
          return;
        }

        const requestedId = threadId ? Number(threadId) : null;
        const requestedExists = requestedId && list.some((item) => item.id === requestedId);
        const nextId = requestedExists ? requestedId : list[0].id;

        setActiveThreadId(nextId);
        setActiveThread(nextId);
        markThreadRead(nextId);
        setWsRetryTick(0);
        if (requestedId !== nextId) {
          navigate(`/chat/${nextId}`, { replace: true });
        }
        setStatus((prev) => ({ ...prev, threadsLoading: false }));
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setStatus((prev) => ({
          ...prev,
          threadsLoading: false,
          error: error.message || 'Suhbatlarni yuklab bo`lmadi.',
        }));
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, tokens.access, threadId, navigate, setActiveThread, markThreadRead]);

  useEffect(() => {
    return () => setActiveThread(null);
  }, [setActiveThread]);

  useEffect(() => {
    if (!isAuthenticated || !tokens.access || !activeThreadId) {
      return;
    }

    let active = true;
    setStatus((prev) => ({ ...prev, messagesLoading: true, error: '' }));

    authApi.listChatMessages(activeThreadId, tokens.access)
      .then((data) => {
        if (!active) {
          return;
        }
        setMessages(normalizeList(data));
        setStatus((prev) => ({ ...prev, messagesLoading: false }));
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setMessages([]);
        setStatus((prev) => ({
          ...prev,
          messagesLoading: false,
          error: error.message || 'Xabarlarni yuklab bo`lmadi.',
        }));
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, tokens.access, activeThreadId]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const scrollBehavior = behavior === 'instant' ? 'auto' : behavior;
    try {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: scrollBehavior,
      });
    } catch {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const newCount = messages.length;
    const oldCount = prevMessageCountRef.current;
    prevMessageCountRef.current = newCount;

    if (newCount > oldCount) {
      const container = messagesContainerRef.current;
      if (!container) {
        scrollToBottom();
        return;
      }
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 140;
      if (isNearBottom || oldCount === 0) {
        scrollToBottom(oldCount === 0 ? 'instant' : 'smooth');
      } else {
        setShowScrollBtn(true);
      }
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distFromBottom > 140);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [activeThreadId]);

  useEffect(() => {
    if (!isAuthenticated || !tokens.access || !activeThreadId) {
      return;
    }

    let ws;
    let reconnectTimeoutId = null;
    let isCleaningUp = false;
    try {
      ws = new WebSocket(buildWsUrl(activeThreadId, tokens.access));
    } catch {
      setSocketConnected(false);
      return;
    }

    socketRef.current = ws;

    ws.onopen = () => {
      setSocketConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'message' && payload.message) {
          const incoming = payload.message;
          setMessages((prev) => mergeMessageLists(prev, [incoming]));
          setThreads((prev) => prev.map((thread) => (
            thread.id === activeThreadId
              ? {
                ...thread,
                last_message: incoming.body,
                last_message_at: incoming.created_at,
              }
              : thread
          )));
          return;
        }

        if (payload.type === 'thread_update' && payload.data) {
          const nextProposalStatus = payload.data.proposal_status;
          if (nextProposalStatus) {
            setThreads((prev) => prev.map((thread) => (
              thread.id === activeThreadId
                ? { ...thread, proposal_status: nextProposalStatus }
                : thread
            )));
          }
        }
      } catch {
        // JSON parse xatolarini jim o'tkazamiz.
      }
    };

    ws.onclose = () => {
      setSocketConnected(false);
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
      if (!isCleaningUp) {
        reconnectTimeoutId = window.setTimeout(() => {
          setWsRetryTick((prev) => prev + 1);
        }, WS_RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      setSocketConnected(false);
    };

    return () => {
      isCleaningUp = true;
      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
      setSocketConnected(false);
    };
  }, [isAuthenticated, tokens.access, activeThreadId, wsRetryTick]);

  useEffect(() => {
    if (!isAuthenticated || !tokens.access || !activeThreadId || socketConnected) {
      return;
    }

    let active = true;
    const syncFallback = async () => {
      try {
        const [messagesData, threadsData] = await Promise.all([
          authApi.listChatMessages(activeThreadId, tokens.access),
          authApi.listChatThreads(tokens.access),
        ]);
        if (!active) {
          return;
        }
        setMessages((prev) => mergeMessageLists(prev, normalizeList(messagesData)));
        setThreads(normalizeList(threadsData));
      } catch {
        // Fallback rejimda xatolarni jim o'tkazamiz.
      }
    };

    syncFallback();
    const intervalId = window.setInterval(syncFallback, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, tokens.access, activeThreadId, socketConnected]);

  const activeThread = useMemo(
    () => threads.find((item) => item.id === activeThreadId) || null,
    [threads, activeThreadId],
  );

  const openThread = (id) => {
    setActiveThreadId(id);
    setActiveThread(id);
    navigate(`/chat/${id}`);
    markThreadRead(id);
    setStatus((prev) => ({ ...prev, error: '', success: '' }));
  };

  const onSendMessage = async (event) => {
    event.preventDefault();
    if (!activeThreadId || !draft.trim()) {
      return;
    }

    setStatus((prev) => ({ ...prev, sending: true, error: '', success: '' }));

    try {
      const text = draft.trim();
      const ws = socketRef.current;
      if (socketConnected && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', body: text }));
      } else {
        const sent = await authApi.sendChatMessage(activeThreadId, { body: text }, tokens.access);
        setMessages((prev) => mergeMessageLists(prev, [sent]));
        setThreads((prev) => prev.map((thread) => (
          thread.id === activeThreadId
            ? { ...thread, last_message: sent.body, last_message_at: sent.created_at }
            : thread
        )));
      }
      setDraft('');
      setStatus((prev) => ({ ...prev, sending: false }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        sending: false,
        error: error.message || 'Xabar yuborishda xatolik yuz berdi.',
      }));
    }
  };

  const onAcceptWorker = async () => {
    if (!activeThreadId) {
      return;
    }

    setStatus((prev) => ({ ...prev, accepting: true, error: '', success: '' }));
    try {
      await authApi.acceptChatWorker(activeThreadId, tokens.access);
      const refreshedThreads = normalizeList(await authApi.listChatThreads(tokens.access));
      setThreads(refreshedThreads);
      setStatus((prev) => ({
        ...prev,
        accepting: false,
        success: 'Usta chat orqali qabul qilindi.',
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        accepting: false,
        error: error.message || 'Ustani qabul qilishda xatolik yuz berdi.',
      }));
    }
  };

  const onRejectWorker = async () => {
    if (!activeThreadId) {
      return;
    }

    setStatus((prev) => ({ ...prev, rejecting: true, error: '', success: '' }));
    try {
      await authApi.rejectChatWorker(activeThreadId, tokens.access);
      const refreshedThreads = normalizeList(await authApi.listChatThreads(tokens.access));
      setThreads(refreshedThreads);
      setStatus((prev) => ({
        ...prev,
        rejecting: false,
        success: 'Murojaat chat orqali rad etildi.',
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        rejecting: false,
        error: error.message || 'Murojaatni rad etishda xatolik yuz berdi.',
      }));
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  const otherOnline = useMemo(() => {
    if (!activeThread) return false;
    const lastMsg = activeThread.last_message_at;
    if (!lastMsg) return false;
    const diff = Date.now() - new Date(lastMsg).getTime();
    return diff < 3 * 60 * 1000;
  }, [activeThread]);

  const otherLastSeen = activeThread?.last_message_at || null;

  return (
    <section className="chat-shell reveal-up">
      <aside className="chat-list card">
        <p className="chat-title">Suhbatlar</p>
        <div className="chat-list-scroll">
          {status.threadsLoading ? (
            <p className="muted">Suhbatlar yuklanmoqda...</p>
          ) : threads.length === 0 ? (
            <p className="muted">Hozircha chatlar yo`q. E`longa murojaat yuboring.</p>
          ) : (
            threads.map((thread) => {
              const isActive = thread.id === activeThreadId;
              const threadOnline = thread.last_message_at && (Date.now() - new Date(thread.last_message_at).getTime() < 3 * 60 * 1000);
              return (
                <button
                  key={thread.id}
                  type="button"
                  className={`chat-contact${isActive ? ' chat-contact-active' : ''}`}
                  onClick={() => openThread(thread.id)}
                >
                  <div className="chat-contact-avatar-wrap">
                    <img
                      src={resolveMediaUrl(thread.other_user_photo, { userType: thread.other_user_type || 'client' })}
                      alt={thread.other_user_name}
                      className="chat-contact-avatar"
                    />
                    <span className={`online-dot online-dot-abs${threadOnline ? ' online-dot-active' : ''}`} />
                  </div>
                  <div className="chat-contact-info">
                    <span className="chat-contact-name">{thread.other_user_name}</span>
                    <p className="muted chat-contact-preview">{thread.last_message || 'Xabar yo`q'}</p>
                    <p className="muted chat-contact-sub">{thread.vacancy_title}</p>
                  </div>
                  <div className="chat-contact-end">
                    {thread.last_message_at && (
                      <span className="chat-contact-time">{formatMessageTime(thread.last_message_at)}</span>
                    )}
                    {getThreadUnread(thread.id) > 0 && (
                      <span className="chat-unread-badge">{getThreadUnread(thread.id)}</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <article className="chat-window card">
        {!activeThread ? (
          <div className="chat-empty-state">
            <p className="muted">Suhbat tanlang yoki yangi murojaat yuboring.</p>
          </div>
        ) : (
          <>
            <header className="chat-header">
              <div className="chat-header-top">
                <div className="chat-header-user">
                  <div className="chat-header-avatar-wrap">
                    <img
                      src={resolveMediaUrl(activeThread.other_user_photo, { userType: activeThread.other_user_type || 'client' })}
                      alt={activeThread.other_user_name}
                      className="chat-header-avatar"
                    />
                    <span className={`online-dot online-dot-abs online-dot-lg${otherOnline ? ' online-dot-active' : ''}`} />
                  </div>
                  <div>
                    <h3 className="chat-header-name">{activeThread.other_user_name}</h3>
                    <span className="chat-header-status">
                      {otherOnline ? 'Online' : `Oxirgi faollik: ${formatLastSeen(otherLastSeen)}`}
                    </span>
                  </div>
                </div>
                <span className={`status-pill status-${activeThread.proposal_status}`}>
                  {proposalStatusLabels[activeThread.proposal_status] || activeThread.proposal_status}
                </span>
              </div>
              <p className="muted chat-header-vacancy">{activeThread.vacancy_title}</p>
              <div className="chat-header-actions">
                <Link className="button button-ghost" to={`/elonlar/${activeThread.vacancy_id}`}>
                  E`lonni ochish
                </Link>
                {activeThread.can_accept && (
                  <>
                    <button
                      className="button button-ghost danger-button"
                      type="button"
                      disabled={status.rejecting}
                      onClick={onRejectWorker}
                    >
                      {status.rejecting ? 'Rad etilmoqda...' : 'Rad etish'}
                    </button>
                    <button
                      className="button button-primary"
                      type="button"
                      disabled={status.accepting}
                      onClick={onAcceptWorker}
                    >
                      {status.accepting ? 'Qabul qilinmoqda...' : 'Ustani qabul qilish'}
                    </button>
                  </>
                )}
              </div>
            </header>

            <div className="chat-messages" ref={messagesContainerRef}>
              {status.messagesLoading ? (
                <p className="muted">Xabarlar yuklanmoqda...</p>
              ) : messages.length === 0 ? (
                <p className="muted">Hozircha xabar yo`q. Birinchi bo`lib yozing!</p>
              ) : (
                messages.map((message) => {
                  const isSelf = message.sender_id === user?.id;
                  const isSystem = message.is_system;

                  return (
                    <div
                      key={message.id}
                      className={`message-bubble${isSelf ? ' message-self' : ''}${isSystem ? ' message-system' : ''}`}
                    >
                      {!isSystem && <p className="message-author">{message.sender_name}</p>}
                      <p className="message-body">{message.body}</p>
                      {message.created_at && (
                        <span className="message-time">{formatMessageTime(message.created_at)}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {showScrollBtn && (
              <button
                type="button"
                className="chat-scroll-btn"
                onClick={() => scrollToBottom()}
                aria-label="Pastga tushish"
              >
                <ChevronDown size={20} />
              </button>
            )}

            <form className="chat-input-row" onSubmit={onSendMessage}>
              <input
                className="input chat-input"
                placeholder="Xabar yozing..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button className="button button-primary chat-send-btn" type="submit" disabled={status.sending}>
                <SendHorizonal size={16} />
              </button>
            </form>
          </>
        )}

        {status.error && <p className="form-message error">{status.error}</p>}
        {status.success && <p className="form-message success">{status.success}</p>}
      </article>
    </section>
  );
}

export default ChatPage;

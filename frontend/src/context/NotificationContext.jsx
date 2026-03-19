import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 5000;

let toastIdCounter = 0;

function normalizeList(data) {
  return Array.isArray(data) ? data : (data.results || []);
}

export function NotificationProvider({ children }) {
  const navigate = useNavigate();
  const { isAuthenticated, tokens, user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadByThreadRef = useRef(new Map());
  const lastSeenTimestampsRef = useRef(new Map());
  const activeThreadIdRef = useRef(null);
  const initializedRef = useRef(false);

  const addToast = useCallback(({ title, message, avatar, onClick, type = 'info', duration = 3000 }) => {
    const id = ++toastIdCounter;
    const toast = { id, title, message, avatar, onClick, type, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const recalcTotal = useCallback(() => {
    let total = 0;
    unreadByThreadRef.current.forEach((v) => { total += v; });
    setUnreadCount(total);
  }, []);

  const incrementUnread = useCallback((threadId) => {
    const map = unreadByThreadRef.current;
    map.set(threadId, (map.get(threadId) || 0) + 1);
    recalcTotal();
  }, [recalcTotal]);

  const markThreadRead = useCallback((threadId) => {
    unreadByThreadRef.current.delete(threadId);
    recalcTotal();
  }, [recalcTotal]);

  const getThreadUnread = useCallback((threadId) => {
    return unreadByThreadRef.current.get(threadId) || 0;
  }, []);

  const resetUnread = useCallback(() => {
    unreadByThreadRef.current.clear();
    setUnreadCount(0);
  }, []);

  const setActiveThread = useCallback((threadId) => {
    activeThreadIdRef.current = threadId;
    if (threadId) {
      unreadByThreadRef.current.delete(threadId);
      recalcTotal();
    }
  }, [recalcTotal]);

  useEffect(() => {
    if (!isAuthenticated || !tokens.access) {
      initializedRef.current = false;
      lastSeenTimestampsRef.current.clear();
      unreadByThreadRef.current.clear();
      setUnreadCount(0);
      return;
    }

    let active = true;

    const pollThreads = async () => {
      try {
        const data = await authApi.listChatThreads(tokens.access);
        if (!active) return;

        const threads = normalizeList(data);
        const seen = lastSeenTimestampsRef.current;
        const isFirstLoad = !initializedRef.current;

        for (const thread of threads) {
          const key = thread.id;
          const prevTimestamp = seen.get(key);
          const newTimestamp = thread.last_message_at || null;

          if (isFirstLoad) {
            seen.set(key, newTimestamp);
            continue;
          }

          if (newTimestamp && newTimestamp !== prevTimestamp) {
            seen.set(key, newTimestamp);

            const isActiveThread = activeThreadIdRef.current === key;
            if (isActiveThread) continue;

            const isOwnMessage = thread.last_message_sender_id === user?.id;
            if (isOwnMessage) continue;

            incrementUnread(key);

            const senderName = thread.other_user_name || 'Yangi xabar';
            const preview = thread.last_message || 'Yangi xabar keldi';
            const targetThreadId = key;

            addToast({
              title: senderName,
              message: preview.length > 60 ? preview.slice(0, 60) + '...' : preview,
              avatar: thread.other_user_photo || null,
              type: 'chat',
              onClick: () => navigate(`/chat/${targetThreadId}`),
            });
          }
        }

        initializedRef.current = true;
      } catch {
        // Polling xatolarini jim o'tkazamiz
      }
    };

    pollThreads();
    const intervalId = window.setInterval(pollThreads, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, tokens.access, user?.id, addToast, incrementUnread, navigate]);

  const value = {
    toasts,
    addToast,
    removeToast,
    unreadCount,
    incrementUnread,
    markThreadRead,
    getThreadUnread,
    resetUnread,
    setActiveThread,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}

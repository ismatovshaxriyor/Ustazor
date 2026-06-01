import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatMessageList from '../components/chat/ChatMessageList';
import ChatComposer from '../components/chat/ChatComposer';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { resolveMediaUrl } from '../utils/media';
import {
  formatBudget,
  formatDate,
  PROPOSAL_STATUS_LABELS as proposalStatusLabels,
  normalizeListResponse as normalizeList,
} from '../utils/format';

import {
  WS_RECONNECT_DELAY_MS,
  FALLBACK_POLL_INTERVAL_MS,
  MAX_ATTACHMENT_SIZE_BYTES,
  QUICK_EMOJIS,
  VACANCY_STATUS_LABELS,
  formatMessageTime,
  formatLastSeen,
  mergeMessageLists,
  buildWsUrl,
  getOtherUserId,
  getOwnMessageState,
  splitMessageVacancyContext,
  resolveAttachmentUrl,
  isImageAttachment,
  getProposalGroupKey,
  getThreadProposalOptions
} from '../components/chat/chatUtils';

function ChatPage() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const { isAuthenticated, tokens, user } = useAuth();
  const { markThreadRead, getThreadUnread, setActiveThread } = useNotifications();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(() => (threadId ? Number(threadId) : null));
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [selectedProposalByThread, setSelectedProposalByThread] = useState({});
  const socketRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPanelRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const seenMessageIdsRef = useRef(new Set());
  const activeThreadRef = useRef(null);
  const lastReadSyncAtRef = useRef(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pendingIncomingCount, setPendingIncomingCount] = useState(0);
  const [wsRetryTick, setWsRetryTick] = useState(0);
  const [selectedVacancyKey, setSelectedVacancyKey] = useState('all');
  const [status, setStatus] = useState({
    threadsLoading: true,
    messagesLoading: false,
    sending: false,
    accepting: false,
    rejecting: false,
    error: '',
    success: '',
  });
  const [vacancyModal, setVacancyModal] = useState({
    open: false,
    loading: false,
    error: '',
    detail: null,
  });

  const isThreadNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return false;
    }
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distance < 140;
  }, []);

  const shouldMarkRead = useCallback((force = false) => {
    if (force) {
      return true;
    }
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return false;
    }
    return isThreadNearBottom();
  }, [isThreadNearBottom]);

  const markThreadReadServer = useCallback((targetThreadId, options = {}) => {
    if (!isAuthenticated || !tokens.access || !targetThreadId) {
      return;
    }
    const force = Boolean(options.force);
    if (!shouldMarkRead(force)) {
      return;
    }
    const now = Date.now();
    if (!force && now - lastReadSyncAtRef.current < 900) {
      return;
    }
    lastReadSyncAtRef.current = now;
    markThreadRead(targetThreadId);
    authApi.markChatRead(targetThreadId, tokens.access).catch(() => {});
  }, [isAuthenticated, tokens.access, markThreadRead, shouldMarkRead]);

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
        setMessages(mergeMessageLists([], normalizeList(data)));
        markThreadReadServer(activeThreadId, { force: true });
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
  }, [isAuthenticated, tokens.access, activeThreadId, markThreadReadServer]);

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
    seenMessageIdsRef.current = new Set();
    prevMessageCountRef.current = 0;
    setPendingIncomingCount(0);
    setEmojiOpen(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [activeThreadId]);

  useEffect(() => {
    if (!emojiOpen) {
      return;
    }

    const onDocumentMouseDown = (event) => {
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(event.target)) {
        setEmojiOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
    };
  }, [emojiOpen]);

  useEffect(() => {
    const newCount = messages.length;
    const oldCount = prevMessageCountRef.current;
    const seenIds = seenMessageIdsRef.current;
    const newlyAdded = [];
    messages.forEach((item) => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        newlyAdded.push(item);
      }
    });
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
        if (isNearBottom) {
          setPendingIncomingCount(0);
        }
      } else {
        setShowScrollBtn(true);
        const incomingFromOtherUser = newlyAdded.filter(
          (item) => item.sender_id && item.sender_id !== user?.id,
        ).length;
        if (incomingFromOtherUser > 0) {
          setPendingIncomingCount((prev) => prev + incomingFromOtherUser);
        }
      }
    }
  }, [messages, scrollToBottom, user?.id]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distFromBottom > 140);
      if (distFromBottom < 140) {
        setPendingIncomingCount(0);
        markThreadReadServer(activeThreadId);
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [activeThreadId, markThreadReadServer]);

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
                last_message: incoming.body || (incoming.attachment_name ? `📎 ${incoming.attachment_name}` : '📎 Fayl yuborildi'),
                last_message_at: incoming.created_at,
              }
              : thread
          )));
          if (incoming.sender_id !== user?.id) {
            markThreadReadServer(activeThreadId);
          }
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
          return;
        }

        if (payload.type === 'delivery_receipt' && payload.data) {
          const { message_id: messageId, by_user_id: byUserId, at } = payload.data;
          if (!messageId || !byUserId) {
            return;
          }
          const currentThread = activeThreadRef.current;
          setMessages((prev) => prev.map((item) => {
            if (item.id !== messageId) {
              return item;
            }
            if (byUserId === currentThread?.client_id) {
              return { ...item, delivered_to_client_at: at || item.delivered_to_client_at };
            }
            if (byUserId === currentThread?.worker_id) {
              return { ...item, delivered_to_worker_at: at || item.delivered_to_worker_at };
            }
            return item;
          }));
          return;
        }

        if (payload.type === 'read_receipt' && payload.data) {
          const { message_id: messageId, by_user_id: byUserId, at } = payload.data;
          if (!messageId || !byUserId) {
            return;
          }
          const currentThread = activeThreadRef.current;
          setMessages((prev) => prev.map((item) => {
            if (item.id > messageId) {
              return item;
            }
            if (byUserId === currentThread?.client_id) {
              return {
                ...item,
                delivered_to_client_at: at || item.delivered_to_client_at,
                read_by_client_at: at || item.read_by_client_at,
              };
            }
            if (byUserId === currentThread?.worker_id) {
              return {
                ...item,
                delivered_to_worker_at: at || item.delivered_to_worker_at,
                read_by_worker_at: at || item.read_by_worker_at,
              };
            }
            return item;
          }));
          return;
        }

        if (payload.type === 'presence_update' && payload.data) {
          const { user_id: updatedUserId, is_online: isOnline, last_seen_at: lastSeenAt } = payload.data;
          if (!updatedUserId) {
            return;
          }
          setThreads((prev) => prev.map((thread) => {
            const otherId = getOtherUserId(thread, user?.id);
            if (otherId !== updatedUserId) {
              return thread;
            }
            return {
              ...thread,
              other_user_online: Boolean(isOnline),
              other_user_last_seen_at: lastSeenAt || thread.other_user_last_seen_at,
            };
          }));
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
  }, [isAuthenticated, tokens.access, activeThreadId, wsRetryTick, user?.id, markThreadReadServer]);

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
        markThreadReadServer(activeThreadId);
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
  }, [isAuthenticated, tokens.access, activeThreadId, socketConnected, markThreadReadServer]);

  const activeThread = useMemo(
    () => threads.find((item) => item.id === activeThreadId) || null,
    [threads, activeThreadId],
  );
  const vacancyGroups = useMemo(() => {
    const map = new Map();

    threads.forEach((thread) => {
      const options = getThreadProposalOptions(thread);
      options.forEach((option) => {
        const key = getProposalGroupKey(option);
        if (!key) {
          return;
        }
        const existing = map.get(key);
        const lastTimestamp = Date.parse(thread.last_message_at || '') || 0;
        if (existing) {
          existing.threadIds.add(thread.id);
          existing.lastMessageTimestamp = Math.max(existing.lastMessageTimestamp, lastTimestamp);
          return;
        }
        map.set(key, {
          key,
          vacancyId: option.vacancy_id || null,
          title: option.vacancy_title || thread.vacancy_title || 'E`lon ko`rsatilmagan',
          status: option.status || null,
          threadIds: new Set([thread.id]),
          lastMessageTimestamp: lastTimestamp,
        });
      });
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        threadCount: item.threadIds.size,
        threadIds: Array.from(item.threadIds),
      }))
      .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  }, [threads]);

  const filteredThreads = useMemo(() => {
    if (selectedVacancyKey === 'all') {
      return threads;
    }
    const selectedGroup = vacancyGroups.find((item) => item.key === selectedVacancyKey);
    if (!selectedGroup) {
      return threads;
    }
    const idSet = new Set(selectedGroup.threadIds);
    return threads.filter((thread) => idSet.has(thread.id));
  }, [threads, vacancyGroups, selectedVacancyKey]);

  useEffect(() => {
    if (selectedVacancyKey === 'all') {
      return;
    }
    const exists = vacancyGroups.some((item) => item.key === selectedVacancyKey);
    if (!exists) {
      setSelectedVacancyKey('all');
    }
  }, [vacancyGroups, selectedVacancyKey]);

  useEffect(() => {
    if (filteredThreads.length === 0) {
      setActiveThreadId(null);
      setMessages([]);
      return;
    }
    if (activeThreadId && filteredThreads.some((thread) => thread.id === activeThreadId)) {
      return;
    }
    const nextThread = filteredThreads[0];
    if (!nextThread) {
      return;
    }
    setActiveThreadId(nextThread.id);
    setActiveThread(nextThread.id);
    navigate(`/chat/${nextThread.id}`, { replace: true });
  }, [filteredThreads, activeThreadId, navigate, setActiveThread]);

  const activeProposalOptions = useMemo(
    () => getThreadProposalOptions(activeThread),
    [activeThread],
  );
  const selectedProposal = useMemo(() => {
    if (!activeThreadId) {
      return null;
    }
    const selectedId = selectedProposalByThread[activeThreadId];
    if (selectedId) {
      const selected = activeProposalOptions.find((item) => item.id === selectedId);
      if (selected) {
        return selected;
      }
    }
    if (activeThread?.proposal_id) {
      const fallback = activeProposalOptions.find((item) => item.id === activeThread.proposal_id);
      if (fallback) {
        return fallback;
      }
    }
    return activeProposalOptions[0] || null;
  }, [activeThreadId, activeThread, activeProposalOptions, selectedProposalByThread]);
  const selectedVacancyTitle = selectedProposal?.vacancy_title || activeThread?.vacancy_title || 'E`lon ko`rsatilmagan';
  const selectedVacancyId = selectedProposal?.vacancy_id || activeThread?.vacancy_id || null;
  const selectedProposalStatus = selectedProposal?.status || activeThread?.proposal_status || null;
  const canHandleSelectedProposal = Boolean(
    user?.user_type === 'client'
      && selectedProposal
      && selectedProposal.status === 'pending',
  );
  const canShowDecisionActions = selectedProposal ? canHandleSelectedProposal : Boolean(activeThread?.can_accept);

  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  useEffect(() => {
    if (!activeThreadId || activeProposalOptions.length === 0) {
      return;
    }
    const selectedId = selectedProposalByThread[activeThreadId];
    const exists = selectedId ? activeProposalOptions.some((item) => item.id === selectedId) : false;
    if (exists) {
      return;
    }
    const fallbackId = activeThread?.proposal_id || activeProposalOptions[0].id;
    if (!fallbackId) {
      return;
    }
    setSelectedProposalByThread((prev) => ({ ...prev, [activeThreadId]: fallbackId }));
  }, [activeThreadId, activeThread, activeProposalOptions, selectedProposalByThread]);

  useEffect(() => {
    if (selectedVacancyKey === 'all' || !activeThreadId || !activeThread) {
      return;
    }
    const options = getThreadProposalOptions(activeThread);
    const matched = options.find((option) => getProposalGroupKey(option) === selectedVacancyKey);
    if (!matched?.id) {
      return;
    }
    setSelectedProposalByThread((prev) => (
      prev[activeThreadId] === matched.id ? prev : { ...prev, [activeThreadId]: matched.id }
    ));
  }, [selectedVacancyKey, activeThreadId, activeThread]);

  const openThread = (thread) => {
    if (!thread?.id) {
      return;
    }
    setActiveThreadId(thread.id);
    setActiveThread(thread.id);
    navigate(`/chat/${thread.id}`);
    if (selectedVacancyKey !== 'all') {
      const options = getThreadProposalOptions(thread);
      const matched = options.find((option) => getProposalGroupKey(option) === selectedVacancyKey);
      if (matched?.id) {
        setSelectedProposalByThread((prev) => ({ ...prev, [thread.id]: matched.id }));
      }
    }
    setPendingIncomingCount(0);
    markThreadReadServer(thread.id, { force: true });
    setStatus((prev) => ({ ...prev, error: '', success: '' }));
  };

  const onSelectVacancyFilter = (groupKey) => {
    setSelectedVacancyKey(groupKey);
    setStatus((prev) => ({ ...prev, error: '', success: '' }));
  };

  const onPickAttachment = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setStatus((prev) => ({
        ...prev,
        error: 'Fayl hajmi 15 MB dan oshmasligi kerak.',
      }));
      event.target.value = '';
      return;
    }
    setSelectedFile(file);
    setStatus((prev) => ({ ...prev, error: '' }));
  };

  const removeAttachment = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onInsertEmoji = (emoji) => {
    setDraft((prev) => `${prev}${emoji}`);
  };

  const onSendMessage = async (event) => {
    event.preventDefault();
    if (!activeThreadId || (!draft.trim() && !selectedFile)) {
      return;
    }

    setStatus((prev) => ({ ...prev, sending: true, error: '', success: '' }));

    try {
      const text = draft.trim();
      const shouldAttachVacancyContext = (
        selectedVacancyKey === 'all'
        && activeProposalOptions.length > 1
        && selectedProposal?.vacancy_title
      );
      const preparedText = shouldAttachVacancyContext
        ? `E\`lon: ${selectedProposal.vacancy_title}\n${text}`
        : text;
      const ws = socketRef.current;
      const withAttachment = Boolean(selectedFile);

      if (!withAttachment && socketConnected && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', body: preparedText }));
      } else {
        let sent;
        if (withAttachment) {
          const formData = new FormData();
          formData.append('body', preparedText);
          formData.append('attachment', selectedFile);
          sent = await authApi.sendChatMessage(activeThreadId, formData, tokens.access);
        } else {
          sent = await authApi.sendChatMessage(activeThreadId, { body: preparedText }, tokens.access);
        }

        setMessages((prev) => mergeMessageLists(prev, [sent]));
        setThreads((prev) => prev.map((thread) => (
          thread.id === activeThreadId
            ? {
              ...thread,
              last_message: sent.body || (sent.attachment_name ? `📎 ${sent.attachment_name}` : '📎 Fayl yuborildi'),
              last_message_at: sent.created_at,
            }
            : thread
        )));
      }
      setDraft('');
      setEmojiOpen(false);
      removeAttachment();
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
    if (!activeThreadId || !canShowDecisionActions) {
      return;
    }

    setStatus((prev) => ({ ...prev, accepting: true, error: '', success: '' }));
    try {
      await authApi.acceptChatWorker(activeThreadId, tokens.access, selectedProposal?.id || null);
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
    if (!activeThreadId || !canShowDecisionActions) {
      return;
    }

    setStatus((prev) => ({ ...prev, rejecting: true, error: '', success: '' }));
    try {
      await authApi.rejectChatWorker(activeThreadId, tokens.access, selectedProposal?.id || null);
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

  const openVacancyModal = async () => {
    if (!selectedVacancyId) {
      return;
    }

    setVacancyModal({
      open: true,
      loading: true,
      error: '',
      detail: null,
    });

    try {
      const detail = await authApi.getPublicVacancy(selectedVacancyId, tokens?.access || null);
      setVacancyModal({
        open: true,
        loading: false,
        error: '',
        detail,
      });
    } catch (error) {
      setVacancyModal({
        open: true,
        loading: false,
        error: error.message || 'E`lon ma`lumotini yuklab bo`lmadi.',
        detail: null,
      });
    }
  };

  const closeVacancyModal = () => {
    setVacancyModal((prev) => ({ ...prev, open: false, loading: false }));
  };

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  const otherOnline = Boolean(activeThread?.other_user_online);
  const otherLastSeen = activeThread?.other_user_last_seen_at || null;

  return (
    <section className="chat-shell reveal-up">
      <ChatSidebar
        threadsLoading={status.threadsLoading}
        threads={threads}
        vacancyGroups={vacancyGroups}
        selectedVacancyKey={selectedVacancyKey}
        filteredThreads={filteredThreads}
        activeThreadId={activeThreadId}
        onSelectVacancyFilter={onSelectVacancyFilter}
        openThread={openThread}
      />

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
                {selectedProposalStatus && (
                  <span className={`status-pill status-${selectedProposalStatus}`}>
                    {proposalStatusLabels[selectedProposalStatus] || selectedProposalStatus}
                  </span>
                )}
              </div>
              <p className="muted chat-header-vacancy">{selectedVacancyTitle}</p>
              {(selectedVacancyKey === 'all' && activeProposalOptions.length > 1) && (
                <div className="chat-proposal-tabs">
                  {activeProposalOptions.map((proposal) => (
                    <button
                      key={proposal.id}
                      type="button"
                      className={`chat-proposal-chip${selectedProposal?.id === proposal.id ? ' chat-proposal-chip-active' : ''}`}
                      onClick={() => {
                        setSelectedProposalByThread((prev) => ({ ...prev, [activeThreadId]: proposal.id }));
                        setStatus((prev) => ({ ...prev, error: '', success: '' }));
                      }}
                    >
                      <span>{proposal.vacancy_title || "Noma'lum e`lon"}</span>
                      <span className={`status-pill status-${proposal.status}`}>
                        {proposalStatusLabels[proposal.status] || proposal.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="chat-header-actions">
                {selectedVacancyId ? (
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={openVacancyModal}
                    disabled={vacancyModal.loading}
                  >
                    {vacancyModal.loading ? 'Yuklanmoqda...' : 'E`lonni ochish'}
                  </button>
                ) : null}
                {user?.user_type === 'client'
                  && activeThread.other_user_type === 'worker'
                  && activeThread.other_user_worker_profile_id ? (
                    <Link className="button button-ghost" to={`/masters/${activeThread.other_user_worker_profile_id}`}>
                      Usta profilini ko`rish
                    </Link>
                  ) : null}
                {canShowDecisionActions && (
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

            <ChatMessageList
              messagesLoading={status.messagesLoading}
              messages={messages}
              user={user}
              activeThread={activeThread}
              messagesContainerRef={messagesContainerRef}
            />

            {showScrollBtn && (
              <button
                type="button"
                className="chat-scroll-btn"
                onClick={() => {
                  scrollToBottom('instant');
                  setShowScrollBtn(false);
                  setPendingIncomingCount(0);
                  markThreadReadServer(activeThreadId, { force: true });
                }}
                aria-label="Pastga tushish"
              >
                <ChevronDown size={20} />
                {pendingIncomingCount > 0 ? (
                  <span className="chat-scroll-count">{pendingIncomingCount > 99 ? '99+' : pendingIncomingCount}</span>
                ) : null}
              </button>
            )}

            <ChatComposer
              selectedFile={selectedFile}
              removeAttachment={removeAttachment}
              emojiOpen={emojiOpen}
              emojiPanelRef={emojiPanelRef}
              setEmojiOpen={setEmojiOpen}
              onInsertEmoji={onInsertEmoji}
              onSendMessage={onSendMessage}
              fileInputRef={fileInputRef}
              onPickAttachment={onPickAttachment}
              draft={draft}
              setDraft={setDraft}
              sending={status.sending}
            />
          </>
        )}

        {status.error && <p className="form-message error">{status.error}</p>}
        {status.success && <p className="form-message success">{status.success}</p>}
      </article>

      {vacancyModal.open && (
        <div className="modal-backdrop" onClick={closeVacancyModal} role="presentation">
          <article className="modal-card card chat-vacancy-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>E`lon tafsiloti</h3>
              <button type="button" className="button button-ghost" onClick={closeVacancyModal}>
                Yopish
              </button>
            </div>

            {vacancyModal.loading ? (
              <p className="muted">E`lon ma`lumotlari yuklanmoqda...</p>
            ) : vacancyModal.error ? (
              <p className="form-message error">{vacancyModal.error}</p>
            ) : vacancyModal.detail ? (
              <div className="stack-small chat-vacancy-content">
                <p className="pill">{vacancyModal.detail.category || 'Boshqa yo`nalish'}</p>
                <h3>{vacancyModal.detail.title}</h3>
                <p>{vacancyModal.detail.description || 'Tavsif kiritilmagan.'}</p>

                <div className="chat-vacancy-grid">
                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Shahar</p>
                    <p className="chat-vacancy-item-value">{vacancyModal.detail.city || 'Kiritilmagan'}</p>
                  </div>
                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Narx</p>
                    <p className="chat-vacancy-item-value">{formatBudget(vacancyModal.detail)}</p>
                  </div>
                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Holat</p>
                    <p className="chat-vacancy-item-value">
                      {VACANCY_STATUS_LABELS[vacancyModal.detail.status] || vacancyModal.detail.status || 'Noma`lum'}
                    </p>
                  </div>
                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Muddat</p>
                    <p className="chat-vacancy-item-value">
                      {vacancyModal.detail.due_date ? formatDate(vacancyModal.detail.due_date) : 'Kelishiladi'}
                    </p>
                  </div>
                </div>

                {vacancyModal.detail.address && (
                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Manzil</p>
                    <p className="chat-vacancy-item-value">{vacancyModal.detail.address}</p>
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="button button-primary" onClick={closeVacancyModal}>
                    Yopish
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted">E`lon topilmadi.</p>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

export default ChatPage;

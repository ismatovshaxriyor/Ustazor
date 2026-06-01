const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
const ACCESS_KEY = 'ustazor_access';
const REFRESH_KEY = 'ustazor_refresh';
let authRedirectLocked = false;

const FIELD_LABELS = {
  email: 'Email',
  phone_number: 'Telefon raqami',
  secondary_phone_number: "Qo'shimcha telefon",
  telegram_username: 'Telegram username',
  instagram_username: 'Instagram username',
  full_name: 'To`liq ism',
  profile_photo: 'Profil rasmi',
  title: 'Sarlavha',
  description: 'Tavsif',
  specialization: 'Mutaxassislik',
  experience_years: 'Tajriba',
  min_order_price: 'Minimal narx',
  min_price: 'Minimal narx',
  max_price: 'Maksimal narx',
  extra_info: "Qo'shimcha ma'lumot",
  is_active: 'Faollik',
  price_type: 'Narx turi',
  price_amount: 'Narx',
  password: 'Parol',
  user_type: 'Foydalanuvchi turi',
  code: 'Kod',
  category: "Yo'nalish",
  city: 'Shahar',
  address: 'Manzil',
  due_date: 'Muddat',
  cover_letter: 'Murojaat xati',
  proposed_price: 'Taklif narxi',
  rating: 'Baho',
  comment: 'Izoh',
  images: 'Rasmlar',
  location: 'Hudud',
};

function toMessage(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toMessage).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    if (typeof value.detail === 'string') {
      return value.detail;
    }

    if (typeof value.message === 'string') {
      return value.message;
    }

    return Object.entries(value)
      .map(([field, fieldValue]) => {
        const message = toMessage(fieldValue);

        if (!message) {
          return '';
        }

        if (field === 'non_field_errors' || field === 'detail') {
          return message;
        }

        const label = FIELD_LABELS[field] || field.replaceAll('_', ' ');
        return `${label}: ${message}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function handleUnauthorizedAuth() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // localStorage bo`lmagan holatlarni jim o'tkazamiz.
  }

  if (authRedirectLocked) {
    return;
  }
  authRedirectLocked = true;

  const currentPath = window.location.pathname || '';
  if (!currentPath.startsWith('/auth/')) {
    window.location.assign('/auth/login');
  }
}

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Server bilan bog`lanib bo`lmadi. Internet yoki backendni tekshiring.');
  }

  let data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const hasAuthHeader = Boolean(headers.Authorization || headers.authorization);
    
    if (response.status === 401 && hasAuthHeader && path !== '/api/token/refresh/') {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      
      if (!refreshToken) {
        handleUnauthorizedAuth();
        throw new Error('Sessiya tugadi. Qayta tizimga kiring.');
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
          });
          
          if (!refreshRes.ok) {
            throw new Error('Refresh failed');
          }
          
          const refreshData = await refreshRes.json();
          const newAccess = refreshData.access;
          const newRefresh = refreshData.refresh || refreshToken;
          
          localStorage.setItem(ACCESS_KEY, newAccess);
          localStorage.setItem(REFRESH_KEY, newRefresh);
          
          // Notify AuthContext to update its state
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ustazor:token_refreshed', { 
              detail: { access: newAccess, refresh: newRefresh } 
            }));
          }
          
          isRefreshing = false;
          onRefreshed(newAccess);
        } catch (err) {
          isRefreshing = false;
          refreshSubscribers = [];
          handleUnauthorizedAuth();
          throw new Error('Sessiya tugadi. Qayta tizimga kiring.');
        }
      }

      // Wait for refresh to complete
      const newAccessToken = await new Promise((resolve) => {
        subscribeTokenRefresh((token) => resolve(token));
      });

      // Retry request
      headers.Authorization = `Bearer ${newAccessToken}`;
      try {
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers,
        });
        data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
          throw new Error(toMessage(data) || 'So`rov bajarilmadi.');
        }
        return data;
      } catch (retryErr) {
        throw new Error(retryErr.message || 'Server bilan bog`lanib bo`lmadi.');
      }
    }

    const message = toMessage(data) || 'So`rov bajarilmadi.';
    throw new Error(message);
  }

  return data;
}

export const authApi = {
  exchangeClerk(payload, clerkToken) {
    return request('/api/auth/clerk/exchange/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  login(credentials) {
    return request('/api/token/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  register(payload) {
    return request('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  verifyEmail(payload) {
    return request('/api/auth/verify-email/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  resendActivation(payload) {
    return request('/api/auth/resend-activation/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  me(accessToken) {
    return request('/api/auth/me/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  updateMe(payload, accessToken) {
    const body = payload instanceof FormData ? payload : JSON.stringify(payload);

    return request('/api/auth/me/', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    });
  },
  deleteMe(accessToken) {
    return request('/api/auth/me/', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  workerProfile(accessToken) {
    return request('/api/auth/worker-profile/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  updateWorkerProfile(payload, accessToken) {
    return request('/api/auth/worker-profile/', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  workerSkills(accessToken) {
    return request('/api/auth/worker-skills/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  createWorkerSkill(payload, accessToken) {
    return request('/api/auth/worker-skills/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  updateWorkerSkill(id, payload, accessToken) {
    return request(`/api/auth/worker-skills/${id}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  deleteWorkerSkill(id, accessToken) {
    return request(`/api/auth/worker-skills/${id}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  workerDashboard(accessToken) {
    return request('/api/auth/worker-dashboard/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  listOrders(accessToken, status = '') {
    const params = new URLSearchParams();
    if (status) {
      params.set('status', status);
    }
    const query = params.toString();

    return request(`/api/orders/${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  createOrder(payload, accessToken) {
    return request('/api/orders/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  updateOrder(id, payload, accessToken) {
    return request(`/api/orders/${id}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  closeOrder(id, accessToken) {
    return request(`/api/orders/${id}/close/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });
  },
  listPublicWorkers(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        query.set(key, `${value}`.trim());
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/workers/${suffix}`, { method: 'GET' });
  },
  getPublicWorker(id, accessToken = null) {
    const headers = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return request(`/api/workers/${id}/`, {
      method: 'GET',
      headers,
    });
  },
  listPublicVacancies(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        query.set(key, `${value}`.trim());
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/vacancies/${suffix}`, { method: 'GET' });
  },
  getPublicVacancy(id, accessToken = null) {
    const headers = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return request(`/api/vacancies/${id}/`, {
      method: 'GET',
      headers,
    });
  },
  applyToVacancy(id, payload, accessToken) {
    return request(`/api/vacancies/${id}/apply/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  listMyProposals(accessToken) {
    return request('/api/proposals/my/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  listReceivedProposals(accessToken, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        query.set(key, `${value}`.trim());
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/proposals/received/${suffix}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  updateProposalStatus(id, status, accessToken) {
    return request(`/api/proposals/${id}/status/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status }),
    });
  },
  listChatThreads(accessToken) {
    return request('/api/chat/threads/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  startChatThread(payload, accessToken) {
    return request('/api/chat/threads/start/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  listChatMessages(threadId, accessToken) {
    return request(`/api/chat/threads/${threadId}/messages/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  sendChatMessage(threadId, payload, accessToken) {
    const body = payload instanceof FormData ? payload : JSON.stringify(payload);
    return request(`/api/chat/threads/${threadId}/messages/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    });
  },
  markChatRead(threadId, accessToken) {
    return request(`/api/chat/threads/${threadId}/read/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });
  },
  acceptChatWorker(threadId, accessToken, proposalId = null) {
    const payload = {};
    if (proposalId) {
      payload.proposal_id = proposalId;
    }
    return request(`/api/chat/threads/${threadId}/accept-worker/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  rejectChatWorker(threadId, accessToken, proposalId = null) {
    const payload = {};
    if (proposalId) {
      payload.proposal_id = proposalId;
    }
    return request(`/api/chat/threads/${threadId}/reject-worker/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  createOrderReview(orderId, payload, accessToken) {
    const body = payload instanceof FormData ? payload : JSON.stringify(payload);
    return request(`/api/reviews/orders/${orderId}/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    });
  },
  listPublicWorkerReviews(workerId) {
    return request(`/api/reviews/workers/${workerId}/`, {
      method: 'GET',
    });
  },
  listMyPortfolio(accessToken) {
    return request('/api/reviews/portfolio/my/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  createPortfolio(payload, accessToken) {
    const body = payload instanceof FormData ? payload : JSON.stringify(payload);
    return request('/api/reviews/portfolio/my/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    });
  },
  updatePortfolio(id, payload, accessToken) {
    const body = payload instanceof FormData ? payload : JSON.stringify(payload);
    return request(`/api/reviews/portfolio/my/${id}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    });
  },
  deletePortfolio(id, accessToken) {
    return request(`/api/reviews/portfolio/my/${id}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  listPublicWorkerPortfolio(workerId) {
    return request(`/api/reviews/portfolio/workers/${workerId}/`, {
      method: 'GET',
    });
  },
};

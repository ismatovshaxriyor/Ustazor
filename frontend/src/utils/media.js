const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

function defaultProfileUrl(userType = 'client') {
  const imageName = userType === 'worker' ? 'default_worker.png' : 'default_client.png';
  return `${API_BASE_URL}/static/image/${imageName}`;
}

export function resolveMediaUrl(value, options = {}) {
  const fallbackUserType = options.userType || 'client';

  if (!value) {
    return defaultProfileUrl(fallbackUserType);
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

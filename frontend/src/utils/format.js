export const STATUS_LABELS = {
  open: 'Yangi',
  in_progress: 'Jarayonda',
  completed: 'Yakunlangan',
  cancelled: 'Bekor qilingan',
};

export const PROPOSAL_STATUS_LABELS = {
  pending: 'Kutilmoqda',
  accepted: 'Qabul qilingan',
  rejected: 'Rad etilgan',
  withdrawn: 'Bekor qilingan',
};

export function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Kelishiladi';
  }
  return `${amount.toLocaleString('uz-UZ')} so'mdan`;
}

export function formatBudget(vacancy) {
  if (vacancy.price_type === 'negotiable') {
    return 'Kelishiladi';
  }

  const amount = Number(vacancy.price_amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Aniq narx';
  }

  return `${amount.toLocaleString('uz-UZ')} so'm`;
}

export function formatSkillPrice(skill) {
  const min = Number(skill.min_price || 0);
  const max = Number(skill.max_price || 0);

  if (min > 0 && max > 0) {
    return `${min.toLocaleString('uz-UZ')} - ${max.toLocaleString('uz-UZ')} so'm`;
  }
  if (min > 0) {
    return `${min.toLocaleString('uz-UZ')} so'mdan`;
  }
  return 'Kelishiladi';
}

export function formatDate(value) {
  if (!value) {
    return 'Sana ko`rsatilmagan';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('uz-UZ');
}

export function normalizeListResponse(data) {
  return Array.isArray(data) ? data : (data.results || []);
}

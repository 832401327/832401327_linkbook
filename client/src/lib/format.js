export const METHOD_LABELS = {
  phone: '电话',
  email: '邮箱',
  wechat: '微信',
  qq: 'QQ',
  address: '地址',
  website: '网站',
  other: '其他',
};

export const METHOD_TYPES = Object.keys(METHOD_LABELS);

export const AVATAR_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#db2777',
  '#16a34a',
  '#f59e0b',
  '#7c3aed',
  '#dc2626',
  '#0f766e',
  '#2563eb',
  '#9333ea',
];

export function initials(name = '') {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (/[\u3400-\u9fff]/.test(trimmed)) return trimmed.slice(0, 2);
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function tint(hex, alpha = 0.14) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!match) return `rgba(99, 102, 241, ${alpha})`;
  const value = Number.parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function primaryMethod(contact) {
  return contact.methods.find((method) => method.isPrimary) ?? contact.methods[0] ?? null;
}

export function cloneForEdit(contact) {
  return {
    name: contact?.name ?? '',
    company: contact?.company ?? '',
    title: contact?.title ?? '',
    notes: contact?.notes ?? '',
    color: contact?.color ?? AVATAR_COLORS[0],
    isBookmarked: Boolean(contact?.isBookmarked),
    methods: (contact?.methods ?? []).map((method) => ({ ...method })),
  };
}

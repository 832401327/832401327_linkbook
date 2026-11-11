export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options,
  });
  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  const payload = isJson ? await response.json() : null;
  if (!response.ok) {
    throw new ApiError(payload?.error ?? `请求失败（${response.status}）`, response.status, payload?.details);
  }
  return payload;
}

export const api = {
  listContacts({ q = '', bookmarked = false, sort = 'name' } = {}) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (bookmarked) params.set('bookmarked', '1');
    params.set('sort', sort);
    return request(`/api/contacts?${params}`);
  },
  getContact(id) {
    return request(`/api/contacts/${id}`);
  },
  createContact(payload) {
    return request('/api/contacts', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateContact(id, payload) {
    return request(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  setBookmark(id, isBookmarked) {
    return request(`/api/contacts/${id}/bookmark`, {
      method: 'PATCH',
      body: JSON.stringify({ isBookmarked }),
    });
  },
  deleteContact(id) {
    return request(`/api/contacts/${id}`, { method: 'DELETE' });
  },
  stats() {
    return request('/api/stats');
  },
  async importFile(file) {
    const body = new FormData();
    body.append('file', file);
    return request('/api/import', { method: 'POST', body });
  },
};

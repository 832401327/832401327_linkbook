import { db, transaction } from './db.js';

export const METHOD_TYPES = ['phone', 'email', 'wechat', 'qq', 'address', 'website', 'other'];

const MAX_METHODS = 40;
const TYPE_SET = new Set(METHOD_TYPES);

export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Contact not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

function text(value, max, field) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  return trimmed;
}

function normalizeColor(value) {
  if (!value) return '#6366f1';
  const match = /^#([0-9a-f]{6})$/i.exec(String(value).trim());
  return match ? `#${match[1].toLowerCase()}` : '#6366f1';
}

function normalizeMethods(input) {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) throw new ValidationError('methods must be an array');
  if (input.length > MAX_METHODS) throw new ValidationError(`A contact can have at most ${MAX_METHODS} contact methods`);

  const methods = input.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new ValidationError(`methods[${index}] must be an object`);
    const type = String(raw.type ?? 'other').toLowerCase();
    if (!TYPE_SET.has(type)) throw new ValidationError(`methods[${index}].type "${type}" is not supported`);
    const value = text(raw.value, 300, `methods[${index}].value`);
    if (!value) throw new ValidationError(`methods[${index}].value is required`);
    return {
      type,
      label: text(raw.label, 40, `methods[${index}].label`),
      value,
      isPrimary: Boolean(raw.isPrimary),
      position: index,
    };
  });

  if (methods.length && !methods.some((m) => m.isPrimary)) methods[0].isPrimary = true;
  return methods;
}

export function normalizeContact(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== 'object') throw new ValidationError('Contact payload is required');

  const name = payload.name === undefined && partial ? undefined : text(payload.name, 80, 'name');
  if (!partial && !name) throw new ValidationError('name is required');

  const contact = { name };
  for (const [field, max] of [['company', 120], ['title', 120], ['notes', 2000]]) {
    if (payload[field] !== undefined || !partial) contact[field] = text(payload[field], max, field);
  }
  if (payload.color !== undefined || !partial) contact.color = normalizeColor(payload.color);
  if (payload.isBookmarked !== undefined || !partial) contact.isBookmarked = Boolean(payload.isBookmarked);

  const methods = normalizeMethods(payload.methods);
  if (methods !== undefined) contact.methods = methods;
  return contact;
}

function hydrate(rows) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(',');
  const methodRows = db
    .prepare(
      `SELECT id, contact_id, type, label, value, is_primary, position
         FROM contact_methods
        WHERE contact_id IN (${placeholders})
        ORDER BY position, id`,
    )
    .all(...ids);

  const byContact = new Map();
  for (const row of methodRows) {
    const list = byContact.get(row.contact_id) ?? [];
    list.push({
      id: row.id,
      type: row.type,
      label: row.label,
      value: row.value,
      isPrimary: Boolean(row.is_primary),
    });
    byContact.set(row.contact_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company,
    title: row.title,
    notes: row.notes,
    color: row.color,
    isBookmarked: Boolean(row.is_bookmarked),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    methods: byContact.get(row.id) ?? [],
  }));
}

export function listContacts({ q = '', bookmarked = false, sort = 'name' } = {}) {
  const where = [];
  const params = [];

  if (q) {
    const like = `%${q}%`;
    where.push(`(c.name LIKE ? OR c.company LIKE ? OR c.title LIKE ? OR c.notes LIKE ?
      OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.value LIKE ?))`);
    params.push(like, like, like, like, like);
  }
  if (bookmarked) where.push('c.is_bookmarked = 1');

  const order = sort === 'recent' ? 'c.updated_at DESC, c.id DESC' : 'c.name COLLATE NOCASE ASC, c.id ASC';
  const rows = db
    .prepare(`SELECT c.* FROM contacts c ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}`)
    .all(...params);
  return hydrate(rows);
}

export function getContact(id) {
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(Number(id));
  if (!row) throw new NotFoundError();
  return hydrate([row])[0];
}

export function getStats() {
  const total = db.prepare('SELECT COUNT(*) AS n FROM contacts').get().n;
  const bookmarked = db.prepare('SELECT COUNT(*) AS n FROM contacts WHERE is_bookmarked = 1').get().n;
  const methods = db.prepare('SELECT COUNT(*) AS n FROM contact_methods').get().n;
  return { total, bookmarked, methods };
}

export function createContact(payload) {
  const contact = normalizeContact(payload);
  const methods = contact.methods ?? [];

  return transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO contacts (name, company, title, notes, color, is_bookmarked)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        contact.name,
        contact.company ?? '',
        contact.title ?? '',
        contact.notes ?? '',
        contact.color,
        contact.isBookmarked ? 1 : 0,
      );
    const id = Number(result.lastInsertRowid);
    const insertMethod = db.prepare(
      'INSERT INTO contact_methods (contact_id, type, label, value, is_primary, position) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const method of methods) {
      insertMethod.run(id, method.type, method.label, method.value, method.isPrimary ? 1 : 0, method.position);
    }
    return getContact(id);
  });
}

export function updateContact(id, payload) {
  const existing = getContact(id);
  const contact = normalizeContact(payload, { partial: true });

  return transaction(() => {
    const next = {
      name: contact.name ?? existing.name,
      company: contact.company ?? existing.company,
      title: contact.title ?? existing.title,
      notes: contact.notes ?? existing.notes,
      color: contact.color ?? existing.color,
      isBookmarked: contact.isBookmarked ?? existing.isBookmarked,
    };
    db.prepare(
      `UPDATE contacts
          SET name = ?, company = ?, title = ?, notes = ?, color = ?, is_bookmarked = ?, updated_at = datetime('now')
        WHERE id = ?`,
    ).run(next.name, next.company, next.title, next.notes, next.color, next.isBookmarked ? 1 : 0, existing.id);

    if (contact.methods !== undefined) {
      db.prepare('DELETE FROM contact_methods WHERE contact_id = ?').run(existing.id);
      const insertMethod = db.prepare(
        'INSERT INTO contact_methods (contact_id, type, label, value, is_primary, position) VALUES (?, ?, ?, ?, ?, ?)',
      );
      for (const method of contact.methods) {
        insertMethod.run(existing.id, method.type, method.label, method.value, method.isPrimary ? 1 : 0, method.position);
      }
    }
    return getContact(existing.id);
  });
}

export function setBookmark(id, isBookmarked) {
  const existing = getContact(id);
  db.prepare("UPDATE contacts SET is_bookmarked = ?, updated_at = datetime('now') WHERE id = ?").run(
    isBookmarked ? 1 : 0,
    existing.id,
  );
  return getContact(existing.id);
}

export function deleteContact(id) {
  const existing = getContact(id);
  db.prepare('DELETE FROM contacts WHERE id = ?').run(existing.id);
  return { deleted: true, id: existing.id };
}

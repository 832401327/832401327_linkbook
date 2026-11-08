import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.LINKBOOK_DATA_DIR ?? join(here, '..', 'data');
export const DB_FILE = process.env.LINKBOOK_DB ?? join(DATA_DIR, 'linkbook.db');

mkdirSync(dirname(DB_FILE), { recursive: true });

export const db = new DatabaseSync(DB_FILE);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS contacts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    company       TEXT    NOT NULL DEFAULT '',
    title         TEXT    NOT NULL DEFAULT '',
    notes         TEXT    NOT NULL DEFAULT '',
    color         TEXT    NOT NULL DEFAULT '#6366f1',
    is_bookmarked INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_methods (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    type       TEXT    NOT NULL,
    label      TEXT    NOT NULL DEFAULT '',
    value      TEXT    NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    position   INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_methods_contact ON contact_methods(contact_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_bookmarked ON contacts(is_bookmarked);
`);

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function closeDb() {
  db.close();
}

import express from 'express';
import multer from 'multer';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NotFoundError,
  ValidationError,
  createContact,
  deleteContact,
  getContact,
  getStats,
  listContacts,
  setBookmark,
  updateContact,
} from './contacts.js';
import { readContactsWorkbook, writeContactsWorkbook, writeTemplateWorkbook } from './excel.js';

const here = dirname(fileURLToPath(import.meta.url));
const clientDist = join(here, '..', '..', 'client', 'dist');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/stats', (req, res) => res.json(getStats()));

  app.get('/api/contacts', (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const bookmarked = req.query.bookmarked === '1' || req.query.bookmarked === 'true';
    const sort = req.query.sort === 'recent' ? 'recent' : 'name';
    res.json({ contacts: listContacts({ q, bookmarked, sort }) });
  });

  app.get('/api/contacts/:id', (req, res) => res.json(getContact(req.params.id)));

  app.post('/api/contacts', (req, res) => {
    res.status(201).json(createContact(req.body));
  });

  app.put('/api/contacts/:id', (req, res) => res.json(updateContact(req.params.id, req.body)));

  app.patch('/api/contacts/:id/bookmark', (req, res) => {
    if (typeof req.body?.isBookmarked !== 'boolean') {
      throw new ValidationError('isBookmarked must be a boolean');
    }
    res.json(setBookmark(req.params.id, req.body.isBookmarked));
  });

  app.delete('/api/contacts/:id', (req, res) => res.json(deleteContact(req.params.id)));

  app.get('/api/export', async (req, res, next) => {
    try {
      const contacts = listContacts({ sort: 'name' });
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="linkbook-contacts-${stamp}.xlsx"`);
      await writeContactsWorkbook(contacts, res);
      res.end();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/export/template', async (req, res, next) => {
    try {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="linkbook-import-template.xlsx"');
      await writeTemplateWorkbook(res);
      res.end();
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/import', (req, res, next) => {
    upload.single('file')(req, res, async (uploadError) => {
      if (uploadError) {
        res.status(400).json({ error: uploadError.code === 'LIMIT_FILE_SIZE' ? '文件超过 10 MB 限制' : '文件上传失败' });
        return;
      }
      try {
        if (!req.file) throw new ValidationError('请选择要导入的 .xlsx 文件');
        const { contacts, skipped } = await readContactsWorkbook(req.file.buffer);
        const created = [];
        for (const contact of contacts) created.push(createContact(contact));
        res.json({
          imported: created.length,
          skipped: skipped.length,
          warnings: skipped.slice(0, 20),
          contacts: created.map((contact) => ({ id: contact.id, name: contact.name })),
        });
      } catch (error) {
        next(error);
      }
    });
  });

  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: 'index.html', maxAge: '1h', etag: true }));
    app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(join(clientDist, 'index.html')));
  }

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message, details: error.details });
      return;
    }
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: '请求体不是合法的 JSON' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: '服务器内部错误' });
  });

  return app;
}

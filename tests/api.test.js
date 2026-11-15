import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const dataDir = mkdtempSync(join(tmpdir(), 'linkbook-test-'));
process.env.LINKBOOK_DB = join(dataDir, 'test.db');
process.env.LINKBOOK_DATA_DIR = dataDir;

const { createApp } = await import('../server/src/app.js');
const { closeDb } = await import('../server/src/db.js');

let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  rmSync(dataDir, { recursive: true, force: true });
});

async function call(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  const type = response.headers.get('content-type') ?? '';
  const payload = type.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, payload, headers: response.headers };
}

const sample = {
  name: '测试联系人',
  company: '示例公司',
  title: '工程师',
  notes: '备注',
  isBookmarked: true,
  color: '#0ea5e9',
  methods: [
    { type: 'phone', label: '手机', value: '13800000000', isPrimary: true },
    { type: 'email', label: '工作', value: 'test@example.com' },
    { type: 'wechat', label: '', value: 'test_wechat' },
  ],
};

test('health endpoint responds', async () => {
  const { status, payload } = await call('/api/health');
  assert.equal(status, 200);
  assert.equal(payload.ok, true);
});

test('starts with an empty, zeroed address book', async () => {
  const list = await call('/api/contacts');
  assert.equal(list.status, 200);
  assert.deepEqual(list.payload.contacts, []);
  const stats = await call('/api/stats');
  assert.deepEqual(stats.payload, { total: 0, bookmarked: 0, methods: 0 });
});

test('creates a contact with multiple contact methods', async () => {
  const { status, payload } = await call('/api/contacts', { method: 'POST', body: JSON.stringify(sample) });
  assert.equal(status, 201);
  assert.equal(payload.name, '测试联系人');
  assert.equal(payload.isBookmarked, true);
  assert.equal(payload.methods.length, 3);
  assert.equal(payload.methods.filter((method) => method.isPrimary).length, 1);
  assert.equal(payload.methods[0].value, '13800000000');
});

test('rejects invalid payloads', async () => {
  const missingName = await call('/api/contacts', { method: 'POST', body: JSON.stringify({ company: 'X' }) });
  assert.equal(missingName.status, 400);
  assert.match(missingName.payload.error, /name/);

  const badType = await call('/api/contacts', {
    method: 'POST',
    body: JSON.stringify({ name: 'X', methods: [{ type: 'fax', value: '1' }] }),
  });
  assert.equal(badType.status, 400);

  const emptyValue = await call('/api/contacts', {
    method: 'POST',
    body: JSON.stringify({ name: 'X', methods: [{ type: 'phone', value: '   ' }] }),
  });
  assert.equal(emptyValue.status, 400);
});

test('searches across names, companies and methods', async () => {
  const byName = await call('/api/contacts?q=%E6%B5%8B%E8%AF%95');
  assert.equal(byName.payload.contacts.length, 1);

  const byMethod = await call('/api/contacts?q=example.com');
  assert.equal(byMethod.payload.contacts.length, 1);

  const byCompany = await call(`/api/contacts?q=${encodeURIComponent('示例公司')}`);
  assert.equal(byCompany.payload.contacts.length, 1);

  const none = await call('/api/contacts?q=zzz-not-found');
  assert.equal(none.payload.contacts.length, 0);
});

test('updates a contact and replaces its methods', async () => {
  const list = await call('/api/contacts');
  const id = list.payload.contacts[0].id;
  const { status, payload } = await call(`/api/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: '测试联系人（已改名）',
      methods: [
        { type: 'email', label: '主要邮箱', value: 'new@example.com', isPrimary: true },
        { type: 'address', label: '公司', value: '杭州市西湖区' },
      ],
    }),
  });
  assert.equal(status, 200);
  assert.equal(payload.name, '测试联系人（已改名）');
  assert.equal(payload.methods.length, 2);
  assert.equal(payload.methods[0].type, 'email');
  assert.equal(payload.company, '示例公司', 'partial update keeps untouched fields');
});

test('toggles the bookmark flag and filters by it', async () => {
  const list = await call('/api/contacts');
  const id = list.payload.contacts[0].id;

  const off = await call(`/api/contacts/${id}/bookmark`, {
    method: 'PATCH',
    body: JSON.stringify({ isBookmarked: false }),
  });
  assert.equal(off.status, 200);
  assert.equal(off.payload.isBookmarked, false);

  const filtered = await call('/api/contacts?bookmarked=1');
  assert.equal(filtered.payload.contacts.length, 0);

  const on = await call(`/api/contacts/${id}/bookmark`, {
    method: 'PATCH',
    body: JSON.stringify({ isBookmarked: true }),
  });
  assert.equal(on.payload.isBookmarked, true);

  const stats = await call('/api/stats');
  assert.equal(stats.payload.bookmarked, 1);
});

test('exports a workbook with one row per contact and one column per field', async () => {
  const { status, payload, headers } = await call('/api/export');
  assert.equal(status, 200);
  assert.match(headers.get('content-type'), /spreadsheetml/);
  assert.ok(payload.length > 2000, 'workbook should not be empty');

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(payload);
  const sheet = workbook.worksheets[0];
  const headersRow = sheet.getRow(1).values.slice(1);
  assert.equal(headersRow[0], 'Name');
  assert.ok(headersRow.includes('Phone 1'));
  assert.ok(headersRow.includes('Email 1 Label'));
  assert.equal(sheet.getRow(2).getCell(1).value, '测试联系人（已改名）');
  assert.equal(sheet.getRow(2).getCell(2).value, '示例公司');
});

test('round-trips an exported workbook through the import endpoint', async () => {
  const exported = await call('/api/export');
  const form = new FormData();
  form.append(
    'file',
    new Blob([exported.payload], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'contacts.xlsx',
  );
  const before = await call('/api/stats');
  const result = await call('/api/import', { method: 'POST', body: form });
  assert.equal(result.status, 200);
  assert.equal(result.payload.imported, 1);
  const after = await call('/api/stats');
  assert.equal(after.payload.total, before.payload.total + 1);

  const duplicates = await call('/api/contacts?q=%E5%B7%B2%E6%94%B9%E5%90%8D');
  assert.equal(duplicates.payload.contacts.length, 2);
  const imported = duplicates.payload.contacts.find((contact) => contact.id !== duplicates.payload.contacts[0].id);
  assert.equal(imported.methods.length, 2);
});

test('imports a hand-written workbook and skips rows without a name', async () => {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Contacts');
  sheet.addRow(['Name', 'Company', 'Bookmarked', 'Phone 1', 'Phone 1 Label', 'WeChat 1']);
  sheet.addRow(['手动导入', '导入公司', 'Yes', '13911112222', '手机', 'manual_wx']);
  sheet.addRow(['', '缺少姓名', 'No', '13800000000', '', '']);
  const buffer = await workbook.xlsx.writeBuffer();

  const form = new FormData();
  form.append('file', new Blob([buffer]), 'manual.xlsx');
  const result = await call('/api/import', { method: 'POST', body: form });
  assert.equal(result.status, 200);
  assert.equal(result.payload.imported, 1);
  assert.equal(result.payload.skipped, 1);

  const found = await call(`/api/contacts?q=${encodeURIComponent('手动导入')}`);
  assert.equal(found.payload.contacts[0].isBookmarked, true);
  assert.equal(found.payload.contacts[0].methods[0].label, '手机');
});

test('rejects non-Excel uploads', async () => {
  const form = new FormData();
  form.append('file', new Blob(['not an excel file']), 'notes.txt');
  const result = await call('/api/import', { method: 'POST', body: form });
  assert.equal(result.status, 400);
});

test('returns 404 for unknown contacts', async () => {
  const missing = await call('/api/contacts/9999');
  assert.equal(missing.status, 404);
  const deleted = await call('/api/contacts/9999', { method: 'DELETE' });
  assert.equal(deleted.status, 404);
});

test('deletes a contact together with its methods', async () => {
  const list = await call('/api/contacts');
  const id = list.payload.contacts[0].id;
  const removed = await call(`/api/contacts/${id}`, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  const after = await call(`/api/contacts/${id}`);
  assert.equal(after.status, 404);
});

import ExcelJS from 'exceljs';
import { METHOD_TYPES } from './contacts.js';
import { ValidationError } from './contacts.js';

export const TYPE_LABELS = {
  phone: 'Phone',
  email: 'Email',
  wechat: 'WeChat',
  qq: 'QQ',
  address: 'Address',
  website: 'Website',
  other: 'Other',
};

const FIXED_COLUMNS = [
  { header: 'Name', width: 24 },
  { header: 'Company', width: 22 },
  { header: 'Title', width: 18 },
  { header: 'Bookmarked', width: 12 },
  { header: 'Notes', width: 36 },
];

const ALIASES = new Map(
  Object.entries({
    name: ['name', 'full name', '姓名', '名字'],
    company: ['company', 'organisation', 'organization', '公司', '单位', '组织'],
    title: ['title', 'job title', 'position', '职位', '职务'],
    bookmarked: ['bookmarked', 'bookmark', 'favourite', 'favorite', '收藏', '星标'],
    notes: ['notes', 'note', 'remark', 'remarks', '备注', '说明'],
    phone: ['phone', 'mobile', 'tel', 'telephone', '电话', '手机', '电话号码'],
    email: ['email', 'e-mail', 'mail', '邮箱', '电子邮件'],
    wechat: ['wechat', 'weixin', '微信'],
    qq: ['qq'],
    address: ['address', '地址', '住址'],
    website: ['website', 'web', 'url', '网站', '网址'],
    other: ['other', '其他', '其它'],
  }).flatMap(([field, names]) => names.map((name) => [name, field])),
);

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

function methodColumnsFor(contacts) {
  const maxByType = Object.fromEntries(METHOD_TYPES.map((type) => [type, 1]));
  for (const contact of contacts) {
    const counts = {};
    for (const method of contact.methods) counts[method.type] = (counts[method.type] ?? 0) + 1;
    for (const [type, count] of Object.entries(counts)) maxByType[type] = Math.max(maxByType[type] ?? 1, count);
  }
  const columns = [];
  for (const type of METHOD_TYPES) {
    for (let index = 1; index <= Math.min(maxByType[type], 10); index += 1) {
      columns.push({ type, index, label: `${TYPE_LABELS[type]} ${index}` });
      columns.push({ type, index, label: `${TYPE_LABELS[type]} ${index} Label` });
    }
  }
  return columns;
}

function applyHeaderStyle(row) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF3730A3' } } };
  });
}

export async function writeContactsWorkbook(contacts, stream) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LinkBook';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Contacts', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 20 },
  });

  const methodColumns = methodColumnsFor(contacts);
  const headers = [...FIXED_COLUMNS.map((column) => column.header), ...methodColumns.map((column) => column.label)];
  const widths = [...FIXED_COLUMNS.map((column) => column.width), ...methodColumns.map((column) => (column.label.endsWith('Label') ? 16 : 24))];
  sheet.columns = headers.map((header, index) => ({ header, width: widths[index] }));

  for (const contact of contacts) {
    const values = [
      contact.name,
      contact.company,
      contact.title,
      contact.isBookmarked ? 'Yes' : 'No',
      contact.notes,
    ];
    for (const column of methodColumns) {
      const sameType = contact.methods.filter((method) => method.type === column.type);
      const method = sameType[column.index - 1];
      values.push(method ? method.value : '', method ? method.label : '');
    }
    sheet.addRow(values);
  }

  applyHeaderStyle(sheet.getRow(1));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: 'top', wrapText: false };
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  await workbook.xlsx.write(stream);
}

export async function writeTemplateWorkbook(stream) {
  const sample = [
    {
      name: '示例联系人',
      company: '示例公司',
      title: '产品经理',
      isBookmarked: true,
      notes: '这一行是示例，导入前请删除',
      methods: [
        { type: 'phone', label: '手机', value: '13800000000' },
        { type: 'email', label: '工作', value: 'demo@example.com' },
        { type: 'wechat', label: '', value: 'demo_wechat' },
      ],
    },
  ];
  await writeContactsWorkbook(sample, stream);
}

function cellText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text ?? '').join('');
    if (typeof value.text === 'string') return value.text;
    if (value.result !== undefined) return String(value.result);
    if (value.hyperlink) return String(value.hyperlink);
    return '';
  }
  return String(value).trim();
}

function resolveField(header) {
  const normalized = header.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  return ALIASES.get(normalized) ?? null;
}

function parseMethodHeader(header) {
  const match = /^(.*?)\s*#?\s*(\d+)\s*(label|标签)?$/i.exec(header.trim());
  if (!match) return null;
  const base = resolveField(match[1]);
  if (!base || !METHOD_TYPES.includes(base)) return null;
  return { field: base, index: Number(match[2]), isLabel: Boolean(match[3]) };
}

const MAX_IMPORT_ROWS = 5000;

export async function readContactsWorkbook(buffer, { maxRows = MAX_IMPORT_ROWS } = {}) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ValidationError('无法解析该文件，请上传 .xlsx 格式的 Excel 文件');
  }

  const sheet = workbook.worksheets.find((candidate) => candidate.rowCount > 0);
  if (!sheet) throw new ValidationError('Excel 文件中没有可读取的工作表');

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headers[columnNumber] = cellText(cell.value);
  });

  const fixed = {};
  const methodColumns = [];
  for (let column = 1; column < headers.length; column += 1) {
    const header = headers[column] ?? '';
    if (!header) continue;
    const method = parseMethodHeader(header);
    if (method) {
      methodColumns.push({ column, ...method });
      continue;
    }
    const field = resolveField(header);
    if (field && !(field in fixed) && !METHOD_TYPES.includes(field)) fixed[field] = column;
  }

  if (!fixed.name) throw new ValidationError('缺少必填列 “Name / 姓名”，请参考导入模板');

  const contacts = [];
  const skipped = [];
  const lastRow = Math.min(sheet.rowCount, maxRows + 1);

  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const name = cellText(row.getCell(fixed.name).value);
    if (!name) {
      const hasContent = row.values.some((value, index) => index > 0 && cellText(value) !== '');
      if (hasContent) skipped.push({ row: rowNumber, reason: '缺少姓名，整行已跳过' });
      continue;
    }

    const methods = new Map();
    for (const column of methodColumns) {
      const value = cellText(row.getCell(column.column).value);
      if (!value) continue;
      const key = `${column.field}:${column.index}`;
      const entry = methods.get(key) ?? { type: column.field, index: column.index, value: '', label: '' };
      if (column.isLabel) entry.label = value.slice(0, 40);
      else entry.value = value.slice(0, 300);
      methods.set(key, entry);
    }

    const ordered = [...methods.values()]
      .filter((entry) => entry.value)
      .sort((a, b) => a.index - b.index)
      .map((entry) => ({
        type: entry.type,
        label: entry.label,
        value: entry.value,
        isPrimary: false,
      }));
    if (ordered.length) ordered[0].isPrimary = true;

    contacts.push({
      name: name.slice(0, 80),
      company: cellText(fixed.company !== undefined ? row.getCell(fixed.company).value : '').slice(0, 120),
      title: cellText(fixed.title !== undefined ? row.getCell(fixed.title).value : '').slice(0, 120),
      notes: cellText(fixed.notes !== undefined ? row.getCell(fixed.notes).value : '').slice(0, 2000),
      isBookmarked: /^(yes|true|1|y|是|收藏|✓)$/i.test(
        cellText(fixed.bookmarked !== undefined ? row.getCell(fixed.bookmarked).value : ''),
      ),
      methods: ordered,
    });
  }

  if (!contacts.length && !skipped.length) throw new ValidationError('Excel 中没有可导入的联系人');
  return { contacts, skipped };
}

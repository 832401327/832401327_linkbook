import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const videoDir = join(root, '.playwright', 'video');
const outDir = join(root, 'docs', 'video');
mkdirSync(videoDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const base = process.env.LINKBOOK_URL ?? 'http://127.0.0.1:3000';

async function sampleWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Contacts');
  sheet.addRow(['Name', 'Company', 'Title', 'Bookmarked', 'Notes', 'Phone 1', 'Phone 1 Label', 'Email 1', 'Email 1 Label']);
  sheet.addRow(['许星野', '星野科技', '技术总监', 'Yes', '从 Excel 批量导入', '13800001111', '手机', 'xingye@example.com', '工作']);
  sheet.addRow(['沈青禾', '青禾咨询', '顾问', 'No', '从 Excel 批量导入', '13900002222', '手机', 'qinghe@example.com', '工作']);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 760 },
  deviceScaleFactor: 1,
  locale: 'zh-CN',
  acceptDownloads: true,
  recordVideo: { dir: videoDir, size: { width: 1280, height: 760 } },
});

const page = await context.newPage();
const pause = (ms = 650) => page.waitForTimeout(ms);

await page.goto(base, { waitUntil: 'networkidle' });
await page.locator('.contact-card').first().waitFor();
await pause(1300);

await page.locator('.search').hover();
await page.locator('.search input').click();
await page.locator('.search input').pressSequentially('林', { delay: 160 });
await pause(1100);
await page.locator('.search input').fill('');
await pause(500);

await page.getByRole('button', { name: /我的收藏/ }).click();
await pause(1200);
await page.getByRole('button', { name: /全部联系人/ }).click();
await pause(500);

const card = page.locator('.contact-card').filter({ hasText: '何嘉禾' }).first();
await card.hover();
await card.locator('.star-toggle').click();
await pause(1100);

await page.locator('.contact-card').filter({ hasText: '白露' }).first().click();
await page.locator('.detail-panel').waitFor();
await pause(1600);
await page.locator('.detail-panel').getByRole('button', { name: '关闭详情' }).click();
await pause(500);

await page.getByRole('button', { name: /新建联系人/ }).click();
await page.locator('.form-modal').waitFor();
await pause(400);
await page.locator('.form-modal input[placeholder*="林晓"]').fill('顾清和');
await page.locator('.form-modal input[placeholder*="星野科技"]').fill('青禾设计');
await page.locator('.form-modal input[placeholder*="产品总监"]').fill('视觉设计师');
await pause(300);

const rows = page.locator('.method-edit-row');
await rows.nth(0).locator('.label-input').fill('手机');
await rows.nth(0).locator('.value-input').fill('138 0000 8899');
await page.getByRole('button', { name: '添加联系方式' }).click();
await rows.nth(1).locator('select').selectOption('email');
await rows.nth(1).locator('.label-input').fill('工作');
await rows.nth(1).locator('.value-input').fill('guqinghe@example.com');
await page.getByRole('button', { name: '添加联系方式' }).click();
await rows.nth(2).locator('select').selectOption('wechat');
await rows.nth(2).locator('.label-input').fill('');
await rows.nth(2).locator('.value-input').fill('qinghe_design');
await pause(900);

await page.getByRole('button', { name: '创建联系人' }).click();
await page.locator('.detail-panel').waitFor();
await pause(1400);
await page.locator('.detail-panel').getByRole('button', { name: '关闭详情' }).click();
await pause(600);

await page.locator('.sidebar').getByRole('button', { name: /导出 Excel/ }).click();
await pause(1500);

await page.locator('.sidebar').getByRole('button', { name: /导入 Excel/ }).click();
await page.locator('.import-modal').waitFor();
await pause(500);
const buffer = await sampleWorkbook();
await page.locator('.import-modal input[type=file]').setInputFiles({
  name: 'team-contacts.xlsx',
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer,
});
await pause(500);
await page.getByRole('button', { name: '开始导入' }).click();
await page.locator('.import-result').waitFor();
await pause(1800);
await page.getByRole('button', { name: '完成' }).click();
await pause(1500);

const video = page.video();
await context.close();
await browser.close();

const saved = await video.path();
copyFileSync(saved, join(outDir, 'linkbook-demo.webm'));
console.log(`video saved to docs/video/linkbook-demo.webm (${saved})`);

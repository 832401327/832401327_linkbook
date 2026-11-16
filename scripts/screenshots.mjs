import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'images');
mkdirSync(outDir, { recursive: true });

const base = process.env.LINKBOOK_URL ?? 'http://127.0.0.1:3000';
const out = (name) => join(outDir, name);

const stillCss = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`;

async function sampleWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Contacts');
  sheet.addRow(['Name', 'Company', 'Title', 'Bookmarked', 'Notes', 'Phone 1', 'Phone 1 Label', 'Email 1', 'Email 1 Label', 'WeChat 1']);
  sheet.addRow(['许星野', '星野科技', '技术总监', 'Yes', '从导入模板添加', '13800001111', '手机', 'xuxingye@example.com', '工作', 'xingye_wx']);
  sheet.addRow(['沈青禾', '青禾咨询', '顾问', 'No', '从导入模板添加', '13900002222', '手机', 'qinghe@example.com', '工作', '']);
  sheet.addRow(['程屿', '独立开发者', '全栈工程师', 'Yes', '从导入模板添加', '13700003333', '手机', 'chengyu@example.com', '个人', '']);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: stillCss });
  await page.locator('.contact-card').first().waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: out('app-list.png') });
  console.log('captured app-list.png');

  await page.getByRole('button', { name: /我的收藏/ }).click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: out('app-bookmarks.png') });
  console.log('captured app-bookmarks.png');

  await page.getByRole('button', { name: /全部联系人/ }).click();
  await page.waitForTimeout(300);
  await page.locator('.contact-card').filter({ hasText: '林晓' }).first().click();
  await page.locator('.detail-panel').waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: out('app-detail.png') });
  console.log('captured app-detail.png');

  await page.getByRole('button', { name: '编辑' }).click();
  await page.locator('.form-modal').waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: out('app-form.png') });
  console.log('captured app-form.png');

  await page.locator('.form-modal').getByRole('button', { name: '取消' }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  await page.locator('.sidebar').getByRole('button', { name: /导入 Excel/ }).click();
  await page.locator('.import-modal').waitFor();
  await page.waitForTimeout(200);
  await page.screenshot({ path: out('app-import.png') });
  console.log('captured app-import.png');

  const buffer = await sampleWorkbook();
  await page.locator('.import-modal input[type=file]').setInputFiles({
    name: 'team-contacts.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: '开始导入' }).click();
  await page.locator('.import-result').waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: out('app-import-result.png') });
  console.log('captured app-import-result.png');

  await page.getByRole('button', { name: '完成' }).click();
  await page.waitForTimeout(400);

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'zh-CN',
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(base, { waitUntil: 'networkidle' });
  await mobilePage.addStyleTag({ content: stillCss });
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: out('app-mobile.png') });
  console.log('captured app-mobile.png');
  writeFileSync(join(outDir, '.captured-at'), new Date().toISOString());
} finally {
  await browser.close();
}

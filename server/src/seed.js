import { pathToFileURL } from 'node:url';
import { createContact, getStats } from './contacts.js';
import { closeDb, db } from './db.js';

const force = process.argv.includes('--force');

export const SAMPLE_CONTACTS = [
  {
    name: '林晓',
    company: '星野科技',
    title: '产品总监',
    color: '#4f46e5',
    isBookmarked: true,
    notes: '季度规划会负责人；偏好上午沟通。',
    methods: [
      { type: 'phone', label: '手机', value: '138 0013 8000', isPrimary: true },
      { type: 'email', label: '工作', value: 'linxiao@starryfield.cn' },
      { type: 'wechat', label: '微信', value: 'linxiao_pm' },
    ],
  },
  {
    name: '陈墨',
    company: '云栈网络',
    title: '前端工程师',
    color: '#0ea5e9',
    isBookmarked: false,
    notes: '负责设计系统组件库，熟悉 React 与可视化。',
    methods: [
      { type: 'phone', label: '手机', value: '139 2200 1188', isPrimary: true },
      { type: 'email', label: '个人', value: 'chenmo.dev@gmail.com' },
      { type: 'qq', label: '', value: '4420 1188' },
      { type: 'website', label: '博客', value: 'https://chenmo.dev' },
    ],
  },
  {
    name: '苏婉清',
    company: '婉清设计工作室',
    title: '品牌设计师',
    color: '#db2777',
    isBookmarked: true,
    notes: '合作过两次品牌改版，交付质量稳定。',
    methods: [
      { type: 'phone', label: '手机', value: '137 8899 6622', isPrimary: true },
      { type: 'wechat', label: '微信', value: 'wanqing_design' },
      { type: 'address', label: '工作室', value: '杭州市西湖区文三路 90 号 3 幢 502' },
    ],
  },
  {
    name: '周牧',
    company: '数澜分析',
    title: '数据分析师',
    color: '#16a34a',
    isBookmarked: false,
    notes: '擅长用户增长与留存分析。',
    methods: [
      { type: 'phone', label: '手机', value: '136 5566 7788', isPrimary: true },
      { type: 'email', label: '工作', value: 'zhoumu@shulan.io' },
    ],
  },
  {
    name: '何嘉禾',
    company: '星野科技',
    title: 'HRBP',
    color: '#f59e0b',
    isBookmarked: false,
    notes: '校招与实习对接人。',
    methods: [
      { type: 'phone', label: '座机', value: '0571-8800 1234', isPrimary: true },
      { type: 'email', label: '工作', value: 'hejiahe@starryfield.cn' },
      { type: 'address', label: '办公', value: '杭州市滨江区江南大道 588 号 12 楼' },
    ],
  },
  {
    name: '顾言',
    company: '云栈网络',
    title: '后端工程师',
    color: '#7c3aed',
    isBookmarked: false,
    notes: '负责订单服务；对数据库性能优化有经验。',
    methods: [
      { type: 'phone', label: '手机', value: '135 7788 9900', isPrimary: true },
      { type: 'email', label: '工作', value: 'guyan@yunzhan.com' },
      { type: 'qq', label: '', value: '7788 9900' },
    ],
  },
  {
    name: '沈知微',
    company: '光屿文化',
    title: '市场经理',
    color: '#dc2626',
    isBookmarked: true,
    notes: '媒体资源丰富，活动合作优先联系。',
    methods: [
      { type: 'phone', label: '手机', value: '133 4455 6677', isPrimary: true },
      { type: 'wechat', label: '微信', value: 'zhiwei_mkt' },
      { type: 'email', label: '工作', value: 'shenzhiwei@lightisle.cn' },
    ],
  },
  {
    name: '罗一鸣',
    company: '一鸣创投',
    title: '合伙人',
    color: '#0f766e',
    isBookmarked: false,
    notes: '关注企业服务与 AI 工具赛道。',
    methods: [
      { type: 'phone', label: '手机', value: '132 1122 3344', isPrimary: true },
      { type: 'wechat', label: '微信', value: 'yiming_vc' },
      { type: 'website', label: '机构主页', value: 'https://yiming.vc' },
    ],
  },
  {
    name: '江予安',
    company: '福州大学',
    title: '软件工程学生',
    color: '#2563eb',
    isBookmarked: false,
    notes: '课程项目搭档，负责前端与文档。',
    methods: [
      { type: 'phone', label: '手机', value: '131 2233 4455', isPrimary: true },
      { type: 'email', label: '校园', value: 'jiangyuan@fzu.edu.cn' },
    ],
  },
  {
    name: '白露',
    company: '白露摄影',
    title: '商业摄影师',
    color: '#9333ea',
    isBookmarked: true,
    notes: '产品图与活动跟拍，出片快。',
    methods: [
      { type: 'phone', label: '手机', value: '130 9988 7766', isPrimary: true },
      { type: 'wechat', label: '微信', value: 'bailu_photo' },
      { type: 'website', label: '作品集', value: 'https://bailu.photo' },
      { type: 'address', label: '工作室', value: '上海市静安区愚园路 68 号' },
    ],
  },
];

export function seed({ force = false } = {}) {
  const { total } = getStats();
  if (total > 0 && !force) return { seeded: 0, reason: 'database not empty' };
  if (force && total > 0) {
    db.exec('DELETE FROM contact_methods; DELETE FROM contacts;');
  }
  for (const contact of SAMPLE_CONTACTS) createContact(contact);
  return { seeded: SAMPLE_CONTACTS.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = seed({ force });
  console.log(`Seed complete: ${result.seeded} contacts`);
  closeDb();
}

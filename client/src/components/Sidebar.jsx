import { DownloadIcon, SheetIcon, StarIcon, UploadIcon, UsersIcon } from './Icons.jsx';

export default function Sidebar({ stats, view, onViewChange, onExport, onImport, exporting }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path d="M7 3.5h10a2 2 0 0 1 2 2v15l-7-4.2-7 4.2v-15a2 2 0 0 1 2-2Z" fill="#fff" />
            <circle cx="16.4" cy="7.4" r="1.9" fill="#fbbf24" />
          </svg>
        </div>
        <div className="brand-text">
          <strong>LinkBook</strong>
          <span>让重要的人触手可及</span>
        </div>
      </div>

      <nav className="nav" aria-label="联系人分类">
        <p className="nav-label">通讯录</p>
        <button
          type="button"
          className={`nav-item${view === 'all' ? ' active' : ''}`}
          onClick={() => onViewChange('all')}
        >
          <UsersIcon width={18} height={18} />
          <span>全部联系人</span>
          <span className="nav-count">{stats.total}</span>
        </button>
        <button
          type="button"
          className={`nav-item${view === 'bookmarked' ? ' active' : ''}`}
          onClick={() => onViewChange('bookmarked')}
        >
          <StarIcon width={18} height={18} />
          <span>我的收藏</span>
          <span className="nav-count">{stats.bookmarked}</span>
        </button>
      </nav>

      <div className="sidebar-tools">
        <p className="nav-label">数据</p>
        <button type="button" className="tool-button" onClick={onImport}>
          <UploadIcon width={17} height={17} />
          导入 Excel
        </button>
        <button type="button" className="tool-button" onClick={onExport} disabled={exporting}>
          <DownloadIcon width={17} height={17} />
          {exporting ? '正在导出…' : '导出 Excel'}
        </button>
        <a className="tool-button subtle" href="/api/export/template" download>
          <SheetIcon width={17} height={17} />
          下载导入模板
        </a>
      </div>

      <div className="sidebar-footer">
        <p>
          已收录 <strong>{stats.total}</strong> 位联系人
        </p>
        <p className="muted">
          {stats.methods} 条联系方式 · {stats.bookmarked} 人已收藏
        </p>
      </div>
    </aside>
  );
}

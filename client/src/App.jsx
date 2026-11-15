import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import Sidebar from './components/Sidebar.jsx';
import ContactCard from './components/ContactCard.jsx';
import ContactDetail from './components/ContactDetail.jsx';
import ContactForm from './components/ContactForm.jsx';
import ImportDialog from './components/ImportDialog.jsx';
import Toasts from './components/Toasts.jsx';
import { DownloadIcon, PlusIcon, SearchIcon, StarIcon, UploadIcon, UsersIcon } from './components/Icons.jsx';

const EMPTY_STATS = { total: 0, bookmarked: 0, methods: 0 };

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState('name');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [formState, setFormState] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const searchRef = useRef(null);
  const timers = useRef(new Map());

  const toast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
      timers.current.delete(id);
    }, 4200);
    timers.current.set(id, timer);
  }, []);

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(query.trim()), 220);
    return () => clearTimeout(timer);
  }, [query]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.stats());
    } catch {
      /* stats are non-critical */
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const data = await api.listContacts({ q: searchTerm, bookmarked: view === 'bookmarked', sort });
      setContacts(data.contacts);
      setError('');
    } catch (loadError) {
      setError(loadError.message ?? '无法加载联系人');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, view, sort]);

  useEffect(() => {
    setLoading(true);
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        if (formState) setFormState(null);
        else if (importOpen) setImportOpen(false);
        else if (selected) setSelected(null);
        else if (query) setQuery('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formState, importOpen, selected, query]);

  const toggleBookmark = async (contact) => {
    const next = !contact.isBookmarked;
    const previous = contacts;
    setContacts((current) =>
      view === 'bookmarked' && !next
        ? current.filter((item) => item.id !== contact.id)
        : current.map((item) => (item.id === contact.id ? { ...item, isBookmarked: next } : item)),
    );
    setSelected((current) => (current && current.id === contact.id ? { ...current, isBookmarked: next } : current));
    setStats((current) => ({
      ...current,
      bookmarked: Math.max(0, current.bookmarked + (next ? 1 : -1)),
    }));
    try {
      await api.setBookmark(contact.id, next);
      toast(next ? `已收藏 ${contact.name}` : `已取消收藏 ${contact.name}`);
    } catch (bookmarkError) {
      setContacts(previous);
      loadStats();
      toast(bookmarkError.message ?? '操作失败，请重试', 'error');
    }
  };

  const saveContact = async (payload) => {
    const editing = formState?.contact ?? null;
    const saved = editing ? await api.updateContact(editing.id, payload) : await api.createContact(payload);
    setFormState(null);
    setSelected(saved);
    await Promise.all([loadContacts(), loadStats()]);
    toast(editing ? '修改已保存' : `已添加 ${saved.name}`);
  };

  const removeContact = async (contact) => {
    try {
      await api.deleteContact(contact.id);
      setSelected(null);
      await Promise.all([loadContacts(), loadStats()]);
      toast(`已删除 ${contact.name}`);
    } catch (deleteError) {
      toast(deleteError.message ?? '删除失败', 'error');
    }
  };

  const handleCopy = async (value) => {
    const ok = await copyText(value);
    toast(ok ? '已复制到剪贴板' : '复制失败，请手动复制', ok ? 'success' : 'error');
    return ok;
  };

  const handleExport = () => {
    setExporting(true);
    const link = document.createElement('a');
    link.href = '/api/export';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => setExporting(false), 900);
    toast('正在导出 Excel 文件…');
  };

  const handleImported = async (result) => {
    await Promise.all([loadContacts(), loadStats()]);
    toast(`已导入 ${result.imported} 位联系人`);
  };

  const heading = view === 'bookmarked' ? '我的收藏' : '全部联系人';
  const headingHint = searchTerm
    ? `“${searchTerm}” 的搜索结果`
    : view === 'bookmarked'
      ? '把重要的人收进这里，随时找到'
      : '所有联系人按姓名排列，点击卡片查看详情';

  const emptyState = useMemo(() => {
    if (loading) {
      return (
        <div className="skeleton-grid" aria-label="加载中">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="skeleton-card" key={index} />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="empty-state">
          <p className="empty-title">加载失败</p>
          <p className="muted">{error}</p>
          <button type="button" className="button secondary" onClick={() => loadContacts()}>
            重试
          </button>
        </div>
      );
    }
    if (!contacts.length) {
      return (
        <div className="empty-state">
          <div className="empty-illustration" aria-hidden="true">
            {view === 'bookmarked' ? <StarIcon width={34} height={34} /> : <UsersIcon width={34} height={34} />}
          </div>
          <p className="empty-title">{searchTerm ? '没有匹配的联系人' : view === 'bookmarked' ? '还没有收藏任何人' : '通讯录还是空的'}</p>
          <p className="muted">
            {searchTerm
              ? '换个关键词试试，或清空搜索查看全部联系人。'
              : view === 'bookmarked'
                ? '在联系人卡片右上角点亮星标，即可加入收藏。'
                : '新建一位联系人，或从 Excel 批量导入。'}
          </p>
          <div className="empty-actions">
            {searchTerm ? (
              <button type="button" className="button secondary" onClick={() => setQuery('')}>
                清空搜索
              </button>
            ) : (
              <>
                <button type="button" className="button primary" onClick={() => setFormState({ contact: null })}>
                  <PlusIcon width={16} height={16} />
                  新建联系人
                </button>
                <button type="button" className="button secondary" onClick={() => setImportOpen(true)}>
                  <UploadIcon width={16} height={16} />
                  导入 Excel
                </button>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  }, [loading, error, contacts, searchTerm, view, loadContacts]);

  return (
    <div className="app">
      <Sidebar
        stats={stats}
        view={view}
        onViewChange={(next) => {
          setView(next);
          setQuery('');
        }}
        onImport={() => setImportOpen(true)}
        onExport={handleExport}
        exporting={exporting}
      />

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{heading}</h1>
            <p>{headingHint}</p>
          </div>
          <div className="topbar-actions">
            <label className="search">
              <SearchIcon width={17} height={17} />
              <input
                ref={searchRef}
                type="search"
                value={query}
                placeholder="搜索姓名、公司或号码…"
                aria-label="搜索联系人"
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd>/</kbd>
            </label>
            <select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="排序方式">
              <option value="name">按姓名</option>
              <option value="recent">最近更新</option>
            </select>
            <button type="button" className="button primary" onClick={() => setFormState({ contact: null })}>
              <PlusIcon width={17} height={17} />
              新建联系人
            </button>
          </div>
        </header>

        <section className="content">
          {emptyState ?? (
            <>
              <div className="result-bar">
                <span>
                  共 <strong>{contacts.length}</strong> 位联系人
                  {searchTerm ? '（已筛选）' : ''}
                </span>
                <button type="button" className="link-button" onClick={handleExport}>
                  <DownloadIcon width={15} height={15} />
                  导出当前全部
                </button>
              </div>
              <div className="contact-grid">
                {contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onOpen={async (id) => {
                      const existing = contacts.find((item) => item.id === id);
                      if (existing) setSelected(existing);
                      try {
                        setSelected(await api.getContact(id));
                      } catch {
                        /* keep the cached copy */
                      }
                    }}
                    onToggleBookmark={toggleBookmark}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {selected ? (
        <ContactDetail
          contact={selected}
          onClose={() => setSelected(null)}
          onEdit={(contact) => setFormState({ contact })}
          onDelete={removeContact}
          onToggleBookmark={toggleBookmark}
          onCopy={handleCopy}
        />
      ) : null}

      {formState ? (
        <ContactForm
          contact={formState.contact}
          onClose={() => setFormState(null)}
          onSubmit={saveContact}
        />
      ) : null}

      {importOpen ? <ImportDialog onClose={() => setImportOpen(false)} onImported={handleImported} /> : null}

      <Toasts
        toasts={toasts}
        onDismiss={(id) => {
          clearTimeout(timers.current.get(id));
          timers.current.delete(id);
          setToasts((current) => current.filter((item) => item.id !== id));
        }}
      />
    </div>
  );
}

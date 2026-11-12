import { useEffect, useState } from 'react';
import { CheckIcon, CloseIcon, CopyIcon, EditIcon, StarIcon, TrashIcon } from './Icons.jsx';
import { METHOD_ICONS } from './Icons.jsx';
import { METHOD_LABELS, formatDate, initials, tint } from '../lib/format.js';

export default function ContactDetail({ contact, onClose, onEdit, onDelete, onToggleBookmark, onCopy }) {
  const [confirming, setConfirming] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setConfirming(false);
    setCopiedId(null);
  }, [contact.id]);

  const handleCopy = async (method) => {
    const ok = await onCopy(method.value);
    if (ok) {
      setCopiedId(method.id);
      setTimeout(() => setCopiedId((current) => (current === method.id ? null : current)), 1500);
    }
  };

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="detail-panel" role="dialog" aria-modal="true" aria-label={`${contact.name} 的详情`}>
        <header className="detail-top">
          <span className="detail-eyebrow">联系人详情</span>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭详情">
            <CloseIcon />
          </button>
        </header>

        <div className="detail-hero">
          <div
            className="avatar avatar-lg"
            style={{ background: tint(contact.color, 0.14), color: contact.color }}
          >
            {initials(contact.name)}
          </div>
          <div className="detail-identity">
            <h2>{contact.name}</h2>
            <p>{[contact.title, contact.company].filter(Boolean).join(' · ') || '未填写公司信息'}</p>
          </div>
          <button
            type="button"
            className={`hero-star${contact.isBookmarked ? ' active' : ''}`}
            aria-pressed={contact.isBookmarked}
            aria-label={contact.isBookmarked ? '取消收藏' : '收藏联系人'}
            onClick={() => onToggleBookmark(contact)}
          >
            <StarIcon filled={contact.isBookmarked} width={20} height={20} />
          </button>
        </div>

        <div className="detail-actions">
          <button type="button" className="button secondary" onClick={() => onEdit(contact)}>
            <EditIcon width={16} height={16} />
            编辑
          </button>
          <button type="button" className="button ghost danger" onClick={() => setConfirming(true)}>
            <TrashIcon width={16} height={16} />
            删除
          </button>
        </div>

        <section className="detail-section">
          <h3>
            联系方式 <span className="section-count">{contact.methods.length}</span>
          </h3>
          {contact.methods.length ? (
            <ul className="method-list">
              {contact.methods.map((method) => {
                const Icon = METHOD_ICONS[method.type] ?? METHOD_ICONS.other;
                return (
                  <li key={method.id ?? `${method.type}-${method.value}`} className="method-row">
                    <span className="method-icon" style={{ background: tint(contact.color, 0.12), color: contact.color }}>
                      <Icon width={17} height={17} />
                    </span>
                    <div className="method-body">
                      <span className="method-meta">
                        {METHOD_LABELS[method.type]}
                        {method.label && method.label !== METHOD_LABELS[method.type] ? ` · ${method.label}` : ''}
                        {method.isPrimary ? <em className="primary-badge">主要</em> : null}
                      </span>
                      <span className="method-value">{method.value}</span>
                    </div>
                    <button
                      type="button"
                      className="icon-button subtle"
                      aria-label={`复制${METHOD_LABELS[method.type]}`}
                      title="复制"
                      onClick={() => handleCopy(method)}
                    >
                      {copiedId === method.id ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-note">还没有添加联系方式。</p>
          )}
        </section>

        <section className="detail-section">
          <h3>备注</h3>
          {contact.notes ? <p className="notes-text">{contact.notes}</p> : <p className="empty-note">暂无备注。</p>}
        </section>

        <footer className="detail-meta">
          <span>创建于 {formatDate(contact.createdAt)}</span>
          <span>更新于 {formatDate(contact.updatedAt)}</span>
        </footer>

        {confirming ? (
          <div className="confirm-card" role="alertdialog" aria-label="确认删除">
            <p>
              确定删除 <strong>{contact.name}</strong> 吗？该联系人的所有联系方式将一并删除，且无法恢复。
            </p>
            <div className="confirm-actions">
              <button type="button" className="button ghost" onClick={() => setConfirming(false)} disabled={deleting}>
                取消
              </button>
              <button
                type="button"
                className="button danger"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await onDelete(contact);
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

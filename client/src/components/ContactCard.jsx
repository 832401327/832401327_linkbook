import { METHOD_ICONS, StarIcon } from './Icons.jsx';
import { initials, primaryMethod, tint } from '../lib/format.js';

export default function ContactCard({ contact, onOpen, onToggleBookmark }) {
  const primary = primaryMethod(contact);
  const Icon = primary ? METHOD_ICONS[primary.type] : null;
  const extra = contact.methods.length > 1 ? contact.methods.length - 1 : 0;

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(contact.id);
    }
  };

  return (
    <article
      className={`contact-card${contact.isBookmarked ? ' is-bookmarked' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`查看${contact.name}的详情`}
      onClick={() => onOpen(contact.id)}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={`star-toggle${contact.isBookmarked ? ' active' : ''}`}
        aria-label={contact.isBookmarked ? `取消收藏${contact.name}` : `收藏${contact.name}`}
        aria-pressed={contact.isBookmarked}
        title={contact.isBookmarked ? '取消收藏' : '收藏'}
        onClick={(event) => {
          event.stopPropagation();
          onToggleBookmark(contact);
        }}
      >
        <StarIcon filled={contact.isBookmarked} width={17} height={17} />
      </button>

      <div className="card-header">
        <div className="avatar" style={{ background: tint(contact.color, 0.14), color: contact.color }}>
          {initials(contact.name)}
        </div>
        <div className="card-identity">
          <h3 className="card-name">{contact.name}</h3>
          <p className="card-role">
            {[contact.title, contact.company].filter(Boolean).join(' · ') || '未填写公司信息'}
          </p>
        </div>
      </div>

      <div className="card-footer">
        {primary ? (
          <span className="method-chip" title={`${primary.label || ''} ${primary.value}`}>
            {Icon ? <Icon width={14} height={14} /> : null}
            <span className="method-chip-value">{primary.value}</span>
          </span>
        ) : (
          <span className="method-chip muted">暂无联系方式</span>
        )}
        {extra > 0 ? <span className="more-count">+{extra}</span> : null}
      </div>
    </article>
  );
}

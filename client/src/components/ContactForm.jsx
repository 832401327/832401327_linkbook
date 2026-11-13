import { useMemo, useState } from 'react';
import { CloseIcon, PlusIcon, StarIcon, TrashIcon } from './Icons.jsx';
import { AVATAR_COLORS, METHOD_LABELS, METHOD_TYPES, cloneForEdit } from '../lib/format.js';

let rowSequence = 0;
const nextKey = () => `row-${(rowSequence += 1)}`;

function toRows(methods) {
  if (!methods.length) return [{ key: nextKey(), type: 'phone', label: '', value: '', isPrimary: true }];
  return methods.map((method) => ({ ...method, key: nextKey() }));
}

export default function ContactForm({ contact, onClose, onSubmit }) {
  const [form, setForm] = useState(() => {
    const initial = cloneForEdit(contact);
    return { ...initial, methods: toRows(initial.methods) };
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const title = contact ? '编辑联系人' : '新建联系人';
  const validMethods = useMemo(() => form.methods.filter((method) => method.value.trim()), [form.methods]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const updateMethod = (key, field, value) => {
    setForm((current) => ({
      ...current,
      methods: current.methods.map((method) => {
        if (method.key !== key) return method;
        if (field === 'isPrimary' && value) {
          return { ...method, isPrimary: true };
        }
        return { ...method, [field]: value };
      }),
    }));
  };

  const removeMethod = (key) => {
    setForm((current) => {
      const methods = current.methods.filter((method) => method.key !== key);
      if (methods.length && !methods.some((method) => method.isPrimary)) methods[0] = { ...methods[0], isPrimary: true };
      return { ...current, methods };
    });
  };

  const addMethod = () => {
    setForm((current) => ({
      ...current,
      methods: [...current.methods, { key: nextKey(), type: 'phone', label: '', value: '', isPrimary: false }],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('请填写姓名');
      return;
    }
    const emptyRow = form.methods.find((method) => !method.value.trim() && (method.label.trim() || method.type !== 'phone'));
    if (emptyRow && !form.methods.some((method) => method.value.trim())) {
      setError('请至少填写一条联系方式，或删除空白行');
      return;
    }

    const methods = validMethods.map((method, index) => ({
      type: method.type,
      label: method.label.trim(),
      value: method.value.trim(),
      isPrimary: index === 0 ? true : Boolean(method.isPrimary),
    }));
    if (methods.length && !methods.some((method) => method.isPrimary)) methods[0].isPrimary = true;

    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        company: form.company.trim(),
        title: form.title.trim(),
        notes: form.notes.trim(),
        color: form.color,
        isBookmarked: form.isBookmarked,
        methods,
      });
    } catch (submitError) {
      setError(submitError.message ?? '保存失败，请稍后重试');
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <form className="form-modal" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>姓名必填，其余信息可以随时补充。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭" disabled={saving}>
            <CloseIcon />
          </button>
        </header>

        <div className="modal-body">
          <div className="field-row two">
            <label className="field">
              <span>
                姓名 <i className="required">*</i>
              </span>
              <input
                autoFocus
                value={form.name}
                maxLength={80}
                placeholder="例如：林晓"
                onChange={(event) => update('name', event.target.value)}
              />
            </label>
            <label className="field">
              <span>公司 / 组织</span>
              <input
                value={form.company}
                maxLength={120}
                placeholder="例如：星野科技"
                onChange={(event) => update('company', event.target.value)}
              />
            </label>
          </div>

          <div className="field-row two">
            <label className="field">
              <span>职位</span>
              <input
                value={form.title}
                maxLength={120}
                placeholder="例如：产品总监"
                onChange={(event) => update('title', event.target.value)}
              />
            </label>
            <div className="field">
              <span>头像颜色</span>
              <div className="swatches" role="radiogroup" aria-label="头像颜色">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={form.color === color}
                    aria-label={`颜色 ${color}`}
                    className={`swatch${form.color === color ? ' selected' : ''}`}
                    style={{ background: color }}
                    onClick={() => update('color', color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="methods-block">
            <div className="methods-head">
              <h3>联系方式</h3>
              <span className="muted">支持电话、邮箱、微信、QQ、地址、网站等，同一个联系人可添加多条。</span>
            </div>

            <div className="method-editor">
              {form.methods.map((method, index) => (
                <div className="method-edit-row" key={method.key}>
                  <select
                    aria-label={`第${index + 1}条联系方式类型`}
                    value={method.type}
                    onChange={(event) => updateMethod(method.key, 'type', event.target.value)}
                  >
                    {METHOD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {METHOD_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <input
                    className="label-input"
                    aria-label={`第${index + 1}条联系方式标签`}
                    value={method.label}
                    maxLength={40}
                    placeholder="标签（选填）"
                    onChange={(event) => updateMethod(method.key, 'label', event.target.value)}
                  />
                  <input
                    className="value-input"
                    aria-label={`第${index + 1}条联系方式内容`}
                    value={method.value}
                    maxLength={300}
                    placeholder="号码 / 账号 / 地址 / 链接"
                    onChange={(event) => updateMethod(method.key, 'value', event.target.value)}
                  />
                  <label className="primary-cell" title="设为主要联系方式">
                    <input
                      type="radio"
                      name="primary-method"
                      checked={Boolean(method.isPrimary)}
                      onChange={() => updateMethod(method.key, 'isPrimary', true)}
                    />
                    <span>主要</span>
                  </label>
                  <button
                    type="button"
                    className="icon-button subtle"
                    aria-label="删除这条联系方式"
                    onClick={() => removeMethod(method.key)}
                    disabled={form.methods.length === 1}
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="add-method" onClick={addMethod}>
              <PlusIcon width={16} height={16} />
              添加联系方式
            </button>
          </div>

          <label className="field">
            <span>备注</span>
            <textarea
              rows={3}
              maxLength={2000}
              value={form.notes}
              placeholder="记录沟通偏好、合作背景等"
              onChange={(event) => update('notes', event.target.value)}
            />
          </label>

          <button
            type="button"
            className={`bookmark-switch${form.isBookmarked ? ' on' : ''}`}
            role="switch"
            aria-checked={form.isBookmarked}
            onClick={() => update('isBookmarked', !form.isBookmarked)}
          >
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
            <StarIcon filled={form.isBookmarked} width={16} height={16} />
            保存后加入我的收藏
          </button>

          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <footer className="modal-footer">
          <button type="button" className="button ghost" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? '保存中…' : contact ? '保存修改' : '创建联系人'}
          </button>
        </footer>
      </form>
    </div>
  );
}

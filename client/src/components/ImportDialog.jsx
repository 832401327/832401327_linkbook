import { useRef, useState } from 'react';
import { AlertIcon, CheckIcon, CloseIcon, SheetIcon, UploadIcon } from './Icons.jsx';
import { api } from '../api.js';

export default function ImportDialog({ onClose, onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const pick = (candidate) => {
    setError('');
    setResult(null);
    if (!candidate) return;
    if (!/\.xlsx$/i.test(candidate.name)) {
      setError('请选择 .xlsx 格式的 Excel 文件（可先下载导入模板）');
      setFile(null);
      return;
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setError('文件不能超过 10 MB');
      setFile(null);
      return;
    }
    setFile(candidate);
  };

  const runImport = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const response = await api.importFile(file);
      setResult(response);
      onImported(response);
    } catch (importError) {
      setError(importError.message ?? '导入失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="import-modal" role="dialog" aria-modal="true" aria-label="导入 Excel">
        <header className="modal-header">
          <div>
            <h2>从 Excel 导入</h2>
            <p>每一行代表一位联系人，列标题需与模板保持一致。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭" disabled={busy}>
            <CloseIcon />
          </button>
        </header>

        <div className="modal-body">
          {result ? (
            <div className="import-result">
              <div className="result-icon success">
                <CheckIcon width={26} height={26} />
              </div>
              <h3>导入完成</h3>
              <p>
                成功导入 <strong>{result.imported}</strong> 位联系人
                {result.skipped ? `，跳过 ${result.skipped} 行` : ''}。
              </p>
              {result.warnings?.length ? (
                <ul className="warning-list">
                  {result.warnings.map((warning) => (
                    <li key={`${warning.row}-${warning.reason}`}>
                      第 {warning.row} 行：{warning.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <>
              <div
                className={`dropzone${dragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  pick(event.dataTransfer.files?.[0]);
                }}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  hidden
                  onChange={(event) => pick(event.target.files?.[0])}
                />
                {file ? (
                  <>
                    <span className="dropzone-icon file">
                      <SheetIcon width={26} height={26} />
                    </span>
                    <strong>{file.name}</strong>
                    <span className="muted">{(file.size / 1024).toFixed(1)} KB · 点击可重新选择</span>
                  </>
                ) : (
                  <>
                    <span className="dropzone-icon">
                      <UploadIcon width={26} height={26} />
                    </span>
                    <strong>把 .xlsx 文件拖到这里</strong>
                    <span className="muted">或点击选择文件，最大 10 MB</span>
                  </>
                )}
              </div>

              <div className="import-tips">
                <p>
                  <AlertIcon width={15} height={15} />
                  导入会追加联系人，不会覆盖已有数据；缺少姓名的行会被跳过。
                </p>
                <a href="/api/export/template" download>
                  <SheetIcon width={15} height={15} />
                  下载导入模板
                </a>
              </div>

              {error ? <p className="form-error">{error}</p> : null}
            </>
          )}
        </div>

        <footer className="modal-footer">
          {result ? (
            <button type="button" className="button primary" onClick={onClose}>
              完成
            </button>
          ) : (
            <>
              <button type="button" className="button ghost" onClick={onClose} disabled={busy}>
                取消
              </button>
              <button type="button" className="button primary" onClick={runImport} disabled={!file || busy}>
                {busy ? '导入中…' : '开始导入'}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

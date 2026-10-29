import { useRef, useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Upload() {
  const [searchParams] = useSearchParams();
  const examHint = searchParams.get('exam');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const inputRef = useRef(null);

  function loadBatches() {
    setLoadingBatches(true);
    api.uploadBatches()
      .then((data) => setBatches(data || []))
      .catch(() => {})
      .finally(() => setLoadingBatches(false));
  }

  useEffect(() => {
    loadBatches();
  }, []);

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.uploadFile(file);
      setResult(res);
      loadBatches(); // Refresh batch history immediately
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteBatch(id) {
    if (!window.confirm('Remove this upload record from history?')) return;
    try {
      await api.deleteUploadBatch(id);
      setBatches((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert('Failed to delete upload log');
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 1 — Ingestion</p>
        <h1 className="page-title">Upload Questions</h1>
        <p className="page-sub">
          Accepts typed <strong>.xlsx, .xls, .csv</strong> only — questions are saved directly to your 
          live <strong>Question Bank</strong>. Export your question sets using the standard Excel format and upload here.
        </p>
      </div>

      {examHint && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          Make sure your file's <strong>Exam</strong> column says exactly <strong>"{examHint}"</strong> so these questions land in the {examHint} bank.
        </div>
      )}

      <div
        className={`dropzone${dragActive ? ' active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="dropzone-icon">⇧</div>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>
          {uploading ? 'Uploading & adding to bank…' : 'Drag your file here, or click to browse'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Required columns: Question, OptionA–D, CorrectOption, Exam, Subject, Chapter.
          Optional: Topic, Difficulty, Solution, ImageFilename / QuestionImage.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && <div className="alert alert-danger" style={{ marginTop: 20 }}>{error}</div>}

      {result && (
        <div className="card card-pad" style={{ marginTop: 24 }}>
          <div className="alert alert-success" style={{ marginBottom: 20 }}>
            🎉 <strong>{result.fileName}</strong> uploaded! <strong>{result.successCount}</strong> of {result.totalRows} questions added directly to your Question Bank.
          </div>
          
          {result.successCount > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: result.errorCount > 0 ? 24 : 0 }}>
              <Link to="/questions" className="btn btn-primary">
                Open Question Bank →
              </Link>
              <button 
                className="btn btn-ghost" 
                style={{ border: '1px solid var(--line)' }}
                onClick={async () => {
                  try {
                    const blob = await api.previewBatch(result.batchId);
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  } catch (e) {
                    alert(e.message);
                  }
                }}
              >
                Preview Question Paper (PDF)
              </button>
            </div>
          )}

          {result.errorCount > 0 && (
            <>
              <h3 style={{ marginBottom: 10, fontSize: 16 }}>
                {result.errorCount} row(s) need attention
              </h3>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
                These rows were skipped — every other row imported successfully. Fix these
                in your source file and re-upload just the corrected rows.
              </p>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Row #</th><th>Issue(s)</th></tr></thead>
                  <tbody>
                    {result.errors.map((e) => (
                      <tr key={e.row}>
                        <td className="mono">{e.row}</td>
                        <td>
                          {e.errors.map((msg, i) => (
                            <div key={i} className="badge badge-danger" style={{ marginBottom: 4, marginRight: 4 }}>
                              {msg}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Persistent Upload History Table */}
      <div className="card card-pad" style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, margin: 0 }}>Recent Upload History</h3>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            {batches.length} batch(es) recorded
          </span>
        </div>

        {loadingBatches ? (
          <div className="skeleton" style={{ height: 160 }} />
        ) : batches.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            No files uploaded yet. Drag an Excel file above to get started.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Questions</th>
                  <th>Status</th>
                  <th>Uploaded At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.slice(0, 15).map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.fileName}</td>
                    <td>
                      <span style={{ color: 'var(--ink)' }}>{b.successCount}</span>
                      {b.errorCount > 0 && (
                        <span style={{ color: 'var(--danger)', fontSize: 12, marginLeft: 6 }}>
                          ({b.errorCount} skipped)
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-success" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                        ✓ In Bank
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                      {new Date(b.createdAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }}
                        onClick={async () => {
                          try {
                            const blob = await api.previewBatch(b.id);
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          } catch (e) {
                            alert(e.message);
                          }
                        }}
                        title="Download/Preview this batch as PDF"
                      >
                        📄 Preview PDF
                      </button>
                      <Link
                        to="/questions"
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: 12, marginRight: 8 }}
                      >
                        Browse Bank →
                      </Link>
                      <button
                        className="btn-danger-ghost"
                        style={{ padding: '3px 8px', fontSize: 12 }}
                        onClick={() => handleDeleteBatch(b.id)}
                        title="Remove upload log"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [previewingBatchId, setPreviewingBatchId] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  const inputRef = useRef(null);

  async function handlePreviewBatch(b, limit = null) {
    const batchId = typeof b === 'string' ? b : b.id;
    const fileName = (typeof b === 'object' && b?.fileName) ? b.fileName : 'batch-upload';
    const totalCount = typeof b === 'object' ? (b?.questionsAdded || b?.totalRows || null) : null;

    setPreviewingBatchId(batchId);
    try {
      const { url, filename } = await api.downloadBatchPreview(batchId, fileName, limit);
      setPreviewModal({
        url,
        fileName: filename,
        batchId,
        rawBatch: b,
        totalCount,
      });
    } catch (err) {
      alert(err.message || 'Failed to generate PDF preview.');
    } finally {
      setPreviewingBatchId(null);
    }
  }

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
    <div style={{ width: '100%' }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>⇧</span>
              <span>Ingestion Suite &bull; Master Database</span>
            </div>
            <h1 className="studio-title">Upload Questions</h1>
            <p className="studio-sub">
              Batch import structured question files directly into the master PostgreSQL repository. 
              Supports <strong>.xlsx, .xls, .csv</strong> with automatic schema checks, LaTeX math parsing, and instant indexing.
            </p>
          </div>
          <Link
            to="/questions"
            className="btn btn-secondary"
            style={{ padding: '10px 18px', fontSize: 13.5, fontWeight: 700 }}
          >
            Explore Question Bank &rarr;
          </Link>
        </div>

        <div className="studio-chips">
          <div className="studio-chip">
            <span>Accepted Formats:</span> <strong>Excel (.xlsx, .xls), CSV</strong>
          </div>
          <div className="studio-chip">
            <span>Destination:</span> <strong>Verified Question Bank</strong>
          </div>
          <div className="studio-chip">
            <span>Validation:</span> <strong>Zero Schema Bottlenecks</strong>
          </div>
        </div>
      </div>

      {examHint && (
        <div className="alert alert-success" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <span>
            Target Exam Active: Ensure your file&apos;s <strong>Exam</strong> column specifies <strong>&ldquo;{examHint}&rdquo;</strong> so these questions are mapped properly.
          </span>
        </div>
      )}

      {/* Modern Drag and Drop Dropzone */}
      <div
        className={`dropzone${dragActive ? ' active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="dropzone-icon">
          {uploading ? '⏳' : '☁️'}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
          {uploading ? 'Parsing & Indexing Questions...' : 'Drag and drop your spreadsheet here'}
        </h3>
        <p style={{ fontSize: 14, color: '#64748B', maxWidth: 480, margin: '0 auto 16px' }}>
          Click to browse from your computer. System auto-extracts formulas, option keys, and chapter associations.
        </p>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <span style={{ background: '#EFF6FF', color: '#1E40AF', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, border: '1px solid #BFDBFE' }}>
            .XLSX
          </span>
          <span style={{ background: '#F0FDF4', color: '#166534', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, border: '1px solid #BBF7D0' }}>
            .XLS
          </span>
          <span style={{ background: '#FAF5FF', color: '#6B21A8', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, border: '1px solid #E9D5FF' }}>
            .CSV
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Upload Result Feedback */}
      {result && (
        <div className="executive-card" style={{ marginTop: 24 }}>
          <div className="alert alert-success" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Upload Successful: {result.fileName}</div>
              <div style={{ fontSize: 13, color: '#166534', marginTop: 2 }}>
                <strong>{result.successCount}</strong> of {result.totalRows} questions imported directly into the Question Bank.
              </div>
            </div>
          </div>
          
          {result.successCount > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: result.errorCount > 0 ? 24 : 0 }}>
              <Link to="/questions" className="btn btn-primary">
                Open Question Bank &rarr;
              </Link>
              <button 
                type="button"
                className="btn btn-ghost" 
                disabled={previewingBatchId === result.batchId}
                onClick={() => handlePreviewBatch({ id: result.batchId, fileName: result.fileName, questionsAdded: result.successCount })}
                title="Download & Preview this uploaded batch as PDF"
              >
                {previewingBatchId === result.batchId ? '⏳ Preparing PDF...' : '📄 Preview Batch PDF'}
              </button>
            </div>
          )}

          {result.errorCount > 0 && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#991B1B' }}>
                {result.errorCount} row(s) encountered validation errors
              </h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
                Valid rows were successfully imported. Review the errors below, correct your spreadsheet, and re-upload the remaining rows.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>Row #</th>
                      <th>Validation Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e) => (
                      <tr key={e.row}>
                        <td className="mono" style={{ fontWeight: 700 }}>#{e.row}</td>
                        <td>
                          {e.errors.map((msg, i) => (
                            <span key={i} className="badge badge-danger" style={{ marginRight: 6, marginBottom: 4, display: 'inline-block' }}>
                              {msg}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Required Format Guide Card */}
      <div className="executive-card" style={{ marginTop: 24 }}>
        <h3 className="card-section-title" style={{ marginBottom: 12 }}>
          <span>📋</span> Standard Spreadsheet Columns
        </h3>
        <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 16px' }}>
          Format your Excel columns using these exact column names for automated schema mapping:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', marginBottom: 6 }}>
              Required Columns
            </div>
            <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
              <code>Question</code>, <code>OptionA</code>, <code>OptionB</code>, <code>OptionC</code>, <code>OptionD</code>, <code>CorrectOption</code>, <code>Exam</code>, <code>Subject</code>, <code>Chapter</code>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', marginBottom: 6 }}>
              Optional Add-ons
            </div>
            <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
              <code>Topic</code>, <code>Difficulty</code> (EASY / MEDIUM / HARD), <code>Solution</code>, <code>QuestionImage</code>, <code>ImageFilename</code>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Upload History */}
      <div className="executive-card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Recent Batch Ingestion Logs
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
              Historical record of spreadsheet uploads and questions indexed into PostgreSQL.
            </p>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '4px 12px', borderRadius: 9999 }}>
            {batches.length} Batch(es)
          </span>
        </div>

        {loadingBatches ? (
          <div className="skeleton" style={{ height: 180, borderRadius: 14 }} />
        ) : batches.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
            No uploads recorded yet. Drag an Excel spreadsheet above to import your first batch.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Spreadsheet Name</th>
                  <th>Questions Added</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.slice(0, 15).map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>
                      <span style={{ marginRight: 8 }}>📄</span>
                      {b.fileName}
                    </td>

                    <td>
                      <span style={{ fontWeight: 800, color: '#166534' }}>{b.successCount} Qs</span>
                      {b.errorCount > 0 && (
                        <span style={{ color: '#DC2626', fontSize: 12, marginLeft: 6, fontWeight: 600 }}>
                          ({b.errorCount} skipped)
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="badge badge-success">● Indexed</span>
                    </td>

                    <td className="mono" style={{ fontSize: 12, color: '#64748B' }}>
                      {new Date(b.createdAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '5px 12px', fontSize: 12, marginRight: 6 }}
                        disabled={previewingBatchId === b.id}
                        onClick={() => handlePreviewBatch(b)}
                        title="Download & Preview this batch as PDF"
                      >
                        {previewingBatchId === b.id ? '⏳ Preparing...' : '📄 Preview PDF'}
                      </button>
                      <Link
                        to="/questions"
                        className="btn btn-secondary"
                        style={{ padding: '5px 12px', fontSize: 12, marginRight: 6 }}
                      >
                        Inspect Bank &rarr;
                      </Link>
                      <button
                        type="button"
                        className="btn-danger-ghost"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => handleDeleteBatch(b.id)}
                        title="Remove upload log"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive In-App PDF Preview Modal */}
      {previewModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setPreviewModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 1100,
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 22px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                    Batch Ingestion PDF Preview
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                    <strong>{previewModal.fileName}</strong>
                    {previewModal.totalCount ? ` • Total ${previewModal.totalCount} questions in batch` : ''}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {previewModal.totalCount > 50 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}
                    disabled={previewingBatchId === previewModal.batchId}
                    onClick={() => handlePreviewBatch(previewModal.rawBatch || previewModal.batchId, 'all')}
                    title="Render all questions from this batch into a single complete PDF"
                  >
                    {previewingBatchId === previewModal.batchId ? '⏳ Compiling All Questions...' : '📦 Load Full Batch (All Qs)'}
                  </button>
                )}

                <a
                  href={previewModal.url}
                  download={previewModal.fileName}
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                >
                  💾 Download PDF
                </a>

                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '6px 10px', fontSize: 18, lineHeight: 1, color: '#64748B' }}
                  onClick={() => setPreviewModal(null)}
                  title="Close Preview"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer */}
            <div style={{ flex: 1, width: '100%', background: '#334155', position: 'relative' }}>
              <iframe
                src={previewModal.url}
                title="Batch PDF Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

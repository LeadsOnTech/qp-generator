import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function Upload() {
  const [searchParams] = useSearchParams();
  const examHint = searchParams.get('exam');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.uploadFile(file);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
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
          Accepts typed <strong>.xlsx, .xls, .csv</strong> only — scanned/image PDFs are
          intentionally not supported, since OCR is where most errors creep in. Export your typed
          question sets to the Excel template below and upload here.
        </p>
      </div>

      {examHint && (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
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
          {uploading ? 'Uploading & checking rows…' : 'Drag your file here, or click to browse'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Required columns: Question, OptionA–D, CorrectOption, Exam, Subject, Chapter
          (Topic, QuestionType, Difficulty, ImageFilename optional — upload diagram images in
          the Image Library first, then reference the saved filename here for Diagram-based questions)
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
            <strong>{result.fileName}</strong> uploaded — {result.successCount} of {result.totalRows} rows parsed successfully and saved as Drafts.
          </div>
          
          {result.successCount > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: result.errorCount > 0 ? 24 : 0 }}>
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
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await api.submitBatchQc(result.batchId);
                    window.location.href = '/checks';
                  } catch (e) {
                    alert('Failed to submit batch: ' + e.message);
                  }
                }}
              >
                Submit for Quality Check
              </button>
            </div>
          )}

          {result.errorCount > 0 && (
            <>
              <h3 style={{ marginBottom: 10, fontSize: 16 }}>
                {result.errorCount} row(s) need attention
              </h3>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
                These rows were skipped — every other row still imported successfully. Fix these
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
    </div>
  );
}

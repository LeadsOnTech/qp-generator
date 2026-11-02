import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import MathText from './MathText';

export default function SearchImageModal({ onClose, onSelect }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSearch() {
    if (!file) {
      setError('Please select an image first.');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);
    setExtractedText('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const data = await api.searchQuestionByImage(formData);
      setExtractedText(data.extractedText || '');
      setResults(data.matches || []);
      if ((data.matches || []).length === 0) {
        setError('No close matching questions found in your bank for this image.');
      }
    } catch (err) {
      setError(err.message || 'Failed to search questions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        style={{
          width: 660,
          maxWidth: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔍</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Search Question by Screenshot
            </h2>
          </div>
          <button
            className="close-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: '#64748b',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
            Upload a photo or screenshot of a question (including math, equations, or chemical formulas).
            Our AI will read the text and match it against your question bank.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px',
              border: '2px dashed #cbd5e1',
              borderRadius: 8,
              background: '#f8fafc',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                  setError('');
                }
              }}
              ref={fileInput}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInput.current.click()}
              style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600 }}
            >
              📷 Choose Image
            </button>
            <span style={{ fontSize: 13, color: file ? '#0f172a' : '#94a3b8', fontWeight: file ? 600 : 400 }}>
              {file ? file.name : 'No image chosen yet'}
            </span>

            {previewUrl && (
              <div style={{ width: '100%', marginTop: 8 }}>
                <img
                  src={previewUrl}
                  alt="Chosen question screenshot"
                  style={{
                    maxHeight: 150,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                  }}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !file}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 6,
              cursor: loading || !file ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                🤖 AI analyzing image &amp; searching bank...
              </>
            ) : (
              '⚡ Search Question Bank'
            )}
          </button>

          {error && (
            <div
              className="alert alert-danger"
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 6,
                fontSize: 13,
                background: '#fef2f2',
                border: '1px solid #fecdd3',
                color: '#b91c1c',
              }}
            >
              {error}
            </div>
          )}

          {extractedText && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 6,
                fontSize: 12,
                color: '#166534',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Extracted Text from Image:</div>
              <div style={{ color: '#14532d', fontStyle: 'italic', lineHeight: 1.45 }}>
                &ldquo;{extractedText}&rdquo;
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                Top Matches ({results.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map((q) => (
                  <div
                    key={q.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 14,
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span
                            style={{
                              background: q.matchScore >= 50 ? '#dcfce7' : '#fef3c7',
                              color: q.matchScore >= 50 ? '#15803d' : '#b45309',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {q.matchScore}% Match
                          </span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            {q.chapter?.subject?.name} &gt; {q.chapter?.name}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.5, marginTop: 6 }}>
                          <MathText text={q.questionText} />
                        </div>
                        {(q.optionA || q.optionB) && (
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {q.optionA && <div><strong>(A)</strong> <MathText text={q.optionA} /></div>}
                            {q.optionB && <div><strong>(B)</strong> <MathText text={q.optionB} /></div>}
                            {q.optionC && <div><strong>(C)</strong> <MathText text={q.optionC} /></div>}
                            {q.optionD && <div><strong>(D)</strong> <MathText text={q.optionD} /></div>}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onSelect(q)}
                        style={{
                          fontSize: 12,
                          padding: '6px 14px',
                          whiteSpace: 'nowrap',
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        Select &amp; Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

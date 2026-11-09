import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import MathText from '../components/MathText';

export default function Duplicates() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    setLoading(true);
    api.duplicates()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function removeOne(id) {
    if (!window.confirm('Remove this duplicate copy from the question bank? (Soft-deleted — preserved for audit, excluded from test papers).')) return;
    try {
      setActionLoading(true);
      await api.deleteQuestion(id);
      load();
    } catch (err) {
      alert(err.message || 'Failed to remove question.');
    } finally {
      setActionLoading(false);
    }
  }

  async function removeGroupExtra(group) {
    const extraIds = group.slice(1).map((q) => q.id);
    if (!window.confirm(`Keep the original copy and remove ${extraIds.length} duplicate cop${extraIds.length > 1 ? 'ies' : 'y'} in this group?`)) return;
    try {
      setActionLoading(true);
      await api.removeDuplicateIds(extraIds);
      load();
    } catch (err) {
      alert(err.message || 'Failed to remove duplicate group copies.');
    } finally {
      setActionLoading(false);
    }
  }

  async function removeBulk() {
    if (!window.confirm(`Are you sure you want to remove ALL ${data.totalDuplicates} duplicate copies across the bank at once?\n\nThe oldest original copy in each group will be kept safe.`)) return;
    try {
      setActionLoading(true);
      await api.removeBulkDuplicates();
      load();
    } catch (err) {
      alert(err.message || 'Failed to bulk-remove duplicates.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 60 }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>⧉</span>
              <span>Bank Hygiene &bull; Deduplication Engine</span>
            </div>
            <h1 className="studio-title">Smart Duplicate Detection</h1>
            <p className="studio-sub">
              Detects and removes duplicate questions from redundant file re-uploads. Strict <strong>5-Point Composite Matching</strong> inspects Chapter, Question Content, Diagram Images, and Options A–D with zero false alarms.
            </p>
          </div>
          {data?.totalDuplicates > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: 13.5, fontWeight: 700 }}
              onClick={removeBulk}
              disabled={actionLoading}
            >
              {actionLoading ? 'Cleaning…' : `Purge All ${data.totalDuplicates} Duplicates`}
            </button>
          )}
        </div>

        <div className="studio-chips">
          <div className="studio-chip">
            <span>Duplicate Groups:</span> <strong>{data?.groupCount || 0}</strong>
          </div>
          <div className="studio-chip">
            <span>Extra Copies:</span> <strong>{data?.totalDuplicates || 0}</strong>
          </div>
          <div className="studio-chip">
            <span>Diagram Safety:</span> <strong>Active (Diagram-Sensitive)</strong>
          </div>
        </div>
      </div>

      {/* Safety Shield Banner */}
      <div
        style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 22 }}>🛡️</span>
        <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
          <strong>Image & Chapter Protection Active:</strong> Questions with different chemical structure diagrams,
          different physics circuits, or questions in different chapters (e.g. Alcohols vs Amines) are strictly protected
          and never grouped together.
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 260, borderRadius: 8 }} />
      ) : !data || data.groupCount === 0 ? (
        <div className="card empty-state" style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>✨</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#0f172a' }}>Zero Duplicates Found</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Your question bank is clean. All active questions have unique diagrams, options, and text.
          </p>
        </div>
      ) : (
        <>
          {/* Main Action Bar */}
          <div
            className="alert"
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 8,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div>
              <div style={{ color: '#9f1239', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                Found {data.groupCount} duplicated question group{data.groupCount !== 1 ? 's' : ''}
              </div>
              <div style={{ color: '#be123c', fontSize: 13 }}>
                <strong>{data.totalDuplicates}</strong> extra cop{data.totalDuplicates !== 1 ? 'ies' : 'y'} can safely be removed while keeping the original.
              </div>
            </div>
            <button
              className="btn btn-primary"
              disabled={actionLoading}
              onClick={removeBulk}
              style={{
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 600,
                background: '#e11d48',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🗑️ Remove all {data.totalDuplicates} extra copies
            </button>
          </div>

          {/* Duplicate Groups List */}
          {data.groups.map((group, gi) => {
            const original = group[0];
            const extraCopies = group.slice(1);

            return (
              <div
                key={gi}
                className="card card-pad"
                style={{
                  marginBottom: 20,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}
              >
                {/* Group Top Metadata Strip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 12,
                    marginBottom: 14,
                    borderBottom: '1px solid #f1f5f9',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {original.exam}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      {original.subject}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>
                      {original.chapter}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 12,
                        background: '#fee2e2',
                        color: '#991b1b',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontWeight: 600,
                      }}
                    >
                      {group.length} copies ({extraCopies.length} extra)
                    </span>
                    <button
                      className="btn-danger-ghost"
                      disabled={actionLoading}
                      onClick={() => removeGroupExtra(group)}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        borderRadius: 6,
                        border: '1px solid #fca5a5',
                        background: '#fff',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Remove {extraCopies.length} extra
                    </button>
                  </div>
                </div>

                {/* Question Stem */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', lineHeight: 1.55 }}>
                    <MathText text={original.questionText} />
                  </div>
                </div>

                {/* Question Diagram Image Preview (if present) */}
                {original.imageUrl && (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: 10,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      🖼️ Diagram: <code style={{ color: '#0f172a', background: '#e2e8f0', padding: '1px 5px', borderRadius: 3 }}>{original.imageFilename}</code>
                    </div>
                    <img
                      src={`${api.imageBase()}${original.imageUrl}`}
                      alt={original.imageFilename}
                      style={{
                        maxHeight: 130,
                        maxWidth: '100%',
                        objectFit: 'contain',
                        borderRadius: 4,
                        background: '#fff',
                        border: '1px solid #cbd5e1',
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Options Preview */}
                {(original.optionA || original.optionB || original.optionC || original.optionD) && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 8,
                      marginBottom: 16,
                      background: '#f8fafc',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    {[
                      { key: 'A', text: original.optionA, img: original.optionAImage },
                      { key: 'B', text: original.optionB, img: original.optionBImage },
                      { key: 'C', text: original.optionC, img: original.optionCImage },
                      { key: 'D', text: original.optionD, img: original.optionDImage },
                    ].map((opt) => (
                      <div
                        key={opt.key}
                        style={{
                          fontSize: 13,
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          background: '#fff',
                          padding: '6px 10px',
                          borderRadius: 4,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <strong style={{ color: '#6366f1' }}>({opt.key})</strong>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <MathText text={opt.text} />
                          {opt.img && (
                            <img
                              src={`${api.imageBase()}/uploads/images/${opt.img}`}
                              alt={opt.key}
                              style={{ maxHeight: 40, marginTop: 4, display: 'block' }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comparison Table of All Copies */}
                <div className="table-wrap">
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Status</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>From File</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Difficulty</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Added On</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((q, qi) => (
                        <tr
                          key={q.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: qi === 0 ? '#f0fdf4' : '#fff',
                          }}
                        >
                          <td style={{ padding: '8px 12px' }}>
                            {qi === 0 ? (
                              <span
                                style={{
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  fontWeight: 600,
                                  fontSize: 12,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                ✓ Original (Kept)
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  fontWeight: 600,
                                  fontSize: 12,
                                }}
                              >
                                Duplicate
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: '#1e293b' }}>
                            {q.sourceFileName || '—'}
                            {q.sourceRow ? (
                              <span style={{ color: '#64748b' }}> (row {q.sourceRow})</span>
                            ) : ''}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 12 }}>
                            {new Date(q.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {qi > 0 ? (
                              <button
                                className="btn-danger-ghost"
                                disabled={actionLoading}
                                onClick={() => removeOne(q.id)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: 12,
                                  borderRadius: 4,
                                  border: '1px solid #fecdd3',
                                  background: '#fff',
                                  color: '#e11d48',
                                  cursor: 'pointer',
                                }}
                              >
                                Remove copy
                              </button>
                            ) : (
                              <span style={{ color: '#15803d', fontSize: 12, fontWeight: 500 }}>
                                Primary Copy
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BulkRemovePanel from '../components/BulkRemovePanel';
import SearchImageModal from '../components/SearchImageModal';
import EditQuestionModal from '../components/EditQuestionModal';

const DIFFICULTIES = ['UNTAGGED', 'EASY', 'MEDIUM', 'HARD'];

function formatChemicals(text) {
  if (!text) return text;
  const chemRegexGlob = /\b(\d*)((?:[A-Z][a-z]?|[()[\]]|\d)+)\b/g;
  return text.replace(chemRegexGlob, (match, p1, p2) => {
    const invalidLower = p2.replace(/[A-Z][a-z]?/g, '').match(/[a-z]/);
    if (/\d/.test(p2) && /[A-Z]/.test(p2) && !invalidLower) {
      const subbedP2 = p2.replace(/\d+/g, (digits) => {
        return digits.split('').map(d => String.fromCharCode(0x2080 + parseInt(d))).join('');
      });
      return p1 + subbedP2;
    }
    return match;
  });
}

function formatHeadingText(text) {
  if (!text) return text;
  let formattedText = formatChemicals(String(text));
  const regex = /(Statement I\s*[:\.]|Statement II\s*[:\.]|Statement 1\s*[:\.]|Statement 2\s*[:\.]|Assertion\s*(?:\(A\))?\s*[:\.]|Reason\s*(?:\(R\))?\s*[:\.]|Statement-1\s*[:\.]|Statement-2\s*[:\.]|Statement - 1\s*[:\.]|Statement - 2\s*[:\.])/gi;
  
  const headingRegex = /(?:\s*)(Statement I\s*[:\.]|Statement II\s*[:\.]|Statement 1\s*[:\.]|Statement 2\s*[:\.]|Assertion\s*(?:\(A\))?\s*[:\.]|Reason\s*(?:\(R\))?\s*[:\.]|Statement-1\s*[:\.]|Statement-2\s*[:\.]|Statement - 1\s*[:\.]|Statement - 2\s*[:\.])/gi;
  formattedText = formattedText.replace(headingRegex, '\n$1').trim();
  
  const parts = formattedText.split(regex);
  return parts.map((part, i) => {
    if (i % 2 === 1) return <strong key={i} style={{ color: '#0F172A' }}>{part}</strong>;
    return part.split('\n').map((line, j) => <React.Fragment key={`${i}-${j}`}>{j > 0 && <br/>}{line}</React.Fragment>);
  });
}

export default function QuestionBank() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ exam: '', subject: '', chapter: '', topic: '', difficulty: '', search: '' });
  const [page, setPage] = useState(1);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [tree, setTree] = useState([]);
  const pageSize = 20;

  useEffect(() => {
    api.syllabusTree().then(setTree).catch(() => {});
  }, []);

  const examOptions = tree.map((e) => e.name);
  const currentExam = tree.find((e) => e.name === filters.exam);
  const subjectOptions = currentExam ? currentExam.subjects.map((s) => s.name) : [];
  const currentSubject = currentExam?.subjects.find((s) => s.name === filters.subject);
  const chapterOptions = currentSubject ? currentSubject.chapters.map((c) => c.name) : [];
  const currentChapter = currentSubject?.chapters.find((c) => c.name === filters.chapter);
  const topicOptions = currentChapter ? currentChapter.topics.map((t) => t.name) : [];

  function updateFilter(field, value) {
    setFilters((f) => {
      const next = { ...f, [field]: value };
      if (field === 'exam') { next.subject = ''; next.chapter = ''; next.topic = ''; }
      if (field === 'subject') { next.chapter = ''; next.topic = ''; }
      if (field === 'chapter') { next.topic = ''; }
      return next;
    });
    setPage(1);
  }

  const load = useCallback(() => {
    setLoading(true);
    const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api.listQuestions({ ...cleanFilters, page, pageSize })
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  async function setDifficulty(id, difficulty) {
    await api.updateQuestion(id, { difficulty, difficultySource: 'HUMAN_REVIEWED' });
    setItems((prev) => prev.map((q) => (q.id === id ? { ...q, difficulty, difficultySource: 'HUMAN_REVIEWED' } : q)));
  }

  async function removeQuestion(id) {
    if (!window.confirm('Are you sure you want to permanently delete this question?')) return;
    try {
      await api.deleteQuestion(id);
    } catch (err) {
      alert(err.message || 'Failed to delete question');
      return;
    }
    setItems((prev) => prev.filter((q) => q.id !== id));
    setTotal((t) => t - 1);
  }

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div style={{ width: '100%' }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>▤</span>
              <span>Verified Bank &bull; Master Repository</span>
            </div>
            <h1 className="studio-title">Question Bank</h1>
            <p className="studio-sub">
              {isAdmin
                ? 'Curate, inspect, and classify questions. Chapters excluded in the Syllabus Master are automatically blocked from paper generation.'
                : 'Explore the shared repository of curated questions across exams, subjects, and difficulty tiers.'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '10px 18px', fontSize: 13.5, fontWeight: 700 }}
            onClick={() => setShowSearchModal(true)}
          >
            <span>📷</span> Visual Screenshot Search
          </button>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="studio-chips">
          <div className="studio-chip">
            <span>Indexed Questions:</span> <strong>{total.toLocaleString()}</strong>
          </div>
          <div className="studio-chip">
            <span>Filter Match:</span> <strong>Page {page} of {totalPages}</strong>
          </div>
          {filters.exam && (
            <div className="studio-chip">
              <span>Exam:</span> <strong>{filters.exam}</strong>
            </div>
          )}
          {filters.subject && (
            <div className="studio-chip">
              <span>Subject:</span> <strong>{filters.subject}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Admin Bulk Tools */}
      {isAdmin && <BulkRemovePanel tree={tree} onDone={load} />}

      {/* Filter and Search Bar */}
      <div className="filter-strip">
        <div className="field" style={{ minWidth: 140, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Exam</label>
          <select value={filters.exam} onChange={(e) => updateFilter('exam', e.target.value)}>
            <option value="">All Exams</option>
            {examOptions.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        <div className="field" style={{ minWidth: 140, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Subject</label>
          <select value={filters.subject} onChange={(e) => updateFilter('subject', e.target.value)} disabled={!filters.exam}>
            <option value="">All Subjects</option>
            {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="field" style={{ minWidth: 160, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Chapter</label>
          <select value={filters.chapter} onChange={(e) => updateFilter('chapter', e.target.value)} disabled={!filters.subject}>
            <option value="">All Chapters</option>
            {chapterOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="field" style={{ minWidth: 140, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Topic</label>
          <select value={filters.topic} onChange={(e) => updateFilter('topic', e.target.value)} disabled={!filters.chapter || topicOptions.length === 0}>
            <option value="">All Topics</option>
            {topicOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="field" style={{ minWidth: 130, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Difficulty</label>
          <select
            value={filters.difficulty}
            onChange={(e) => { setFilters((f) => ({ ...f, difficulty: e.target.value })); setPage(1); }}
          >
            <option value="">All Levels</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Keyword Search</label>
          <input
            type="text"
            placeholder="Search question text or formulas..."
            value={filters.search}
            onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
          />
        </div>

        {(filters.exam || filters.subject || filters.chapter || filters.topic || filters.difficulty || filters.search) && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '10px 14px', fontSize: 12.5 }}
            onClick={() => {
              setFilters({ exam: '', subject: '', chapter: '', topic: '', difficulty: '', search: '' });
              setPage(1);
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />
      ) : items.length === 0 ? (
        <div className="executive-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
            No questions match these filters
          </h3>
          <p style={{ fontSize: 14, color: '#64748B', maxWidth: 440, margin: '0 auto 18px' }}>
            Try clearing one of your filter dropdowns or upload new question batches from the Ingestion portal.
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '42%' }}>Question Content</th>
                  <th>Exam / Subject</th>
                  <th>Chapter</th>
                  <th>Syllabus</th>
                  <th>Difficulty</th>
                  <th>Verification</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr key={q.id}>
                    <td className="q-text" style={{ padding: '18px 20px', verticalAlign: 'top' }}>
                      {q.imageUrl && (
                        <img
                          src={`${api.imageBase()}${q.imageUrl}`}
                          alt="Question diagram"
                          style={{
                            width: 72,
                            height: 48,
                            objectFit: 'contain',
                            float: 'right',
                            marginLeft: 12,
                            borderRadius: 6,
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                          }}
                        />
                      )}
                      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#1E293B' }}>
                        {formatHeadingText(q.questionText)}
                      </div>

                      {q.optionImageUrls && Object.values(q.optionImageUrls).some(Boolean) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          {['A', 'B', 'C', 'D'].map((key) => q.optionImageUrls[key] ? (
                            <span key={key} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 11,
                              background: '#F8FAFC',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #E2E8F0'
                            }}>
                              <strong style={{ color: '#0F172A' }}>({key})</strong>
                              <img src={`${api.imageBase()}${q.optionImageUrls[key]}`} alt={key} style={{ maxHeight: 28, maxWidth: 50, objectFit: 'contain' }} />
                            </span>
                          ) : null)}
                        </div>
                      )}
                    </td>

                    <td style={{ verticalAlign: 'top', paddingTop: 18 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{q.exam}</div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{q.subject}</div>
                    </td>

                    <td style={{ verticalAlign: 'top', paddingTop: 18 }}>
                      <div style={{ fontSize: 13, color: '#334155', maxWidth: 180 }}>{q.chapter}</div>
                    </td>

                    <td style={{ verticalAlign: 'top', paddingTop: 18 }}>
                      {q.syllabusStatus === 'REMOVED' ? (
                        <span className="badge badge-danger">Excluded</span>
                      ) : q.syllabusStatus === 'MODIFIED' ? (
                        <span className="badge badge-warn">Modified</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>

                    <td style={{ verticalAlign: 'top', paddingTop: 18 }}>
                      {isAdmin ? (
                        <select
                          className="status-select"
                          value={q.difficulty}
                          onChange={(e) => setDifficulty(q.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 12,
                            fontWeight: 700,
                            borderRadius: 8,
                            borderColor: '#CBD5E1',
                            background: '#FFFFFF',
                          }}
                        >
                          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : (
                        <span className={`badge ${
                          q.difficulty === 'EASY' ? 'badge-success' :
                          q.difficulty === 'MEDIUM' ? 'badge-warn' :
                          q.difficulty === 'HARD' ? 'badge-danger' : 'badge-neutral'
                        }`}>
                          {q.difficulty}
                        </span>
                      )}
                    </td>

                    <td style={{ verticalAlign: 'top', paddingTop: 18 }}>
                      {q.verificationLevel === 'AIA_VERIFIED' ? (
                        <span className="badge badge-gold">★ AIA Verified</span>
                      ) : (
                        <span className="badge badge-neutral">Standard</span>
                      )}
                    </td>

                    {isAdmin && (
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'top', paddingTop: 18 }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '5px 10px', fontSize: 12, marginRight: 6 }}
                          onClick={() => setEditingQuestion(q)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-danger-ghost"
                          style={{ padding: '5px 8px', fontSize: 12 }}
                          onClick={() => removeQuestion(q.id)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: '0 4px' }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              Showing {items.length} of {total.toLocaleString()} questions &bull; Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                &larr; Previous
              </button>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 12px',
                fontSize: 13,
                fontWeight: 700,
                color: '#0F172A',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10
              }}>
                {page} / {totalPages}
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </>
      )}

      {/* Screenshot Search Modal */}
      {showSearchModal && (
        <SearchImageModal
          onClose={() => setShowSearchModal(false)}
          onSelect={(q) => { setShowSearchModal(false); setEditingQuestion(q); }}
          onDelete={() => { load(); }}
        />
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={() => { setEditingQuestion(null); load(); }}
          onDelete={() => { setEditingQuestion(null); load(); }}
        />
      )}
    </div>
  );
}

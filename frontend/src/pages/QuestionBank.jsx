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
    if (i % 2 === 1) return <strong key={i}>{part}</strong>;
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
      // Cascading reset: changing a higher-level filter clears the ones below it
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
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 1 — Verified Bank</p>
        <h1 className="page-title">Question Bank</h1>
        <p className="page-sub">
          {isAdmin
            ? <>Browse, filter, and tag every question. Chapters marked <em>Removed</em> in the Syllabus Master are automatically excluded from paper generation — you don't need to touch them here.</>
            : <>Browse the shared question bank to see what's available before generating a paper — filter by exam, subject, chapter, and difficulty.</>}
        </p>
      </div>

      {isAdmin && <BulkRemovePanel tree={tree} onDone={load} />}

      <div className="filter-bar">
        <div className="field">
          <label>Exam</label>
          <select value={filters.exam} onChange={(e) => updateFilter('exam', e.target.value)}>
            <option value="">All</option>
            {examOptions.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Subject</label>
          <select value={filters.subject} onChange={(e) => updateFilter('subject', e.target.value)} disabled={!filters.exam}>
            <option value="">All</option>
            {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Chapter</label>
          <select value={filters.chapter} onChange={(e) => updateFilter('chapter', e.target.value)} disabled={!filters.subject}>
            <option value="">All</option>
            {chapterOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Topic</label>
          <select value={filters.topic} onChange={(e) => updateFilter('topic', e.target.value)} disabled={!filters.chapter || topicOptions.length === 0}>
            <option value="">All</option>
            {topicOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Difficulty</label>
          <select
            value={filters.difficulty}
            onChange={(e) => { setFilters((f) => ({ ...f, difficulty: e.target.value })); setPage(1); }}
          >
            <option value="">All</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <label>Search question text</label>
          <div style={{display: 'flex', gap: '8px'}}>
            <input
            type="text"
            placeholder="Search…"
            value={filters.search}
            onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
          />
          <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowSearchModal(true)}>📷 Search by Screenshot</button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 400 }} />
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <h3>No questions match these filters</h3>
          <p>Try clearing a filter, or upload a new batch from the Upload page.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Exam / Subject</th>
                  <th>Chapter</th>
                  <th>Syllabus</th>
                  <th>Difficulty</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr key={q.id}>
                    <td className="q-text">
                      {q.imageUrl && (
                        <img
                          src={`${api.imageBase()}${q.imageUrl}`}
                          alt=""
                          style={{ width: 60, height: 40, objectFit: 'contain', float: 'right', marginLeft: 8, borderRadius: 4, background: 'var(--paper-dim)' }}
                        />
                      )}
                      {formatHeadingText(q.questionText)}
                      {q.optionImageUrls && Object.values(q.optionImageUrls).some(Boolean) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          {['A', 'B', 'C', 'D'].map((key) => q.optionImageUrls[key] ? (
                            <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                              <strong>({key})</strong>
                              <img src={`${api.imageBase()}${q.optionImageUrls[key]}`} alt={key} style={{ maxHeight: 28, maxWidth: 50, objectFit: 'contain' }} />
                            </span>
                          ) : null)}
                        </div>
                      )}
                    </td>
                    <td>{q.exam} / {q.subject}</td>
                    <td>{q.chapter}</td>
                    <td>
                      {q.syllabusStatus === 'REMOVED'
                        ? <span className="badge badge-danger">Removed</span>
                        : q.syllabusStatus === 'MODIFIED'
                        ? <span className="badge badge-warn">Modified</span>
                        : <span className="badge badge-success">Active</span>}
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          className="status-select"
                          value={q.difficulty}
                          onChange={(e) => setDifficulty(q.id, e.target.value)}
                        >
                          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : (
                        <span className="badge badge-neutral">{q.difficulty}</span>
                      )}
                    </td>
                    <td>
                      {q.verificationLevel === 'AIA_VERIFIED'
                        ? <span className="badge badge-gold">AIA Verified</span>
                        : <span className="badge badge-neutral">Community</span>}
                    </td>
                    <td>
                      {isAdmin && (
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button className="btn-secondary-ghost" style={{marginRight: '8px'}} onClick={() => setEditingQuestion(q)}>Edit</button>
                          <button className="btn-danger-ghost" onClick={() => removeQuestion(q.id)}>
                          Remove
                        </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {total} question{total !== 1 ? 's' : ''} total — page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
      {showSearchModal && <SearchImageModal onClose={() => setShowSearchModal(false)} onSelect={(q) => { setShowSearchModal(false); setEditingQuestion(q); }} />}
      {editingQuestion && <EditQuestionModal question={editingQuestion} onClose={() => setEditingQuestion(null)} onSave={() => { setEditingQuestion(null); load(); }} />}
    </div>
  );
}

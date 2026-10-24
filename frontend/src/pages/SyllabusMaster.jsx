import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function SyllabusMaster() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.syllabusTree()
      .then(setTree)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function changeStatus(chapterId, examId, subjectId, syllabusStatus) {
    let statusNote = null;
    if (syllabusStatus === 'REMOVED') {
      statusNote = window.prompt('Optional: note why this chapter was removed (e.g. "Removed in NEET 2026 syllabus revision")') || null;
    }
    await api.updateChapterStatus(chapterId, { syllabusStatus, statusNote, statusYear: new Date().getFullYear() });
    setTree((prev) => prev.map((exam) => {
      if (exam.id !== examId) return exam;
      return {
        ...exam,
        subjects: exam.subjects.map((subj) => {
          if (subj.id !== subjectId) return subj;
          return {
            ...subj,
            chapters: subj.chapters.map((ch) => ch.id === chapterId ? { ...ch, syllabusStatus, statusNote } : ch),
          };
        }),
      };
    }));
  }

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 1 — Rule-Based Filtering</p>
        <h1 className="page-title">Syllabus Master</h1>
        <p className="page-sub">
          The single control point for excluding outdated content. Mark a chapter{' '}
          <strong>Removed</strong> when a board updates its syllabus — every question under it is
          instantly excluded from paper generation, across your entire bank, with no re-tagging needed.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : tree.length === 0 ? (
        <div className="card empty-state">
          <h3>No syllabus data yet</h3>
          <p>Run <code className="mono">npm run seed</code> in the backend, or upload questions — chapters are created automatically as you upload.</p>
        </div>
      ) : (
        tree.map((exam) => (
          <div key={exam.id} className="syllabus-exam">
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>{exam.name}</h2>
            {exam.subjects.map((subj) => (
              <div key={subj.id} className="syllabus-subject">
                <div className="syllabus-subject-name">{subj.name}</div>
                {subj.chapters.map((ch) => (
                  <div key={ch.id} className={`chapter-row${ch.syllabusStatus === 'REMOVED' ? ' removed' : ''}`}>
                    <div>
                      <div className="chapter-name">{ch.name}</div>
                      <div className="chapter-meta">
                        {ch.questionCount} questions ({ch.mcqCount || 0} MCQ, {ch.nvqCount || 0} NVQ)
                        {ch.statusNote ? ` · ${ch.statusNote}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Link to={`/analytics/${ch.id}`} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }}>
                        Analytics
                      </Link>
                      <select
                        className="status-select"
                        value={ch.syllabusStatus}
                        onChange={(e) => changeStatus(ch.id, exam.id, subj.id, e.target.value)}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="MODIFIED">Modified</option>
                        <option value="REMOVED">Removed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

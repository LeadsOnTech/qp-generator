import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function SyllabusMaster() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExam, setSelectedExam] = useState('ALL');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'MISSING' | 'REMOVED' | 'ACTIVE'
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState(null);

  useEffect(() => {
    api.syllabusTree()
      .then(setTree)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMessage(null);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.importSyllabus(fd);
      setImportMessage(res.message);
      const updatedTree = await api.syllabusTree();
      setTree(updatedTree);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function changeStatus(chapterId, examId, subjectId, syllabusStatus) {
    let statusNote = null;
    if (syllabusStatus === 'REMOVED') {
      statusNote = window.prompt('Optional: note why this chapter was removed (e.g. "Removed in KCET 2026 syllabus revision")') || 'Removed from syllabus';
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

  const examsList = ['ALL', ...tree.map((e) => e.name)];

  const filteredTree = tree.filter((exam) => {
    if (selectedExam !== 'ALL' && exam.name !== selectedExam) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 1 — Rule-Based Filtering</p>
        <h1 className="page-title">Syllabus Master</h1>
        <p className="page-sub">
          The single control point for managing official syllabus and tracking question coverage. 
          Mark outdated chapters as <strong>Removed</strong> to exclude them from papers, or filter by 
          <strong>"Missing Questions"</strong> to see which chapters need new uploads.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {importMessage && <div className="alert alert-success">{importMessage}</div>}

      {/* Exam & Status Filter Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20, background: 'var(--surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Select Exam:</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {examsList.map((ex) => (
              <button
                key={ex}
                type="button"
                className={`btn ${selectedExam === ex ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12.5 }}
                onClick={() => setSelectedExam(ex)}
              >
                {ex === 'ALL' ? 'All Exams' : ex}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className={`btn ${filterMode === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px', fontSize: 12 }}
            onClick={() => setFilterMode('ALL')}
          >
            Show All
          </button>
          <button
            type="button"
            className={`btn ${filterMode === 'MISSING' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px', fontSize: 12, background: filterMode === 'MISSING' ? '#b45309' : undefined, color: filterMode === 'MISSING' ? '#fff' : undefined }}
            onClick={() => setFilterMode('MISSING')}
          >
            ⚠️ Missing Questions (0 in Bank)
          </button>
          <button
            type="button"
            className={`btn ${filterMode === 'REMOVED' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px', fontSize: 12, background: filterMode === 'REMOVED' ? '#dc2626' : undefined, color: filterMode === 'REMOVED' ? '#fff' : undefined }}
            onClick={() => setFilterMode('REMOVED')}
          >
            ⛔ Removed Chapters
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: 12.5 }}
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? 'Importing Syllabus…' : '📥 Import Syllabus (Excel / CSV)'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : filteredTree.length === 0 ? (
        <div className="card empty-state">
          <h3>No syllabus data found</h3>
          <p>No exams or chapters match your selected filters.</p>
        </div>
      ) : (
        filteredTree.map((exam) => (
          <div key={exam.id} className="syllabus-exam" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ fontSize: 22, margin: 0 }}>{exam.name} Syllabus</h2>
              <span className="badge badge-gold" style={{ fontSize: 12 }}>
                {exam.subjects.reduce((sum, s) => sum + s.chapters.filter(c => c.syllabusStatus === 'ACTIVE').length, 0)} Active Chapters
              </span>
            </div>
            {exam.subjects.map((subj) => {
              const visibleChapters = subj.chapters.filter((ch) => {
                if (filterMode === 'MISSING') return ch.questionCount === 0 && ch.syllabusStatus !== 'REMOVED';
                if (filterMode === 'REMOVED') return ch.syllabusStatus === 'REMOVED';
                if (filterMode === 'ACTIVE') return ch.syllabusStatus === 'ACTIVE';
                return true;
              });

              if (visibleChapters.length === 0 && filterMode !== 'ALL') return null;

              return (
                <div key={subj.id} className="syllabus-subject">
                  <div className="syllabus-subject-name">{subj.name} ({visibleChapters.length} chapters)</div>
                  {visibleChapters.map((ch) => (
                    <div key={ch.id} className={`chapter-row${ch.syllabusStatus === 'REMOVED' ? ' removed' : ''}`}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="chapter-name" style={{ textDecoration: ch.syllabusStatus === 'REMOVED' ? 'line-through' : 'none', color: ch.syllabusStatus === 'REMOVED' ? 'var(--ink-soft)' : 'inherit' }}>
                            {ch.name}
                          </span>
                          {ch.syllabusStatus === 'REMOVED' ? (
                            <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              ⛔ Removed from Syllabus
                            </span>
                          ) : ch.questionCount === 0 ? (
                            <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              ⚠️ 0 Questions (Needs Upload)
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              ✓ {ch.questionCount} Questions in Bank
                            </span>
                          )}
                        </div>
                        <div className="chapter-meta">
                          {ch.questionCount} questions ({ch.mcqCount || 0} MCQ, {ch.nvqCount || 0} NVQ)
                          {ch.statusNote ? ` · Note: ${ch.statusNote}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Link to={`/analytics/${ch.id}`} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }}>
                          Analytics
                        </Link>
                        {ch.syllabusStatus === 'ACTIVE' ? (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px 10px', fontSize: 12, color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => changeStatus(ch.id, exam.id, subj.id, 'REMOVED')}
                          >
                            Mark Removed
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px 10px', fontSize: 12, color: '#16a34a', borderColor: '#86efac' }}
                            onClick={() => changeStatus(ch.id, exam.id, subj.id, 'ACTIVE')}
                          >
                            Restore Active
                          </button>
                        )}
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
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

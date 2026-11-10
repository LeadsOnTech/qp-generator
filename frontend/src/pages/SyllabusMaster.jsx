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

  // Totals across tree
  const totalActiveChapters = tree.reduce((sum, e) => sum + e.subjects.reduce((s2, sub) => s2 + sub.chapters.filter(c => c.syllabusStatus === 'ACTIVE').length, 0), 0);
  const totalRemovedChapters = tree.reduce((sum, e) => sum + e.subjects.reduce((s2, sub) => s2 + sub.chapters.filter(c => c.syllabusStatus === 'REMOVED').length, 0), 0);
  const totalMissingChapters = tree.reduce((sum, e) => sum + e.subjects.reduce((s2, sub) => s2 + sub.chapters.filter(c => c.questionCount === 0 && c.syllabusStatus !== 'REMOVED').length, 0), 0);

  return (
    <div style={{ width: '100%' }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>✓</span>
              <span>Syllabus Master &bull; Curriculum Governance</span>
            </div>
            <h1 className="studio-title">Syllabus Master</h1>
            <p className="studio-sub">
              Centralized authority for official entrance exam curricula. Mark obsolete topics as <strong>Excluded</strong> to permanently block them from paper generation, or track chapters with zero bank questions.
            </p>
          </div>

          <div>
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
              style={{ padding: '11px 20px', fontSize: 13.5, fontWeight: 700 }}
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? 'Importing Syllabus…' : '📥 Import Syllabus (Excel / CSV)'}
            </button>
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="studio-chips">
          <div className="studio-chip">
            <span>Active Chapters:</span> <strong style={{ color: '#4ADE80' }}>{totalActiveChapters}</strong>
          </div>
          <div className="studio-chip">
            <span>Syllabus Excluded:</span> <strong style={{ color: '#F87171' }}>{totalRemovedChapters}</strong>
          </div>
          <div className="studio-chip">
            <span>Needs Uploads:</span> <strong style={{ color: '#FBBF24' }}>{totalMissingChapters}</strong>
          </div>
          <div className="studio-chip">
            <span>Exam Scope:</span> <strong>{selectedExam === 'ALL' ? 'All Entrance Exams' : selectedExam}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span>⚠️</span><span>{error}</span>
        </div>
      )}
      {importMessage && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span>🎉</span><span>{importMessage}</span>
        </div>
      )}

      {/* Filter Strip */}
      <div className="filter-strip" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginRight: 4 }}>
            Exam:
          </span>
          {examsList.map((ex) => (
            <button
              key={ex}
              type="button"
              className={`btn ${selectedExam === ex ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 14px', fontSize: 12.5 }}
              onClick={() => setSelectedExam(ex)}
            >
              {ex === 'ALL' ? 'All Exams' : ex}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: '#E2E8F0', margin: '0 8px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${filterMode === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setFilterMode('ALL')}
          >
            Show All
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              background: filterMode === 'MISSING' ? '#FEF3C7' : '#FFFFFF',
              color: filterMode === 'MISSING' ? '#92400E' : '#475569',
              borderColor: filterMode === 'MISSING' ? '#FCD34D' : '#CBD5E1',
              fontWeight: filterMode === 'MISSING' ? 700 : 500,
            }}
            onClick={() => setFilterMode('MISSING')}
          >
            ⚠️ Missing Questions (0 in Bank)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              background: filterMode === 'REMOVED' ? '#FEE2E2' : '#FFFFFF',
              color: filterMode === 'REMOVED' ? '#991B1B' : '#475569',
              borderColor: filterMode === 'REMOVED' ? '#FCA5A5' : '#CBD5E1',
              fontWeight: filterMode === 'REMOVED' ? 700 : 500,
            }}
            onClick={() => setFilterMode('REMOVED')}
          >
            ⛔ Excluded Chapters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />
      ) : filteredTree.length === 0 ? (
        <div className="executive-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📚</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
            No syllabus data found
          </h3>
          <p style={{ fontSize: 14, color: '#64748B', maxWidth: 440, margin: '0 auto' }}>
            No exams or chapters match your selected filters. Try switching exam or filter mode.
          </p>
        </div>
      ) : (
        filteredTree.map((exam) => (
          <div key={exam.id} className="executive-card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {exam.name} Syllabus Hierarchy
                </h2>
                <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                  {exam.subjects.length} Subjects &bull; {exam.subjects.reduce((sum, s) => sum + s.chapters.length, 0)} Total Chapters
                </div>
              </div>
              <span className="badge badge-success" style={{ fontSize: 12, padding: '4px 12px' }}>
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
                <div key={subj.id} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1E40AF',
                    background: '#EFF6FF',
                    padding: '8px 14px',
                    borderRadius: 10,
                    marginBottom: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{subj.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>
                      {visibleChapters.length} Chapters
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {visibleChapters.map((ch) => (
                      <div
                        key={ch.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 10,
                          background: ch.syllabusStatus === 'REMOVED' ? '#F8FAFC' : '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          opacity: ch.syllabusStatus === 'REMOVED' ? 0.6 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: 13.5,
                              color: ch.syllabusStatus === 'REMOVED' ? '#94A3B8' : '#0F172A',
                              textDecoration: ch.syllabusStatus === 'REMOVED' ? 'line-through' : 'none'
                            }}>
                              {ch.name}
                            </span>
                            {ch.syllabusStatus === 'REMOVED' ? (
                              <span className="badge badge-danger" style={{ fontSize: 11 }}>
                                ⛔ Excluded from Papers
                              </span>
                            ) : ch.questionCount === 0 ? (
                              <span className="badge badge-warn" style={{ fontSize: 11 }}>
                                ⚠️ 0 Questions (Needs Upload)
                              </span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: 11 }}>
                                ✓ {ch.questionCount} Questions in Bank
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                            {ch.questionCount} questions ({ch.mcqCount || 0} MCQ, {ch.nvqCount || 0} NVQ)
                            {ch.statusNote ? ` &bull; Note: ${ch.statusNote}` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Link
                            to={`/analytics/${ch.id}`}
                            className="btn btn-ghost"
                            style={{ padding: '6px 12px', fontSize: 12.5 }}
                          >
                            Analytics
                          </Link>

                          {ch.syllabusStatus === 'ACTIVE' ? (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '6px 12px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5' }}
                              onClick={() => changeStatus(ch.id, exam.id, subj.id, 'REMOVED')}
                            >
                              Exclude Topic
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '6px 12px', fontSize: 12, color: '#16A34A', borderColor: '#86EFAC' }}
                              onClick={() => changeStatus(ch.id, exam.id, subj.id, 'ACTIVE')}
                            >
                              Restore Topic
                            </button>
                          )}

                          <select
                            value={ch.syllabusStatus}
                            onChange={(e) => changeStatus(ch.id, exam.id, subj.id, e.target.value)}
                            style={{
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 700,
                              borderRadius: 8,
                              borderColor: '#CBD5E1',
                              background: '#FFFFFF',
                            }}
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="MODIFIED">Modified</option>
                            <option value="REMOVED">Removed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

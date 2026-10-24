import { useState } from 'react';
import { api } from '../lib/api';

/**
 * Bulk removal of questions by chapter / topic / difficulty.
 *
 * Deliberately built as preview-then-confirm rather than a single delete
 * button: the admin always sees exactly how many questions will be
 * affected (and a sample of them) before anything changes. Removal is a
 * soft delete, so a mistake can be undone with Restore.
 */
export default function BulkRemovePanel({ tree, onDone }) {
  const [exam, setExam] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const examObj = tree.find((e) => e.name === exam);
  const subjectObj = examObj?.subjects.find((s) => s.name === subject);
  const chapterObj = subjectObj?.chapters.find((c) => c.name === chapter);

  const scope = { exam, subject, chapter, topic: topic || undefined, difficulty: difficulty || undefined };
  const scopeReady = Boolean(exam && subject && chapter);

  function resetPreview() {
    setPreview(null);
    setMessage(null);
  }

  async function runPreview() {
    setBusy(true); setError(null); setMessage(null);
    try {
      setPreview(await api.bulkPreview(scope));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    const label = topic ? `topic "${topic}"` : `chapter "${chapter}"`;
    if (!window.confirm(`Remove ${preview.count} question${preview.count !== 1 ? 's' : ''} from ${label}?\n\nThis can be undone with the Restore button.`)) return;
    setBusy(true); setError(null);
    try {
      const res = await api.bulkRemove({ ...scope, confirmCount: preview.count });
      setMessage(`Removed ${res.removed} question${res.removed !== 1 ? 's' : ''}. You can undo this with Restore below.`);
      setPreview(null);
      onDone?.();
    } catch (err) {
      setError(err.message);
      setPreview(null); // force a fresh preview after a count mismatch
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true); setError(null); setMessage(null);
    try {
      const res = await api.bulkRestore(scope);
      setMessage(res.restored > 0
        ? `Restored ${res.restored} question${res.restored !== 1 ? 's' : ''}.`
        : 'Nothing to restore in this selection.');
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 24, borderLeft: '3px solid #b91c1c' }}>
      <h3 style={{ marginBottom: 4 }}>Bulk remove questions</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
        Remove a whole chapter, or just one topic within it, in a single action. You'll see how many
        questions are affected before anything changes — and removal can be undone.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Exam</label>
          <select value={exam} onChange={(e) => { setExam(e.target.value); setSubject(''); setChapter(''); setTopic(''); resetPreview(); }}>
            <option value="">Select…</option>
            {tree.map((ex) => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Subject</label>
          <select value={subject} disabled={!examObj} onChange={(e) => { setSubject(e.target.value); setChapter(''); setTopic(''); resetPreview(); }}>
            <option value="">Select…</option>
            {examObj?.subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Chapter</label>
          <select value={chapter} disabled={!subjectObj} onChange={(e) => { setChapter(e.target.value); setTopic(''); resetPreview(); }}>
            <option value="">Select…</option>
            {subjectObj?.chapters.map((c) => <option key={c.id} value={c.name}>{c.name} ({c.questionCount})</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Topic (optional)</label>
          <select value={topic} disabled={!chapterObj} onChange={(e) => { setTopic(e.target.value); resetPreview(); }}>
            <option value="">Whole chapter</option>
            {chapterObj?.topics?.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Difficulty (optional)</label>
          <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); resetPreview(); }}>
            <option value="">All difficulties</option>
            {['EASY', 'MEDIUM', 'HARD', 'UNTAGGED'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={runPreview} disabled={!scopeReady || busy}>
          {busy && !preview ? 'Checking…' : 'Preview what will be removed'}
        </button>
        <button className="btn btn-ghost" onClick={restore} disabled={!scopeReady || busy}>
          Restore removed questions
        </button>
      </div>

      {!scopeReady && (
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10 }}>
          Choose at least Exam, Subject and Chapter. A bulk action always needs a chapter — this
          prevents wiping the whole bank by accident.
        </div>
      )}

      {preview && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: '#991b1b' }}>
            {preview.count} question{preview.count !== 1 ? 's' : ''} will be removed
            {topic ? ` from topic "${topic}"` : ` from chapter "${chapter}"`}
            {difficulty ? ` (${difficulty} only)` : ''}
          </div>
          {preview.count === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Nothing matches this selection.</div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: '#7f1d1d', marginBottom: 8 }}>Sample of what's included:</div>
              <ul style={{ margin: '0 0 12px 18px', fontSize: 12.5, color: '#7f1d1d' }}>
                {preview.sample.map((s) => (
                  <li key={s.id} style={{ marginBottom: 3 }}>{s.preview} <em>({s.difficulty})</em></li>
                ))}
              </ul>
              <button className="btn-danger-ghost" onClick={confirmRemove} disabled={busy} style={{ padding: '8px 16px', fontSize: 13 }}>
                {busy ? 'Removing…' : `Confirm — remove ${preview.count}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

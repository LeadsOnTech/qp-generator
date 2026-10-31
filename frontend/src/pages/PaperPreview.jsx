import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';


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

export default function PaperPreview() {
  const { id } = useParams();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [swapping, setSwapping] = useState({});
  const [finalizing, setFinalizing] = useState(false);
  const [downloading, setDownloading] = useState(null); // null | 'plain' | 'answers'
  const [optionFormatOverride, setOptionFormatOverride] = useState(null);
  const [answerFormatOverride, setAnswerFormatOverride] = useState(null);

  const isNumericExam = (paper?.examName || '').toUpperCase().includes('NEET') || (paper?.examName || '').toUpperCase().includes('JEE');
  const activeOptionFormat = optionFormatOverride || paper?.optionFormat || (isNumericExam ? 'NUMERIC' : 'ALPHA');
  const activeAnswerFormat = answerFormatOverride || paper?.answerFormat || 'STANDARD';

  const getOptionLabel = (key) => {
    const k = String(key || '').trim().toUpperCase();
    if (activeOptionFormat === 'NUMERIC') {
      return { A: '1', B: '2', C: '3', D: '4', '1': '1', '2': '2', '3': '3', '4': '4' }[k] || k;
    }
    return { A: 'A', B: 'B', C: 'C', D: 'D', '1': 'A', '2': 'B', '3': 'C', '4': 'D' }[k] || k;
  };

  const load = useCallback(() => {
    setLoading(true);
    api.getPaper(id)
      .then(setPaper)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function swap(questionId) {
    setSwapping((s) => ({ ...s, [questionId]: true }));
    setError(null);
    try {
      const res = await api.swapQuestion(id, questionId);
      setPaper((p) => ({
        ...p,
        questions: p.questions.map((q) => (q.id === questionId ? res.newQuestion : q)),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSwapping((s) => ({ ...s, [questionId]: false }));
    }
  }

  async function finalizeAndDownload() {
    const qn = paper?.questions?.length || 0;
    const sol = paper?.includeSolutions ? (paper?.availableSolutionCount || 0) : 0;
    const costLine = sol > 0
      ? `\n\nThis will cost ${qn} credit${qn !== 1 ? 's' : ''} for questions + ${sol} for solutions = ${qn + sol} credits total. The answer key is free.`
      : `\n\nThis will cost ${qn} credit${qn !== 1 ? 's' : ''} (questions + free answer key).`;
    if (!window.confirm(`Finalize this paper? After this, questions are locked (no more swapping) and marked as used for the no-repeat rule.${costLine}`)) return;
    setFinalizing(true);
    try {
      await api.finalizePaper(id);
      setPaper((p) => ({ ...p, status: 'FINALIZED' }));
      await api.downloadPaperPdf(id, false, `${(paper?.title || 'question-paper').replace(/[^a-z0-9]+/gi, '_')}.pdf`, activeOptionFormat, activeAnswerFormat);
    } catch (err) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  }

  async function handleDownload(withAnswers) {
    setDownloading(withAnswers ? 'answers' : 'plain');
    setError(null);
    try {
      const safeName = (paper?.title || 'question-paper').replace(/[^a-z0-9]+/gi, '_');
      await api.downloadPaperPdf(id, withAnswers, `${safeName}${withAnswers ? '_with_answer_key' : ''}.pdf`, activeOptionFormat, activeAnswerFormat);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 400 }} />;
  if (error && !paper) return <div className="alert alert-danger">{error}</div>;
  if (!paper) return null;

  const isDraft = paper.status === 'DRAFT';
  let lastSubject = null;

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 3 — {isDraft ? 'Preview & Confirm' : 'Finalized Paper'}</p>
        <h1 className="page-title">{paper.title}</h1>
        <p className="page-sub">
          {paper.examName} · {paper.questions.length} questions
          {paper.instituteName ? ` · ${paper.instituteName}` : ''} ·{' '}
          {isDraft
            ? 'Review below — swap any question you dislike, then confirm to lock and download.'
            : 'This paper is locked. Download the PDF or the version with the answer key any time.'}
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {paper.shortages.length > 0 && (
        <div className="alert alert-danger">
          The bank couldn't fully satisfy this request:{' '}
          {paper.shortages.map((s, i) => (
            <span key={i}>{s.subject} {s.difficulty.toLowerCase()} (wanted {s.requested}, got {s.got}){i < paper.shortages.length - 1 ? '; ' : ''}</span>
          ))}
          . Slots were filled from other difficulty levels where possible — upload more questions to close the gap.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {isDraft ? (
          <button className="btn btn-primary" onClick={finalizeAndDownload} disabled={finalizing}>
            {finalizing ? 'Finalizing…' : 'Confirm & Download PDF'}
          </button>
        ) : (
          <>
            <button
              className="btn btn-primary"
              disabled={downloading}
              onClick={() => handleDownload(false)}
            >
              {downloading === 'plain' ? 'Downloading…' : 'Download Question Paper'}
            </button>
            <button
              className="btn btn-ghost"
              disabled={downloading}
              onClick={() => handleDownload(true)}
            >
              {downloading === 'answers' ? 'Downloading…' : 'Download with Answer Key'}
            </button>
          </>
        )}
        <button className="btn btn-ghost" onClick={() => setShowAnswers((v) => !v)}>
          {showAnswers ? 'Hide answers in preview' : 'Show answers in preview'}
        </button>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'var(--paper-dim)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--ink-soft)' }}>Option Style:</span>
          <button
            type="button"
            className={`btn ${activeOptionFormat === 'ALPHA' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '3px 8px', fontSize: 12 }}
            onClick={() => setOptionFormatOverride('ALPHA')}
          >
            (A, B, C, D)
          </button>
          <button
            type="button"
            className={`btn ${activeOptionFormat === 'NUMERIC' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '3px 8px', fontSize: 12 }}
            onClick={() => setOptionFormatOverride('NUMERIC')}
          >
            (1, 2, 3, 4)
          </button>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'var(--paper-dim)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--ink-soft)' }}>Format:</span>
          <button
            type="button"
            className={`btn ${activeAnswerFormat === 'STANDARD' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '3px 8px', fontSize: 12 }}
            onClick={() => setAnswerFormatOverride('STANDARD')}
            title="Clean question paper layout without brackets"
          >
            Standard
          </button>
          <button
            type="button"
            className={`btn ${activeAnswerFormat === 'STUDENT_ANSWER' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '3px 8px', fontSize: 12 }}
            onClick={() => setAnswerFormatOverride('STUDENT_ANSWER')}
            title="Includes square brackets [   ] next to each question"
          >
            Student Brackets [&nbsp;&nbsp;&nbsp;]
          </button>
        </div>
        <Link to="/papers" className="btn btn-ghost">All papers</Link>
      </div>

      <div className="card card-pad">
        {paper.questions.map((q, i) => {
          const subjectHeader = q.subject !== lastSubject;
          lastSubject = q.subject;
          return (
            <div key={q.id}>
              {subjectHeader && (
                <h3 style={{ margin: '18px 0 12px', fontSize: 18, borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                  {q.subject}
                </h3>
              )}
              <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 0 8px' }}>
                    <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.5, flex: 1 }}>
                      {i + 1}. {formatHeadingText(q.questionText)}
                    </p>
                    {activeAnswerFormat === 'STUDENT_ANSWER' && (
                      <div
                        title="Student answer bracket (printed on PDF)"
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: 'var(--ink)',
                          marginLeft: 12,
                          flexShrink: 0,
                          letterSpacing: 2
                        }}
                      >
                        [&nbsp;&nbsp;&nbsp;&nbsp;]
                      </div>
                    )}
                  </div>
                  {q.imageUrl && (
                    <img
                      src={`${api.imageBase()}${q.imageUrl}`}
                      alt="Question diagram"
                      style={{ maxWidth: 260, maxHeight: 160, objectFit: 'contain', marginBottom: 10, borderRadius: 6, background: 'var(--paper-dim)', display: 'block' }}
                    />
                  )}
                  {!(q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL' || q.questionType === 'NVQ') ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 18px', fontSize: 13.5 }}>
                      {['A', 'B', 'C', 'D'].map((key) => (
                        <div
                          key={key}
                          style={{
                            color: showAnswers && q.correctOption === key ? 'var(--success)' : 'var(--ink-soft)',
                            fontWeight: showAnswers && q.correctOption === key ? 700 : 400,
                          }}
                        >
                          {q.optionImageUrls?.[key] && (
                            <img
                              src={`${api.imageBase()}${q.optionImageUrls[key]}`}
                              alt={`Option ${key}`}
                              style={{ maxWidth: 140, maxHeight: 70, objectFit: 'contain', marginBottom: 6, display: 'block', borderRadius: 4, background: 'var(--paper-dim)' }}
                            />
                          )}
                          <div>({getOptionLabel(key)}) {q.options[key]}</div>
                        </div>
                      ))}
                    </div>
                    ) : (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--paper-dim)', borderRadius: 4, display: 'inline-block', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {showAnswers ? `Answer: ${getOptionLabel(q.correctOption)}` : 'Numerical Answer Box'}
                    </div>
                    )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <span className="badge badge-neutral">{q.chapter}</span>
                    <span className="badge badge-gold">{q.difficulty}</span>
                    {q.questionType !== 'MCQ' && <span className="badge badge-warn">{q.questionType.replace(/_/g, ' ')}</span>}
                  </div>
                </div>
                {isDraft && (
                  <div>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 13 }}
                      disabled={swapping[q.id]}
                      onClick={() => swap(q.id)}
                    >
                      {swapping[q.id] ? 'Swapping…' : 'Swap'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

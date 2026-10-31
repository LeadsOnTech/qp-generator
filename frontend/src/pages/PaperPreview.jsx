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
  const [downloading, setDownloading] = useState(null); // null | 'plain' | 'answers' | 'bundle' | 'masterKey'
  const [optionFormatOverride, setOptionFormatOverride] = useState(null);
  const [answerFormatOverride, setAnswerFormatOverride] = useState(null);
  const [activeSet, setActiveSet] = useState('A'); // 'A' | 'B' | 'C' | 'D' | 'MASTER_KEY'
  const [masterKeyData, setMasterKeyData] = useState(null);
  const [masterKeyLoading, setMasterKeyLoading] = useState(false);
  const [masterKeyViewMode, setMasterKeyViewMode] = useState('grid'); // 'grid' | 'crossref'
  const [crossRefSearch, setCrossRefSearch] = useState('');

  // Anti-Piracy Watermarking state
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkTagline, setWatermarkTagline] = useState('');
  const [watermarkType, setWatermarkType] = useState('TEXT'); // 'TEXT' | 'LOGO' | 'BOTH'
  const [watermarkOpacity, setWatermarkOpacity] = useState('standard'); // 'faint' | 'standard' | 'prominent'
  const [showWatermarkConfig, setShowWatermarkConfig] = useState(false);

  const isNumericExam = (paper?.examName || '').toUpperCase().includes('NEET') || (paper?.examName || '').toUpperCase().includes('JEE');
  const activeOptionFormat = optionFormatOverride || paper?.optionFormat || (isNumericExam ? 'NUMERIC' : 'ALPHA');
  const activeAnswerFormat = answerFormatOverride || paper?.answerFormat || 'STANDARD';

  const getWatermarkOpts = useCallback(() => ({
    watermark: watermarkEnabled,
    wmText: watermarkText || paper?.instituteName || '',
    wmType: watermarkType,
    wmOpacity: watermarkOpacity,
    wmTagline: watermarkTagline || paper?.instituteTagline || '',
  }), [watermarkEnabled, watermarkText, watermarkType, watermarkOpacity, watermarkTagline, paper]);

  const getOptionLabel = (key) => {
    const k = String(key || '').trim().toUpperCase();
    if (activeOptionFormat === 'NUMERIC') {
      return { A: '1', B: '2', C: '3', D: '4', '1': '1', '2': '2', '3': '3', '4': '4' }[k] || k;
    }
    return { A: 'A', B: 'B', C: 'C', D: 'D', '1': 'A', '2': 'B', '3': 'C', '4': 'D' }[k] || k;
  };

  const loadPaper = useCallback((set = 'A') => {
    setLoading(true);
    api.getPaper(id, set)
      .then((data) => {
        setPaper(data);
        setError(null);
        if (data?.instituteName && !watermarkText) {
          setWatermarkText(data.instituteName);
        }
        if (data?.instituteTagline && !watermarkTagline) {
          setWatermarkTagline(data.instituteTagline);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, watermarkText, watermarkTagline]);

  const loadMasterKey = useCallback((optFmt) => {
    setMasterKeyLoading(true);
    api.getMasterKey(id, optFmt)
      .then((res) => {
        setMasterKeyData(res.matrix);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setMasterKeyLoading(false));
  }, [id]);

  useEffect(() => {
    loadPaper('A');
  }, [loadPaper]);

  const handleSelectSet = (newSet) => {
    setActiveSet(newSet);
    if (newSet === 'MASTER_KEY') {
      loadMasterKey(activeOptionFormat);
    } else {
      loadPaper(newSet);
    }
  };

  const handleOptionFormatChange = (fmt) => {
    setOptionFormatOverride(fmt);
    if (activeSet === 'MASTER_KEY') {
      loadMasterKey(fmt);
    }
  };

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
      const safeName = (paper?.title || 'question-paper').replace(/[^a-z0-9]+/gi, '_');
      await api.downloadPaperPdf(
        id,
        false,
        `${safeName}_SET_A.pdf`,
        activeOptionFormat,
        activeAnswerFormat,
        'A',
        false,
        false,
        getWatermarkOpts()
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  }

  async function handleDownloadSet(withAnswers) {
    const setChar = (activeSet === 'MASTER_KEY' ? 'A' : activeSet);
    setDownloading(withAnswers ? 'answers' : 'plain');
    setError(null);
    try {
      const safeName = (paper?.title || 'question-paper').replace(/[^a-z0-9]+/gi, '_');
      const filename = `${safeName}_SET_${setChar}${withAnswers ? '_with_answer_key' : ''}.pdf`;
      await api.downloadPaperPdf(
        id,
        withAnswers,
        filename,
        activeOptionFormat,
        activeAnswerFormat,
        setChar,
        false,
        false,
        getWatermarkOpts()
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadBundle() {
    setDownloading('bundle');
    setError(null);
    try {
      const safeName = (paper?.title || 'question-paper').replace(/[^a-z0-9]+/gi, '_');
      const filename = `${safeName}_all_sets_bundle_A_B_C_D.pdf`;
      await api.downloadPaperPdf(
        id,
        false,
        filename,
        activeOptionFormat,
        activeAnswerFormat,
        'A',
        false,
        true,
        getWatermarkOpts()
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadMasterKey() {
    setDownloading('masterKey');
    setError(null);
    try {
      const safeName = (paper?.title || 'question-paper').replace(/[^a-z0-9]+/gi, '_');
      const filename = `${safeName}_synced_master_key.pdf`;
      await api.downloadPaperPdf(
        id,
        true,
        filename,
        activeOptionFormat,
        activeAnswerFormat,
        'A',
        true,
        false,
        getWatermarkOpts()
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  }

  if (loading && !paper && !masterKeyData) return <div className="skeleton" style={{ height: 400 }} />;
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
          {paper.examName} · {paper.questions?.length || 0} questions
          {paper.instituteName ? ` · ${paper.instituteName}` : ''} ·{' '}
          {isDraft
            ? 'Review below — swap any question you dislike, then confirm to lock and download.'
            : 'This paper is locked. Download individual sets, all-sets bundle, or the synced master key.'}
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {paper.shortages?.length > 0 && (
        <div className="alert alert-danger">
          The bank couldn't fully satisfy this request:{' '}
          {paper.shortages.map((s, i) => (
            <span key={i}>{s.subject} {s.difficulty.toLowerCase()} (wanted {s.requested}, got {s.got}){i < paper.shortages.length - 1 ? '; ' : ''}</span>
          ))}
          . Slots were filled from other difficulty levels where possible — upload more questions to close the gap.
        </div>
      )}

      {/* Set Selector Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
        padding: '10px 14px',
        background: 'var(--paper-dim)',
        borderRadius: 8,
        border: '1px solid var(--line)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Exam Sets:
          </span>
          {['A', 'B', 'C', 'D'].map((s) => (
            <button
              key={s}
              type="button"
              className={`btn ${activeSet === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                padding: '4px 14px',
                fontSize: 13,
                fontWeight: activeSet === s ? 700 : 500,
                background: activeSet === s ? undefined : 'var(--paper)',
              }}
              onClick={() => handleSelectSet(s)}
            >
              Set {s}
            </button>
          ))}
          <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
          <button
            type="button"
            className={`btn ${activeSet === 'MASTER_KEY' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              padding: '4px 14px',
              fontSize: 13,
              fontWeight: activeSet === 'MASTER_KEY' ? 700 : 500,
              background: activeSet === 'MASTER_KEY' ? undefined : 'var(--paper)',
            }}
            onClick={() => handleSelectSet('MASTER_KEY')}
          >
            📑 Synced Master Key (4 Sets)
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {activeSet === 'MASTER_KEY' ? (
            <span>Synchronized evaluation matrix across all sets</span>
          ) : (
            <span>Active View: <strong>Set {activeSet}</strong> {activeSet !== 'A' ? '(Deterministically shuffled)' : '(Master Canonical Order)'}</span>
          )}
        </div>
      </div>

      {isDraft && activeSet !== 'A' && activeSet !== 'MASTER_KEY' && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 13 }}>
          💡 You are viewing <strong>Set {activeSet}</strong>. Questions are deterministically shuffled to maintain section integrity. To swap any question, switch to <strong>Set A</strong>.
        </div>
      )}

      {/* Action Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {isDraft ? (
          <button className="btn btn-primary" onClick={finalizeAndDownload} disabled={finalizing}>
            {finalizing ? 'Finalizing…' : 'Confirm & Download PDF (Set A)'}
          </button>
        ) : (
          <>
            {activeSet !== 'MASTER_KEY' ? (
              <>
                <button
                  className="btn btn-primary"
                  disabled={!!downloading}
                  onClick={() => handleDownloadSet(false)}
                >
                  {downloading === 'plain' ? 'Downloading…' : `Download Set ${activeSet} QP`}
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={!!downloading}
                  onClick={() => handleDownloadSet(true)}
                >
                  {downloading === 'answers' ? 'Downloading…' : `Download Set ${activeSet} with Keys`}
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary"
                disabled={!!downloading}
                onClick={handleDownloadMasterKey}
              >
                {downloading === 'masterKey' ? 'Downloading…' : '📑 Download Master Key PDF'}
              </button>
            )}

            <button
              className="btn btn-ghost"
              disabled={!!downloading}
              onClick={handleDownloadBundle}
              title="Download merged PDF of all 4 sets (A, B, C, D) + Master Key in one printable file"
            >
              {downloading === 'bundle' ? 'Generating Bundle…' : '📦 All Sets Bundle (A-D)'}
            </button>

            {activeSet !== 'MASTER_KEY' && (
              <button
                className="btn btn-ghost"
                disabled={!!downloading}
                onClick={handleDownloadMasterKey}
                title="Download 1-page Synced Master Key PDF for evaluators"
              >
                {downloading === 'masterKey' ? 'Downloading…' : '📑 Master Key PDF'}
              </button>
            )}
          </>
        )}

        {activeSet !== 'MASTER_KEY' && (
          <button className="btn btn-ghost" onClick={() => setShowAnswers((v) => !v)}>
            {showAnswers ? 'Hide answers in preview' : 'Show answers in preview'}
          </button>
        )}

        {/* Option Style Selector */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'var(--paper-dim)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--ink-soft)' }}>Option Style:</span>
          <button
            type="button"
            className={`btn ${activeOptionFormat === 'ALPHA' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '3px 8px', fontSize: 12 }}
            onClick={() => handleOptionFormatChange('ALPHA')}
          >
            (A, B, C, D)
          </button>
          <button
            type="button"
            className={`btn ${activeOptionFormat === 'NUMERIC' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '3px 8px', fontSize: 12 }}
            onClick={() => handleOptionFormatChange('NUMERIC')}
          >
            (1, 2, 3, 4)
          </button>
        </div>

        {/* Format Selector */}
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

        {/* Anti-Piracy Watermark Controls */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'var(--paper-dim)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--ink-soft)' }}>Watermark:</span>
          <button
            type="button"
            className={`btn ${watermarkEnabled ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '3px 8px', fontSize: 12 }}
            onClick={() => setWatermarkEnabled((v) => !v)}
            title="Toggle Anti-Piracy Watermark across PDF pages"
          >
            {watermarkEnabled ? '🛡️ ON' : 'OFF'}
          </button>
          {watermarkEnabled && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '3px 6px', fontSize: 12 }}
              onClick={() => setShowWatermarkConfig((v) => !v)}
              title="Configure Watermark text, style, and opacity"
            >
              ⚙️
            </button>
          )}
        </div>

        <Link to="/papers" className="btn btn-ghost">All papers</Link>
      </div>

      {/* Watermark Configuration Drawer */}
      {watermarkEnabled && showWatermarkConfig && (
        <div style={{
          background: 'var(--paper-dim)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'grid',
          gap: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--navy-950)' }}>
              🛡️ Anti-Piracy Watermark Settings
            </h4>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '2px 8px', fontSize: 12 }}
              onClick={() => setShowWatermarkConfig(false)}
            >
              ✕ Close
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
                Watermark Primary Text (College / Institute Name)
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder={paper.instituteName || 'e.g. APEX EDUCATIONAL INSTITUTIONS'}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--line)',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
                Secondary Security Notice (Optional Subtitle)
              </label>
              <input
                type="text"
                value={watermarkTagline}
                onChange={(e) => setWatermarkTagline(e.target.value)}
                placeholder="e.g. CONFIDENTIAL · NOT FOR SALE"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--line)',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Watermark Style:</span>
              <button
                type="button"
                className={`btn ${watermarkType === 'TEXT' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 8px', fontSize: 12 }}
                onClick={() => setWatermarkType('TEXT')}
              >
                Diagonal Text
              </button>
              {paper.instituteLogoUrl && (
                <>
                  <button
                    type="button"
                    className={`btn ${watermarkType === 'LOGO' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '3px 8px', fontSize: 12 }}
                    onClick={() => setWatermarkType('LOGO')}
                  >
                    Centered Logo
                  </button>
                  <button
                    type="button"
                    className={`btn ${watermarkType === 'BOTH' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '3px 8px', fontSize: 12 }}
                    onClick={() => setWatermarkType('BOTH')}
                  >
                    Both (Logo + Text)
                  </button>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Opacity Level:</span>
              <button
                type="button"
                className={`btn ${watermarkOpacity === 'faint' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 8px', fontSize: 12 }}
                onClick={() => setWatermarkOpacity('faint')}
                title="4.5% Opacity — Ultra subtle, ideal for high-res color laser printers"
              >
                Faint (4.5%)
              </button>
              <button
                type="button"
                className={`btn ${watermarkOpacity === 'standard' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 8px', fontSize: 12 }}
                onClick={() => setWatermarkOpacity('standard')}
                title="7.5% Opacity — Recommended balance of legibility and anti-piracy protection"
              >
                Standard (7.5%)
              </button>
              <button
                type="button"
                className={`btn ${watermarkOpacity === 'prominent' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 8px', fontSize: 12 }}
                onClick={() => setWatermarkOpacity('prominent')}
                title="11% Opacity — Higher contrast for high-speed monochrome photocopiers"
              >
                Darker (11%)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Master Key View vs Question List View */}
      {activeSet === 'MASTER_KEY' ? (
        <div className="card card-pad">
          {masterKeyLoading ? (
            <div className="skeleton" style={{ height: 260 }} />
          ) : !masterKeyData ? (
            <div className="alert alert-danger">Could not load Master Key matrix.</div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--navy-950)' }}>
                    Synced Master Answer Key (Sets A, B, C, D)
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                    Total Questions: {masterKeyData.questionCount} · Option Style: ({activeOptionFormat === 'NUMERIC' ? '1, 2, 3, 4' : 'A, B, C, D'}) · Deterministic Seed Synchronized
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ display: 'inline-flex', background: 'var(--paper-dim)', padding: 3, borderRadius: 6, border: '1px solid var(--line)' }}>
                    <button
                      type="button"
                      className={`btn ${masterKeyViewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => setMasterKeyViewMode('grid')}
                    >
                      Side-by-Side Key Grid
                    </button>
                    <button
                      type="button"
                      className={`btn ${masterKeyViewMode === 'crossref' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => setMasterKeyViewMode('crossref')}
                    >
                      Cross-Reference Map
                    </button>
                  </div>
                </div>
              </div>

              {masterKeyViewMode === 'grid' ? (
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1e293b', color: '#fff', textAlign: 'center' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Question #</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>SET A Key</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>SET B Key</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>SET C Key</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>SET D Key</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterKeyData.rows.map((row, idx) => (
                        <tr
                          key={row.qNumber}
                          style={{
                            background: idx % 2 === 0 ? '#ffffff' : 'var(--paper-dim)',
                            borderBottom: '1px solid var(--line)',
                            textAlign: 'center',
                          }}
                        >
                          <td style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--navy-900)' }}>
                            Question {row.qNumber}
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <span style={{ display: 'inline-block', width: 28, height: 28, lineHeight: '28px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                              {row.keyA}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <span style={{ display: 'inline-block', width: 28, height: 28, lineHeight: '28px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                              {row.keyB}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <span style={{ display: 'inline-block', width: 28, height: 28, lineHeight: '28px', borderRadius: 4, background: '#f3e8ff', color: '#6b21a8', fontWeight: 700 }}>
                              {row.keyC}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <span style={{ display: 'inline-block', width: 28, height: 28, lineHeight: '28px', borderRadius: 4, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                              {row.keyD}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder="Search question # in any set..."
                      value={crossRefSearch}
                      onChange={(e) => setCrossRefSearch(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--line)',
                        fontSize: 13,
                        maxWidth: 260,
                      }}
                    />
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#fff', textAlign: 'center' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Set A Question</th>
                          <th style={{ padding: '10px 14px', fontWeight: 600 }}>Correct Key</th>
                          <th style={{ padding: '10px 14px', fontWeight: 600 }}>Appears as in Set B</th>
                          <th style={{ padding: '10px 14px', fontWeight: 600 }}>Appears as in Set C</th>
                          <th style={{ padding: '10px 14px', fontWeight: 600 }}>Appears as in Set D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {masterKeyData.rows
                          .filter((row) => {
                            if (!crossRefSearch) return true;
                            const s = crossRefSearch.trim();
                            return (
                              String(row.crossRef.A) === s ||
                              String(row.crossRef.B) === s ||
                              String(row.crossRef.C) === s ||
                              String(row.crossRef.D) === s
                            );
                          })
                          .map((row, idx) => (
                            <tr
                              key={row.qNumber}
                              style={{
                                background: idx % 2 === 0 ? '#ffffff' : 'var(--paper-dim)',
                                borderBottom: '1px solid var(--line)',
                                textAlign: 'center',
                              }}
                            >
                              <td style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--navy-900)' }}>
                                Question #{row.crossRef.A}
                              </td>
                              <td style={{ padding: '8px 14px' }}>
                                <span style={{ display: 'inline-block', width: 28, height: 28, lineHeight: '28px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                                  {row.crossRef.key}
                                </span>
                              </td>
                              <td style={{ padding: '8px 14px', color: '#0369a1', fontWeight: 600 }}>
                                Question #{row.crossRef.B}
                              </td>
                              <td style={{ padding: '8px 14px', color: '#6b21a8', fontWeight: 600 }}>
                                Question #{row.crossRef.C}
                              </td>
                              <td style={{ padding: '8px 14px', color: '#15803d', fontWeight: 600 }}>
                                Question #{row.crossRef.D}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card card-pad" style={{ position: 'relative', overflow: 'hidden' }}>
          {watermarkEnabled && (
            <div style={{
              position: 'absolute',
              top: '45%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-35deg)',
              fontSize: 34,
              fontWeight: 800,
              color: watermarkOpacity === 'faint'
                ? 'rgba(15, 23, 42, 0.035)'
                : watermarkOpacity === 'prominent'
                  ? 'rgba(15, 23, 42, 0.08)'
                  : 'rgba(15, 23, 42, 0.055)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              letterSpacing: 2,
              zIndex: 0,
              textAlign: 'center',
            }}>
              <div>{watermarkText || paper.instituteName || 'EXAMINATION'}</div>
              {watermarkTagline && (
                <div style={{ fontSize: 15, marginTop: 8, letterSpacing: 1, opacity: 0.85 }}>
                  {watermarkTagline}
                </div>
              )}
            </div>
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '2px solid var(--line)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  background: activeSet === 'A' ? '#1e293b' : activeSet === 'B' ? '#0369a1' : activeSet === 'C' ? '#6b21a8' : '#15803d',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13,
                  padding: '4px 12px',
                  borderRadius: 4,
                  letterSpacing: 1
                }}>
                  SET - {activeSet}
                </span>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  {paper.questions?.length || 0} Questions {activeSet !== 'A' ? '(Deterministically Scrambled)' : '(Canonical Order)'}
                </span>
              </div>
            </div>

          {paper.questions?.map((q, i) => {
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
                  {isDraft && activeSet === 'A' && (
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
      )}
    </div>
  );
}

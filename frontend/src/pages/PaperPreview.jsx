import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import CbtLaunchModal from '../components/CbtLaunchModal';


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
  const navigate = useNavigate();
  const [showCbtModal, setShowCbtModal] = useState(false);
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [swapping, setSwapping] = useState({});
  const [finalizing, setFinalizing] = useState(false);
  const [downloading, setDownloading] = useState(null); // null | 'plain' | 'answers' | 'bundle' | 'masterKey'
  const [optionFormatOverride, setOptionFormatOverride] = useState(null);
  const [answerFormatOverride, setAnswerFormatOverride] = useState(null);
  const [activeSet, setActiveSet] = useState('A'); // 'A' | 'B' | 'C' | 'D' | 'MASTER_KEY' | 'KEY_CHITS' | 'OMR_SHEET'
  const [masterKeyData, setMasterKeyData] = useState(null);
  const [masterKeyLoading, setMasterKeyLoading] = useState(false);
  const [masterKeyViewMode, setMasterKeyViewMode] = useState('grid'); // 'grid' | 'crossref'
  const [crossRefSearch, setCrossRefSearch] = useState('');

  // Student Key Chits (Slips) state
  const [keyChitMode, setKeyChitMode] = useState('UNIVERSAL'); // 'UNIVERSAL' | 'SINGLE_SET'
  const [keyChitSet, setKeyChitSet] = useState('A'); // 'A' | 'B' | 'C' | 'D' | 'ALL'
  const [downloadingKeyChits, setDownloadingKeyChits] = useState(false);

  // OMR Sheet state
  const [omrLayoutMode, setOmrLayoutMode] = useState('AUTO'); // 'AUTO' | 'COMPACT_4' | 'COMPACT_3' | 'COMPACT_2' | 'FULL'
  const [omrSet, setOmrSet] = useState('GENERIC'); // 'GENERIC' | 'A' | 'B' | 'C' | 'D'
  const [omrRollDigits, setOmrRollDigits] = useState('7'); // '7' | '10'
  const [downloadingOmr, setDownloadingOmr] = useState(false);

  // Anti-Piracy Watermarking state
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkTagline, setWatermarkTagline] = useState('');
  const [watermarkType, setWatermarkType] = useState('TEXT'); // 'TEXT' | 'LOGO' | 'BOTH'
  const [watermarkOpacity, setWatermarkOpacity] = useState('standard'); // 'faint' | 'standard' | 'prominent'
  const [showWatermarkConfig, setShowWatermarkConfig] = useState(false);

  // Eco-Print Optimizer state
  const [ecoMode, setEcoMode] = useState('AUTO'); // 'AUTO' | 'TARGET_2' | 'TARGET_4'
  const [ecoStats, setEcoStats] = useState(null);
  const [loadingEcoStats, setLoadingEcoStats] = useState(false);

  const isNumericExam = (paper?.examName || '').toUpperCase().includes('NEET') || (paper?.examName || '').toUpperCase().includes('JEE');
  const activeOptionFormat = optionFormatOverride || paper?.optionFormat || (isNumericExam ? 'NUMERIC' : 'ALPHA');
  const activeAnswerFormat = answerFormatOverride || paper?.answerFormat || 'STANDARD';

  const fetchEcoStats = useCallback(() => {
    if (!id) return;
    setLoadingEcoStats(true);
    api.getPaperEcoStats(id, { optionFormat: activeOptionFormat, answerFormat: activeAnswerFormat })
      .then((stats) => {
        setEcoStats(stats);
      })
      .catch((err) => {
        console.warn('Could not load eco stats:', err);
      })
      .finally(() => setLoadingEcoStats(false));
  }, [id, activeOptionFormat, activeAnswerFormat]);

  useEffect(() => {
    fetchEcoStats();
  }, [fetchEcoStats]);

  const currentModeStats = ecoStats ? (
    ecoMode === 'TARGET_2' && ecoStats.target2.canFit
      ? ecoStats.target2
      : ecoMode === 'TARGET_4' && ecoStats.target4.canFit
        ? ecoStats.target4
        : ecoStats.standard
  ) : null;

  const activeSavingsPercent = currentModeStats ? (
    ecoMode === 'TARGET_2' ? ecoStats.target2.paperSavingsPercent :
    ecoMode === 'TARGET_4' ? ecoStats.target4.paperSavingsPercent : 0
  ) : 0;

  const activeSheetsSaved = currentModeStats ? (
    ecoMode === 'TARGET_2' ? ecoStats.target2.sheetsSaved :
    ecoMode === 'TARGET_4' ? ecoStats.target4.sheetsSaved : 0
  ) : 0;

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
    if (newSet === 'MASTER_KEY' || newSet === 'KEY_CHITS') {
      if (!masterKeyData) loadMasterKey(activeOptionFormat);
    } else if (newSet === 'OMR_SHEET') {
      // OMR uses loaded paper questions
    } else {
      loadPaper(newSet);
    }
  };

  const handleOptionFormatChange = (fmt) => {
    setOptionFormatOverride(fmt);
    if (activeSet === 'MASTER_KEY' || activeSet === 'KEY_CHITS') {
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
      fetchEcoStats();
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
        getWatermarkOpts(),
        ecoMode
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
        getWatermarkOpts(),
        ecoMode
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
        getWatermarkOpts(),
        ecoMode
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

  async function handleDownloadOmr() {
    setDownloadingOmr(true);
    setError(null);
    try {
      const safeName = (paper?.title || 'question-paper').replace(/[^a-z0-9]+/gi, '_');
      const filename = `${safeName}_OMR_Sheet_${omrLayoutMode}_Set_${omrSet}.pdf`;
      await api.downloadOmrSheet(id, filename, {
        layout: omrLayoutMode,
        set: omrSet,
        optionFormat: activeOptionFormat,
        rollDigits: omrRollDigits,
        watermark: watermarkEnabled,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingOmr(false);
    }
  }

  async function handleDownloadKeyChits() {
    setDownloadingKeyChits(true);
    setError(null);
    try {
      const safeName = (paper?.title || 'question-paper').replace(/[^a-z0-9]+/gi, '_');
      const suffix = keyChitMode === 'UNIVERSAL' ? 'Universal_AllSets' : `SingleSet_${keyChitSet}`;
      const filename = `${safeName}_Key_Chits_${suffix}.pdf`;
      await api.downloadKeyChits(id, filename, {
        mode: keyChitMode,
        set: keyChitSet,
        optionFormat: activeOptionFormat,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingKeyChits(false);
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
          <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
          <button
            type="button"
            className={`btn ${activeSet === 'KEY_CHITS' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              padding: '4px 14px',
              fontSize: 13,
              fontWeight: activeSet === 'KEY_CHITS' ? 700 : 500,
              background: activeSet === 'KEY_CHITS' ? undefined : 'var(--paper)',
            }}
            onClick={() => handleSelectSet('KEY_CHITS')}
          >
            ✂️ Student Key Chits
          </button>
          <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
          <button
            type="button"
            className={`btn ${activeSet === 'OMR_SHEET' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              padding: '4px 14px',
              fontSize: 13,
              fontWeight: activeSet === 'OMR_SHEET' ? 700 : 500,
              background: activeSet === 'OMR_SHEET' ? undefined : 'var(--paper)',
            }}
            onClick={() => handleSelectSet('OMR_SHEET')}
          >
            📝 Printable OMR Sheet
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {activeSet === 'MASTER_KEY' ? (
            <span>Synchronized evaluation matrix across all sets</span>
          ) : activeSet === 'KEY_CHITS' ? (
            <span>Paper-saving student answer key chits (slips) with cut guides</span>
          ) : activeSet === 'OMR_SHEET' ? (
            <span>Official-standard 1-page optical evaluation sheet</span>
          ) : (
            <span>Active View: <strong>Set {activeSet}</strong> {activeSet !== 'A' ? '(Deterministically shuffled)' : '(Master Canonical Order)'}</span>
          )}
        </div>
      </div>

      {isDraft && activeSet !== 'A' && activeSet !== 'MASTER_KEY' && activeSet !== 'KEY_CHITS' && activeSet !== 'OMR_SHEET' && (
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
            {activeSet !== 'MASTER_KEY' && activeSet !== 'KEY_CHITS' && activeSet !== 'OMR_SHEET' ? (
              <>
                <button
                  className="btn btn-primary"
                  disabled={!!downloading}
                  onClick={() => handleDownloadSet(false)}
                >
                  {downloading === 'plain'
                    ? 'Downloading…'
                    : `Download Set ${activeSet} QP${ecoMode !== 'AUTO' ? ` (${ecoMode === 'TARGET_2' ? '2p Eco' : '4p Eco'})` : ''}`}
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={!!downloading}
                  onClick={() => handleDownloadSet(true)}
                >
                  {downloading === 'answers'
                    ? 'Downloading…'
                    : `Download Set ${activeSet} with Keys${ecoMode !== 'AUTO' ? ` (${ecoMode === 'TARGET_2' ? '2p Eco' : '4p Eco'})` : ''}`}
                </button>
              </>
            ) : activeSet === 'KEY_CHITS' ? (
              <button
                className="btn btn-primary"
                disabled={downloadingKeyChits}
                onClick={handleDownloadKeyChits}
              >
                {downloadingKeyChits ? 'Generating Key Chits…' : '📥 Download Key Chits PDF'}
              </button>
            ) : activeSet === 'OMR_SHEET' ? (
              <button
                className="btn btn-primary"
                disabled={downloadingOmr}
                onClick={handleDownloadOmr}
              >
                {downloadingOmr ? 'Generating OMR…' : '📥 Download OMR Sheet PDF'}
              </button>
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
              {downloading === 'bundle'
                ? 'Generating Bundle…'
                : `📦 All Sets Bundle (A-D)${ecoMode !== 'AUTO' ? ` (${ecoMode === 'TARGET_2' ? '2p Eco' : '4p Eco'})` : ''}`}
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

            {activeSet !== 'KEY_CHITS' && (
              <button
                className="btn btn-ghost"
                disabled={downloadingKeyChits}
                onClick={() => handleSelectSet('KEY_CHITS')}
                title="Generate paper-saving answer key slips for students"
              >
                ✂️ Student Key Chits
              </button>
            )}

            {activeSet !== 'OMR_SHEET' && (
              <button
                className="btn btn-ghost"
                disabled={downloadingOmr}
                onClick={handleDownloadOmr}
                title="Download 1-page optical-scanner-compatible A4 OMR evaluation sheet"
              >
                {downloadingOmr ? 'Generating OMR…' : '📝 OMR Sheet PDF'}
              </button>
            )}
          </>
        )}

        {activeSet !== 'MASTER_KEY' && activeSet !== 'KEY_CHITS' && activeSet !== 'OMR_SHEET' && (
          <button className="btn btn-ghost" onClick={() => setShowAnswers((v) => !v)}>
            {showAnswers ? 'Hide answers in preview' : 'Show answers in preview'}
          </button>
        )}

        {/* Online Student CBT Button */}
        <button
          type="button"
          className="btn"
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#fff',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          onClick={() => setShowCbtModal(true)}
          title="Host this paper as an online CBT exam & share test link on WhatsApp"
        >
          🚀 Host Online CBT (WhatsApp Test)
        </button>

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

        {/* Eco-Print Quick Pill */}
        {activeSet !== 'MASTER_KEY' && activeSet !== 'KEY_CHITS' && activeSet !== 'OMR_SHEET' && ecoStats && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'var(--paper-dim)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Eco-Print:</span>
            <span style={{
              fontWeight: 700,
              fontSize: 12,
              color: ecoMode === 'AUTO' ? '#475569' : '#15803d'
            }}>
              {ecoMode === 'AUTO' ? 'Auto' : ecoMode === 'TARGET_2' ? '⚡ 2-Page Fit' : '📖 4-Page Booklet'}
            </span>
            {activeSavingsPercent > 0 && (
              <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                -{activeSavingsPercent}%
              </span>
            )}
          </div>
        )}

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

      {/* Trailing Spillover Warning Alert */}
      {activeSet !== 'MASTER_KEY' && activeSet !== 'KEY_CHITS' && activeSet !== 'OMR_SHEET' && ecoStats?.standard?.spillover && ecoMode === 'AUTO' && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          background: '#fffbeb',
          border: '1.5px solid #f59e0b',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>
                Trailing Spillover Detected: Page {ecoStats.standard.pages} has only {ecoStats.standard.lastPageQuestions} question{ecoStats.standard.lastPageQuestions !== 1 ? 's' : ''} ({Math.round(ecoStats.standard.fillRatio * 100)}% fill)
              </div>
              <div style={{ fontSize: 12.5, color: '#b45309', marginTop: 2 }}>
                Standard layout spills onto Page {ecoStats.standard.pages}, forcing an extra double-sided Xerox sheet ({ecoStats.standard.sheets} sheets total) per student.
              </div>
            </div>
          </div>
          {ecoStats.target2.canFit ? (
            <button
              type="button"
              className="btn"
              style={{
                background: '#059669',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                padding: '7px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onClick={() => setEcoMode('TARGET_2')}
            >
              ⚡ Auto Eco-Fit into 2 Pages (Save {ecoStats.target2.paperSavingsPercent}% Paper)
            </button>
          ) : ecoStats.target4.canFit ? (
            <button
              type="button"
              className="btn"
              style={{
                background: '#059669',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                padding: '7px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onClick={() => setEcoMode('TARGET_4')}
            >
              📖 Auto-Fit into 4 Pages (Save {ecoStats.target4.paperSavingsPercent}% Paper)
            </button>
          ) : null}
        </div>
      )}

      {/* Eco-Print Optimizer Panel & Live Page-Fill Meter */}
      {activeSet !== 'MASTER_KEY' && activeSet !== 'KEY_CHITS' && activeSet !== 'OMR_SHEET' && ecoStats && (
        <div style={{
          marginBottom: 20,
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🌱</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Eco-Print Optimizer
                </span>
                {activeSavingsPercent > 0 ? (
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontWeight: 700,
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 12,
                    border: '1px solid #86efac'
                  }}>
                    ✓ {activeSavingsPercent}% Xerox Paper Saved
                  </span>
                ) : (
                  <span style={{
                    background: '#e2e8f0',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 12,
                  }}>
                    Standard Flow
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Zero-waste page targeting for bulk exam printing on standard double-sided A4 Xerox sheets.
              </div>
            </div>

            {/* Mode Buttons */}
            <div style={{ display: 'inline-flex', background: '#ffffff', padding: 3, borderRadius: 6, border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                className={`btn ${ecoMode === 'AUTO' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 12px', fontSize: 12 }}
                onClick={() => setEcoMode('AUTO')}
              >
                Auto Flow ({ecoStats.standard.pages}p / {ecoStats.standard.sheets} sh)
              </button>
              <button
                type="button"
                className={`btn ${ecoMode === 'TARGET_2' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  opacity: ecoStats.target2.canFit ? 1 : 0.6,
                }}
                disabled={!ecoStats.target2.canFit}
                onClick={() => setEcoMode('TARGET_2')}
                title={ecoStats.target2.canFit ? 'Target exactly 2 pages (1 physical double-sided sheet)' : 'Too many questions to fit safely in 2 pages'}
              >
                ⚡ Target 2 Pages {ecoStats.target2.canFit && ecoStats.target2.sheetsSaved > 0 ? `(-${ecoStats.target2.sheetsSaved} sheet)` : ''}
              </button>
              <button
                type="button"
                className={`btn ${ecoMode === 'TARGET_4' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  opacity: ecoStats.target4.canFit ? 1 : 0.6,
                }}
                disabled={!ecoStats.target4.canFit}
                onClick={() => setEcoMode('TARGET_4')}
                title={ecoStats.target4.canFit ? 'Target exactly 4 pages (2 physical sheets / folded booklet)' : 'Too many questions to fit safely in 4 pages'}
              >
                📖 Target 4 Pages {ecoStats.target4.canFit && ecoStats.target4.sheetsSaved > 0 ? `(-${ecoStats.target4.sheetsSaved} sheet)` : ''}
              </button>
            </div>
          </div>

          {/* Live Page-Fill Metrics Grid */}
          {currentModeStats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              background: '#ffffff',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>PDF Page Count</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {currentModeStats.pages} Page{currentModeStats.pages !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  {currentModeStats.pages % 2 === 0 ? '✓ Perfectly paired for duplex' : '⚠️ Odd page (blank back side)'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Physical Xerox Sheets</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a', marginTop: 2 }}>
                  {currentModeStats.sheets} A4 Sheet{currentModeStats.sheets !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  Printed 2-sided (front & back)
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Final Page Fill</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: currentModeStats.fillRatio < 0.35 ? '#d97706' : '#15803d', marginTop: 2 }}>
                  {Math.round(currentModeStats.fillRatio * 100)}% Fill
                </div>
                <div style={{
                  width: '100%',
                  height: 6,
                  background: '#e2e8f0',
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginTop: 6
                }}>
                  <div style={{
                    width: `${Math.min(100, Math.round(currentModeStats.fillRatio * 100))}%`,
                    height: '100%',
                    background: currentModeStats.fillRatio < 0.35 ? '#f59e0b' : '#10b981',
                  }} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Bulk Paper Savings</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: activeSavingsPercent > 0 ? '#15803d' : '#64748b', marginTop: 2 }}>
                  {activeSavingsPercent > 0 ? `${activeSavingsPercent}% Saved` : 'Standard Flow'}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  {activeSavingsPercent > 0
                    ? `Saves ${activeSheetsSaved * 500} sheets per 500 students`
                    : 'No optimization active'}
                </div>
              </div>
            </div>
          )}
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

              {/* Post-Exam Student Key Chits Promo Banner */}
              <div style={{
                marginTop: 24,
                padding: '14px 18px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ color: '#166534', fontSize: 14 }}>✂️ Distribute Answer Keys to Students After Exam?</strong>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#22c55e', color: '#fff' }}>
                      Save up to 87.5% Paper
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#334155' }}>
                    Generate compact, printable student answer slips (4 to 6 chits per A4 sheet) with dashed cutting guides. Supports Universal Multi-Set and Dedicated Single-Set modes.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSelectSet('KEY_CHITS')}
                  style={{ fontSize: 13, padding: '8px 16px', fontWeight: 600 }}
                >
                  ✂️ Open Student Key Chits Generator →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeSet === 'KEY_CHITS' ? (
        <div className="card card-pad">
          {/* Key Chits Controls Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--navy-950)' }}>
                  ✂️ Printable Student Answer Key Chits (Slips)
                </h2>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                }}>
                  🌱 {keyChitMode === 'SINGLE_SET' ? '83.3% Paper Saved (6 Chits/Page)' : '75% Paper Saved (4 Chits/Page)'}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                }}>
                  ✂️ Tear / Cut Guides Included
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                Tear or slice along dashed cutting lines to distribute to students immediately after exams · {masterKeyData?.questionCount || paper.questions?.length || 40} Questions
              </p>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={downloadingKeyChits}
                onClick={handleDownloadKeyChits}
                style={{ fontSize: 14, padding: '8px 18px', fontWeight: 600 }}
              >
                {downloadingKeyChits ? 'Generating Key Chits…' : '📥 Download Printable Key Chits PDF'}
              </button>
            </div>
          </div>

          {/* Both Options Toggle Container */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Choose Key Chit Distribution Strategy
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {/* Option A: Universal Multi-Set */}
              <div
                onClick={() => setKeyChitMode('UNIVERSAL')}
                style={{
                  border: keyChitMode === 'UNIVERSAL' ? '2px solid #2563eb' : '1px solid var(--line)',
                  background: keyChitMode === 'UNIVERSAL' ? '#eff6ff' : 'var(--paper-dim)',
                  borderRadius: 8,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: keyChitMode === 'UNIVERSAL' ? '#1e40af' : 'var(--ink)' }}>
                    🌐 Universal Multi-Set (Recommended)
                  </div>
                  {keyChitMode === 'UNIVERSAL' && (
                    <span style={{ fontSize: 11, background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 8 }}>
                  Every cut slip contains synchronized answer keys for <strong>all 4 sets (A, B, C, D)</strong> side-by-side.
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    ⚡ Zero invigilator sorting needed
                  </span>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    4 chits / A4 sheet (A6 size)
                  </span>
                </div>
              </div>

              {/* Option B: Dedicated Single-Set */}
              <div
                onClick={() => setKeyChitMode('SINGLE_SET')}
                style={{
                  border: keyChitMode === 'SINGLE_SET' ? '2px solid #2563eb' : '1px solid var(--line)',
                  background: keyChitMode === 'SINGLE_SET' ? '#eff6ff' : 'var(--paper-dim)',
                  borderRadius: 8,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: keyChitMode === 'SINGLE_SET' ? '#1e40af' : 'var(--ink)' }}>
                    🎯 Dedicated Single-Set Chits
                  </div>
                  {keyChitMode === 'SINGLE_SET' && (
                    <span style={{ fontSize: 11, background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 8 }}>
                  Each slip is dedicated strictly to <strong>one chosen set</strong> with ultra-compact columns for maximum paper savings.
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    🌱 Maximum 6 chits / A4 sheet
                  </span>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    83.3% paper reduction
                  </span>
                </div>
              </div>
            </div>

            {/* Set Sub-Selector (when Single-Set mode is active) */}
            {keyChitMode === 'SINGLE_SET' && (
              <div style={{
                marginTop: 12,
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Select Set for Chits:</span>
                <div style={{ display: 'inline-flex', gap: 6 }}>
                  {['A', 'B', 'C', 'D'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`btn ${keyChitSet === s ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '3px 12px', fontSize: 12, fontWeight: keyChitSet === s ? 700 : 500 }}
                      onClick={() => setKeyChitSet(s)}
                    >
                      Set {s}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`btn ${keyChitSet === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '3px 12px', fontSize: 12, fontWeight: keyChitSet === 'ALL' ? 700 : 500 }}
                    onClick={() => setKeyChitSet('ALL')}
                    title="Generate 4 pages total: 1 page of 6 chits for each set (A, B, C, D)"
                  >
                    📦 All Sets (1 Page Each)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cutting Instructions & Spec Banner */}
          <div style={{
            marginBottom: 20,
            padding: '10px 16px',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: '#475569',
          }}>
            <div>
              <strong>✂️ Slicing Guide:</strong> Standard A4 sheet prints with marked dashed cut lines (<code>- - - ✂ Cut Here - - -</code>). Staff can slice across guides using scissors or a paper trimmer to yield {keyChitMode === 'UNIVERSAL' ? '4 equal A6-sized slips' : '6 compact slips'}.
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>Option Style: <strong>{activeOptionFormat === 'NUMERIC' ? '1, 2, 3, 4' : 'A, B, C, D'}</strong></span>
            </div>
          </div>

          {/* Live On-Screen Sheet Replica */}
          {masterKeyLoading ? (
            <div className="skeleton" style={{ height: 420 }} />
          ) : !masterKeyData ? (
            <div className="alert alert-danger">Could not load Answer Key data.</div>
          ) : (
            (() => {
              const totalQ = masterKeyData.questionCount || 40;
              const instName = (paper.instituteName || 'ACADEMY').toUpperCase();
              const dateStr = paper.createdAt
                ? new Date(paper.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              const examName = paper.examName || 'Exam';

              if (keyChitMode === 'UNIVERSAL') {
                // UNIVERSAL MULTI-SET REPLICA (4 chits in 2x2 grid if <= 75 Qs, or 2 chits in 1x2 if > 75 Qs)
                const isTwoChits = totalQ > 75;
                const numBlocks = totalQ > 25 ? 2 : 1;
                const qPerBlock = Math.ceil(totalQ / numBlocks);

                const renderUniversalChit = (chitKey) => (
                  <div
                    key={chitKey}
                    style={{
                      border: '1px solid #0f172a',
                      background: '#ffffff',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: isTwoChits ? 280 : 250,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Header */}
                    <div>
                      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 12, color: '#0f172a', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                        {instName}
                      </div>
                      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 9.5, color: '#1e3a8a', marginTop: 1 }}>
                        OFFICIAL ANSWER KEY CHIT (SETS A, B, C, D)
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 8, color: '#475569', marginTop: 1 }}>
                        {examName} · {totalQ} Qs · {dateStr}
                      </div>
                      <div style={{ height: 1, background: '#0f172a', margin: '4px 0 6px' }} />

                      {/* Multi-set table blocks */}
                      <div style={{ display: 'grid', gridTemplateColumns: numBlocks === 2 ? '1fr 1fr' : '1fr', gap: 8 }}>
                        {Array.from({ length: numBlocks }).map((_, bIdx) => {
                          const startQ = bIdx * qPerBlock + 1;
                          const endQ = Math.min(totalQ, (bIdx + 1) * qPerBlock);
                          const blockRows = masterKeyData.rows.slice(startQ - 1, endQ);

                          return (
                            <table key={bIdx} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5 }}>
                              <thead>
                                <tr style={{ background: '#1e293b', color: '#ffffff', textAlign: 'center' }}>
                                  <th style={{ padding: '2px 4px', width: '20%', fontWeight: 700 }}>Q#</th>
                                  <th style={{ padding: '2px 4px', width: '20%', fontWeight: 700 }}>A</th>
                                  <th style={{ padding: '2px 4px', width: '20%', fontWeight: 700 }}>B</th>
                                  <th style={{ padding: '2px 4px', width: '20%', fontWeight: 700 }}>C</th>
                                  <th style={{ padding: '2px 4px', width: '20%', fontWeight: 700 }}>D</th>
                                </tr>
                              </thead>
                              <tbody>
                                {blockRows.map((r, rIdx) => (
                                  <tr
                                    key={r.qNumber}
                                    style={{
                                      background: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff',
                                      borderBottom: '1px solid #e2e8f0',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <td style={{ padding: '2px 4px', fontWeight: 700, color: '#334155' }}>
                                      {String(r.qNumber).padStart(2, '0')}
                                    </td>
                                    <td style={{ padding: '2px 4px', fontWeight: 700, color: '#1e3a8a' }}>{r.keyA}</td>
                                    <td style={{ padding: '2px 4px', fontWeight: 700, color: '#0369a1' }}>{r.keyB}</td>
                                    <td style={{ padding: '2px 4px', fontWeight: 700, color: '#6b21a8' }}>{r.keyC}</td>
                                    <td style={{ padding: '2px 4px', fontWeight: 700, color: '#15803d' }}>{r.keyD}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer note */}
                    <div style={{ textAlign: 'center', fontSize: 6.5, color: '#64748b', fontWeight: 600, marginTop: 6, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                      Verify scores & report discrepancies immediately
                    </div>
                  </div>
                );

                return (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: 16,
                    overflowX: 'auto',
                  }}>
                    <div style={{
                      maxWidth: 820,
                      margin: '0 auto',
                      background: '#ffffff',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      border: '1px solid #94a3b8',
                      position: 'relative',
                      boxSizing: 'border-box',
                    }}>
                      {/* Slicing Guides Layer */}
                      {!isTwoChits ? (
                        <>
                          {/* Vertical Dashed Cut Line */}
                          <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: 8,
                            bottom: 8,
                            width: 0,
                            borderLeft: '1.5px dashed #94a3b8',
                            zIndex: 10,
                            pointerEvents: 'none',
                          }} />
                          {/* Horizontal Dashed Cut Line */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: 8,
                            right: 8,
                            height: 0,
                            borderTop: '1.5px dashed #94a3b8',
                            zIndex: 10,
                            pointerEvents: 'none',
                          }} />
                          {/* Center Scissors Tag */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: '#ffffff',
                            border: '1px solid #94a3b8',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#64748b',
                            zIndex: 15,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                          }}>
                            ✂ Cut Here
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Single Horizontal Cut Line for 2 chits */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: 8,
                            right: 8,
                            height: 0,
                            borderTop: '1.5px dashed #94a3b8',
                            zIndex: 10,
                            pointerEvents: 'none',
                          }} />
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: '#ffffff',
                            border: '1px solid #94a3b8',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#64748b',
                            zIndex: 15,
                            pointerEvents: 'none',
                          }}>
                            ✂ Cut Here
                          </div>
                        </>
                      )}

                      {/* Chits Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isTwoChits ? '1fr' : '1fr 1fr',
                        gap: 16,
                        padding: 14,
                      }}>
                        {isTwoChits
                          ? [renderUniversalChit('top'), renderUniversalChit('bottom')]
                          : [
                              renderUniversalChit('tl'),
                              renderUniversalChit('tr'),
                              renderUniversalChit('bl'),
                              renderUniversalChit('br'),
                            ]}
                      </div>
                    </div>
                  </div>
                );
              } else {
                // SINGLE-SET DEDICATED REPLICA (6 chits in 2x3 grid)
                const activeSingleSet = keyChitSet === 'ALL' ? 'A' : keyChitSet;
                const keyProp = `key${activeSingleSet}`;
                const numSubCols = totalQ > 36 ? 4 : 3;
                const qPerSubCol = Math.ceil(totalQ / numSubCols);

                const renderSingleChit = (chitKey) => (
                  <div
                    key={chitKey}
                    style={{
                      border: '1px solid #0f172a',
                      background: '#ffffff',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 180,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div>
                      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 11, color: '#0f172a', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                        {instName}
                      </div>
                      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 9.5, color: '#1e3a8a', marginTop: 1 }}>
                        ANSWER KEY · SET - {activeSingleSet}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 7.5, color: '#475569', marginTop: 1 }}>
                        {examName} · {totalQ} Qs · {dateStr}
                      </div>
                      <div style={{ height: 1, background: '#0f172a', margin: '4px 0 6px' }} />

                      {/* Sub-columns of Q# KEY */}
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numSubCols}, 1fr)`, gap: 5 }}>
                        {Array.from({ length: numSubCols }).map((_, scIdx) => {
                          const startQ = scIdx * qPerSubCol + 1;
                          const endQ = Math.min(totalQ, (scIdx + 1) * qPerSubCol);
                          const subRows = masterKeyData.rows.slice(startQ - 1, endQ);

                          return (
                            <table key={scIdx} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
                              <thead>
                                <tr style={{ background: '#1e293b', color: '#ffffff', textAlign: 'center' }}>
                                  <th style={{ padding: '2px 2px', width: '50%', fontWeight: 700 }}>Q#</th>
                                  <th style={{ padding: '2px 2px', width: '50%', fontWeight: 700 }}>KEY</th>
                                </tr>
                              </thead>
                              <tbody>
                                {subRows.map((r, rIdx) => (
                                  <tr
                                    key={r.qNumber}
                                    style={{
                                      background: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff',
                                      borderBottom: '1px solid #e2e8f0',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <td style={{ padding: '2px 2px', fontWeight: 700, color: '#334155' }}>
                                      {String(r.qNumber).padStart(2, '0')}
                                    </td>
                                    <td style={{ padding: '2px 2px', fontWeight: 700, color: '#1e3a8a' }}>
                                      {r[keyProp]}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: 6, color: '#64748b', fontWeight: 600, marginTop: 4, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                      Verify scores & report discrepancies immediately
                    </div>
                  </div>
                );

                return (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: 16,
                    overflowX: 'auto',
                  }}>
                    <div style={{
                      maxWidth: 820,
                      margin: '0 auto',
                      background: '#ffffff',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      border: '1px solid #94a3b8',
                      position: 'relative',
                      boxSizing: 'border-box',
                    }}>
                      {/* Slicing Guides Layer (2x3) */}
                      {/* Vertical Cut Line at 50% */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: 8,
                        bottom: 8,
                        width: 0,
                        borderLeft: '1.5px dashed #94a3b8',
                        zIndex: 10,
                        pointerEvents: 'none',
                      }} />
                      {/* Horizontal Cut Line 1 at 33.3% */}
                      <div style={{
                        position: 'absolute',
                        top: '33.33%',
                        left: 8,
                        right: 8,
                        height: 0,
                        borderTop: '1.5px dashed #94a3b8',
                        zIndex: 10,
                        pointerEvents: 'none',
                      }} />
                      {/* Horizontal Cut Line 2 at 66.6% */}
                      <div style={{
                        position: 'absolute',
                        top: '66.66%',
                        left: 8,
                        right: 8,
                        height: 0,
                        borderTop: '1.5px dashed #94a3b8',
                        zIndex: 10,
                        pointerEvents: 'none',
                      }} />

                      {/* Scissor Badges */}
                      <div style={{
                        position: 'absolute',
                        top: '33.33%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: '#ffffff',
                        border: '1px solid #94a3b8',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#64748b',
                        zIndex: 15,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        ✂ Cut Here
                      </div>
                      <div style={{
                        position: 'absolute',
                        top: '66.66%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: '#ffffff',
                        border: '1px solid #94a3b8',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#64748b',
                        zIndex: 15,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        ✂ Cut Here
                      </div>

                      {/* 6 Chits Grid (2 columns x 3 rows) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gridTemplateRows: 'repeat(3, auto)',
                        gap: 14,
                        padding: 12,
                      }}>
                        {[0, 1, 2, 3, 4, 5].map((i) => renderSingleChit(`chit_${i}`))}
                      </div>
                    </div>
                  </div>
                );
              }
            })()
          )}
        </div>
      ) : activeSet === 'OMR_SHEET' ? (
        <div className="card card-pad">
          {/* OMR Sheet Controls Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--navy-950)' }}>
                  📝 Printable OMR Evaluation Sheet
                </h2>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                }}>
                  ✨ Uncompromised 3.8mm Bubble Size
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                Optical-scanner-compatible layout · Auto-balanced for {paper.questions?.length || 0} questions · Single-page guarantee
              </p>
            </div>
            <div>
              <button
                className="btn btn-primary"
                disabled={downloadingOmr}
                onClick={handleDownloadOmr}
                style={{ fontSize: 14, padding: '8px 18px', fontWeight: 600 }}
              >
                {downloadingOmr ? 'Generating OMR PDF…' : '📥 Download Printable OMR PDF (1 Page)'}
              </button>
            </div>
          </div>

          {/* Smart Page Allocation Layout Selector */}
          {(() => {
            const totalQ = paper.questions?.length || 60;
            let effectiveLayout = omrLayoutMode;
            if (effectiveLayout === 'AUTO') {
              if (totalQ <= 50) effectiveLayout = 'COMPACT_4';
              else if (totalQ <= 75) effectiveLayout = 'COMPACT_3';
              else if (totalQ <= 100) effectiveLayout = 'COMPACT_2';
              else effectiveLayout = 'FULL';
            }

            const autoLabel = totalQ <= 50
              ? 'Auto: 4 Slips / A4 (75% Paper Saved)'
              : totalQ <= 75
                ? 'Auto: 3 Slips / A4 (66% Paper Saved)'
                : totalQ <= 100
                  ? 'Auto: 2 Slips / A4 (50% Paper Saved)'
                  : 'Auto: Full Exam Sheet (1 per A4)';

            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'var(--paper-dim)',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  flexWrap: 'wrap',
                  marginBottom: 10,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Page Allocation:</span>
                  {[
                    { id: 'AUTO', label: `⚡ ${autoLabel}`, tag: 'Recommended' },
                    { id: 'COMPACT_4', label: 'Compact 4-in-1 (≤ 50 Qs)', tag: '4 Slips' },
                    { id: 'COMPACT_3', label: 'Compact 3-in-1 (51–75 Qs)', tag: '3 Strips' },
                    { id: 'COMPACT_2', label: 'Compact 2-in-1 (76–100 Qs)', tag: '2 Halves' },
                    { id: 'FULL', label: 'Full Examination (> 100 Qs)', tag: '1 Full Sheet' },
                  ].map((mode) => {
                    const isActive = omrLayoutMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '4px 10px', fontSize: 12, fontWeight: isActive ? 700 : 500 }}
                        onClick={() => setOmrLayoutMode(mode.id)}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>

                {/* Allocation Benefit Pill */}
                <div style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: effectiveLayout === 'FULL' ? '#f1f5f9' : '#f0fdf4',
                  border: `1px solid ${effectiveLayout === 'FULL' ? '#cbd5e1' : '#bbf7d0'}`,
                  color: effectiveLayout === 'FULL' ? '#334155' : '#166534',
                }}>
                  <div>
                    {effectiveLayout === 'COMPACT_4' && (
                      <span><strong>🌱 75% Paper Savings:</strong> 4 independent examination slips printed on 1 single A4 sheet (2x2 quadrant with cutting guides). Each cut slip includes all {totalQ} questions with standard 3.8mm bubbles and independent optical corner fiducials.</span>
                    )}
                    {effectiveLayout === 'COMPACT_3' && (
                      <span><strong>🌱 66% Paper Savings:</strong> 3 independent examination slips printed on 1 single A4 sheet (3 horizontal strips with cutting guides). Each cut slip includes all {totalQ} questions with standard 3.8mm bubbles and independent optical corner fiducials.</span>
                    )}
                    {effectiveLayout === 'COMPACT_2' && (
                      <span><strong>🌱 50% Paper Savings:</strong> 2 independent examination slips printed on 1 single A4 sheet (2 horizontal A5 halves with cutting guides). Each cut slip includes all {totalQ} questions with standard 3.8mm bubbles and independent optical corner fiducials.</span>
                    )}
                    {effectiveLayout === 'FULL' && (
                      <span><strong>📄 Full Examination Format:</strong> Standard 1-sheet grand mock layout with complete candidate write-in block, 0-9 roll number bubbling grid, set selection bubble column, invigilator/candidate signatures, and QR optical seal.</span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', opacity: 0.85 }}>
                    Active: {effectiveLayout}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* OMR Options Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 20,
            padding: '10px 14px',
            background: 'var(--paper-dim)',
            borderRadius: 8,
            border: '1px solid var(--line)',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>OMR Sheet Set:</span>
              {[
                { label: 'Generic (Blank Set)', val: 'GENERIC' },
                { label: 'Set A', val: 'A' },
                { label: 'Set B', val: 'B' },
                { label: 'Set C', val: 'C' },
                { label: 'Set D', val: 'D' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  className={`btn ${omrSet === s.val ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '3px 10px', fontSize: 12 }}
                  onClick={() => setOmrSet(s.val)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Roll Digits:</span>
                {['7', '10'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`btn ${omrRollDigits === d ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '3px 8px', fontSize: 12 }}
                    onClick={() => setOmrRollDigits(d)}
                  >
                    {d} Digits
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Option Labels:</span>
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
            </div>
          </div>

          {/* Sheet Canvas Replica (A4 Paper Representation) */}
          {(() => {
            const totalQ = paper.questions?.length || 60;
            let effectiveLayout = omrLayoutMode;
            if (effectiveLayout === 'AUTO') {
              if (totalQ <= 50) effectiveLayout = 'COMPACT_4';
              else if (totalQ <= 75) effectiveLayout = 'COMPACT_3';
              else if (totalQ <= 100) effectiveLayout = 'COMPACT_2';
              else effectiveLayout = 'FULL';
            }
            const optLabels = activeOptionFormat === 'NUMERIC' ? ['1', '2', '3', '4'] : ['A', 'B', 'C', 'D'];

            // Common helper to render question row in preview
            const renderQRow = (qNum, compact = false) => (
              <div
                key={qNum}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: compact ? '2px 4px' : '3px 6px',
                  background: qNum % 2 === 1 ? '#f8fafc' : '#ffffff',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: compact ? 9 : 10,
                }}
              >
                <span style={{ fontWeight: 700, color: '#334155', minWidth: 20 }}>
                  {String(qNum).padStart(2, '0')}
                </span>
                <div style={{ display: 'flex', gap: compact ? 3 : 5 }}>
                  {optLabels.map((lbl) => (
                    <div
                      key={lbl}
                      style={{
                        width: compact ? 13 : 15,
                        height: compact ? 13 : 15,
                        borderRadius: '50%',
                        border: '1px solid #0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: compact ? 7 : 8,
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      {lbl}
                    </div>
                  ))}
                </div>
              </div>
            );

            return (
              <div style={{
                background: '#ffffff',
                border: '2px solid #0f172a',
                borderRadius: 4,
                padding: effectiveLayout === 'FULL' ? '24px 20px' : '14px',
                maxWidth: 820,
                margin: '0 auto',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                position: 'relative',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                {/* 1. COMPACT 4-IN-1 PREVIEW (2x2 Quadrant Grid) */}
                {effectiveLayout === 'COMPACT_4' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, position: 'relative' }}>
                    {/* Dashed Cut Guide Separators */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      borderTop: '1px dashed #94a3b8',
                      transform: 'translateY(-50%)',
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ background: '#ffffff', padding: '0 8px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                        ✂ Cut Here
                      </span>
                    </div>
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      bottom: 0,
                      borderLeft: '1px dashed #94a3b8',
                      transform: 'translateX(-50%)',
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{
                        background: '#ffffff',
                        padding: '8px 0',
                        fontSize: 10,
                        color: '#64748b',
                        fontWeight: 600,
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                      }}>
                        ✂ Cut Here
                      </span>
                    </div>

                    {[0, 1, 2, 3].map((slipIdx) => (
                      <div
                        key={slipIdx}
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          padding: '10px 8px',
                          position: 'relative',
                          background: '#ffffff',
                        }}
                      >
                        {/* 4 Corner Fiducials */}
                        <div style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 8, background: '#000000' }} />
                        <div style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, background: '#000000' }} />
                        <div style={{ position: 'absolute', bottom: 3, left: 3, width: 8, height: 8, background: '#000000' }} />
                        <div style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, background: '#000000' }} />

                        {/* Slip Header */}
                        <div style={{ textAlign: 'center', marginBottom: 6, padding: '0 12px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                            {paper.instituteName || 'LEADSON ACADEMY'}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#1e3a8a' }}>
                            OMR ANSWER SLIP {omrSet !== 'GENERIC' ? `(SET - ${omrSet})` : ''} · SLIP #{slipIdx + 1}
                          </div>
                          <div style={{ fontSize: 8, color: '#64748b' }}>
                            {paper.examName} · {totalQ} Questions · Standard 3.8mm Bubbles
                          </div>
                        </div>

                        {/* Write-in candidate info */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 6,
                          fontSize: 8,
                          color: '#334155',
                          borderTop: '1px solid #e2e8f0',
                          borderBottom: '1px solid #e2e8f0',
                          padding: '3px 4px',
                          marginBottom: 6,
                          background: '#f8fafc',
                        }}>
                          <span><strong>Roll:</strong> ___________</span>
                          <span><strong>Name:</strong> _____________________</span>
                        </div>

                        {/* 2 Question Columns of 25 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <div>
                            <div style={{ background: '#1e293b', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 4px', textAlign: 'center', borderRadius: '2px 2px 0 0' }}>
                              Q 01 – {Math.min(25, totalQ)}
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', borderTop: 'none' }}>
                              {Array.from({ length: Math.min(25, totalQ) }).map((_, r) => renderQRow(r + 1, true))}
                            </div>
                          </div>
                          <div>
                            <div style={{ background: '#1e293b', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 4px', textAlign: 'center', borderRadius: '2px 2px 0 0' }}>
                              {totalQ > 25 ? `Q 26 – ${Math.min(50, totalQ)}` : 'NOTES'}
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', borderTop: 'none' }}>
                              {totalQ > 25
                                ? Array.from({ length: Math.min(25, totalQ - 25) }).map((_, r) => renderQRow(26 + r, true))
                                : <div style={{ padding: 12, fontSize: 8, color: '#94a3b8', textAlign: 'center' }}>Official Evaluation Area</div>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. COMPACT 3-IN-1 PREVIEW (3 Horizontal Strips) */}
                {effectiveLayout === 'COMPACT_3' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[0, 1, 2].map((stripIdx) => (
                      <div key={stripIdx} style={{ position: 'relative' }}>
                        {stripIdx > 0 && (
                          <div style={{
                            margin: '-8px 0 8px',
                            borderTop: '1px dashed #94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <span style={{ background: '#ffffff', padding: '0 8px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                              ✂ Cut Here
                            </span>
                          </div>
                        )}
                        <div style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          padding: '10px 10px',
                          position: 'relative',
                          background: '#ffffff',
                        }}>
                          {/* 4 Corner Fiducials */}
                          <div style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 8, background: '#000000' }} />
                          <div style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, background: '#000000' }} />
                          <div style={{ position: 'absolute', bottom: 3, left: 3, width: 8, height: 8, background: '#000000' }} />
                          <div style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, background: '#000000' }} />

                          {/* Strip Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginBottom: 6 }}>
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                                {paper.instituteName || 'LEADSON ACADEMY'}
                              </span>
                              <span style={{ fontSize: 9, fontWeight: 700, color: '#1e3a8a', marginLeft: 8 }}>
                                OMR ANSWER STRIP {omrSet !== 'GENERIC' ? `(SET - ${omrSet})` : ''} · STRIP #{stripIdx + 1}
                              </span>
                            </div>
                            <div style={{ fontSize: 8, color: '#475569' }}>
                              <strong>Roll:</strong> _________ &nbsp; <strong>Name:</strong> ________________________
                            </div>
                          </div>

                          {/* 5 Question Columns of 15 */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                            {[0, 1, 2, 3, 4].map((c) => {
                              const startQ = c * 15 + 1;
                              const endQ = Math.min(totalQ, (c + 1) * 15);
                              return (
                                <div key={c}>
                                  <div style={{ background: '#1e293b', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 4px', textAlign: 'center', borderRadius: '2px 2px 0 0' }}>
                                    Q {String(startQ).padStart(2, '0')} – {String(endQ).padStart(2, '0')}
                                  </div>
                                  <div style={{ border: '1px solid #e2e8f0', borderTop: 'none' }}>
                                    {Array.from({ length: Math.max(0, endQ - startQ + 1) }).map((_, r) => renderQRow(startQ + r, true))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. COMPACT 2-IN-1 PREVIEW (2 Horizontal Halves) */}
                {effectiveLayout === 'COMPACT_2' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {[0, 1].map((halfIdx) => (
                      <div key={halfIdx} style={{ position: 'relative' }}>
                        {halfIdx > 0 && (
                          <div style={{
                            margin: '-10px 0 10px',
                            borderTop: '1px dashed #94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <span style={{ background: '#ffffff', padding: '0 8px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                              ✂ Cut Here
                            </span>
                          </div>
                        )}
                        <div style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          padding: '12px 12px',
                          position: 'relative',
                          background: '#ffffff',
                        }}>
                          {/* 4 Corner Fiducials */}
                          <div style={{ position: 'absolute', top: 4, left: 4, width: 9, height: 9, background: '#000000' }} />
                          <div style={{ position: 'absolute', top: 4, right: 4, width: 9, height: 9, background: '#000000' }} />
                          <div style={{ position: 'absolute', bottom: 4, left: 4, width: 9, height: 9, background: '#000000' }} />
                          <div style={{ position: 'absolute', bottom: 4, right: 4, width: 9, height: 9, background: '#000000' }} />

                          {/* Half Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #0f172a', paddingBottom: 6, marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                                {paper.instituteName || 'LEADSON ACADEMY'}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#1e3a8a' }}>
                                OMR ANSWER SHEET {omrSet !== 'GENERIC' ? `(SET - ${omrSet})` : ''} · SLIP #{halfIdx + 1}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 9, color: '#334155' }}>
                              <div><strong>Roll:</strong> _______________ &nbsp; <strong>Name:</strong> __________________________</div>
                              <div style={{ color: '#64748b', marginTop: 2 }}>{paper.examName} · {totalQ} Questions · Standard 3.8mm Bubbles</div>
                            </div>
                          </div>

                          {/* 4 Question Columns of 25 */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                            {[0, 1, 2, 3].map((c) => {
                              const startQ = c * 25 + 1;
                              const endQ = Math.min(totalQ, (c + 1) * 25);
                              return (
                                <div key={c}>
                                  <div style={{ background: '#1e293b', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 4px', textAlign: 'center', borderRadius: '2px 2px 0 0' }}>
                                    Q {String(startQ).padStart(2, '0')} – {String(endQ).padStart(2, '0')}
                                  </div>
                                  <div style={{ border: '1px solid #e2e8f0', borderTop: 'none' }}>
                                    {Array.from({ length: Math.max(0, endQ - startQ + 1) }).map((_, r) => renderQRow(startQ + r, false))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. FULL EXAMINATION OMR PREVIEW (> 100 Qs or Forced Full) */}
                {effectiveLayout === 'FULL' && (
                  <div>
                    {/* 4 Corner Fiducial Markers */}
                    <div style={{ position: 'absolute', top: 8, left: 8, width: 12, height: 12, background: '#000000' }} />
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, background: '#000000' }} />
                    <div style={{ position: 'absolute', bottom: 8, left: 8, width: 12, height: 12, background: '#000000' }} />
                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 12, height: 12, background: '#000000' }} />

                    {/* Background Watermark if enabled */}
                    {watermarkEnabled && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-35deg)',
                        fontSize: 36,
                        fontWeight: 800,
                        color: 'rgba(15, 23, 42, 0.035)',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        letterSpacing: 2,
                        zIndex: 0,
                      }}>
                        {watermarkText || paper.instituteName || 'EXAMINATION'}
                      </div>
                    )}

                    {/* Header Content */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
                        <div style={{ flex: 1, textAlign: 'center', padding: '0 12px' }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            {paper.instituteName || 'LEADSON ACADEMY'}
                          </h3>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a', marginTop: 3 }}>
                            OMR ANSWER EVALUATION SHEET {omrSet !== 'GENERIC' ? `(SET - ${omrSet})` : ''}
                          </div>
                          <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                            {paper.examName} — {paper.title} · {totalQ} Questions · Max Marks: {paper.maxMarks || totalQ * 4} · Duration: {paper.timeAllowedMinutes || 180} Mins
                          </div>
                        </div>

                        <div style={{ border: '1px solid #cbd5e1', padding: 4, borderRadius: 4, textAlign: 'center', background: '#f8fafc', flexShrink: 0 }}>
                          <div style={{ width: 44, height: 44, background: '#0f172a', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>
                            QR
                          </div>
                          <div style={{ fontSize: 7, fontWeight: 700, color: '#64748b', marginTop: 2 }}>OPTICAL SEAL</div>
                        </div>
                      </div>

                      {/* Top Student Details Box */}
                      <div style={{ border: '1px solid #94a3b8', borderRadius: 4, padding: '10px 14px', marginBottom: 14, background: '#ffffff', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        {/* Left: Name & Instructions */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>
                            CANDIDATE NAME (IN CAPITAL LETTERS AS PER ADMIT CARD)
                          </div>
                          <div style={{ display: 'flex', gap: 3, marginBottom: 10, flexWrap: 'wrap' }}>
                            {Array.from({ length: 20 }).map((_, i) => (
                              <div key={i} style={{ width: 14, height: 16, border: '1px solid #64748b', borderRadius: 2 }} />
                            ))}
                          </div>

                          <div style={{ fontSize: 8, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>
                            INSTRUCTIONS FOR MARKING:
                          </div>
                          <div style={{ fontSize: 8, color: '#334155', lineHeight: 1.4 }}>
                            • Use Blue or Black ball-point pen only. Gel pens strictly prohibited.<br />
                            • Completely darken circles. Incomplete or crossed marks will be rejected.<br />
                            • <strong>METHOD:</strong>&nbsp;&nbsp;
                            <span style={{ color: '#15803d', fontWeight: 700 }}>● Correct</span>&nbsp;&nbsp;&nbsp;
                            <span style={{ color: '#b91c1c', fontWeight: 700 }}>✕ Wrong</span>&nbsp;&nbsp;&nbsp;
                            <span style={{ color: '#b91c1c', fontWeight: 700 }}>✓ Wrong</span>
                          </div>

                          <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                            <div>
                              <div style={{ width: 120, borderBottom: '1px solid #94a3b8', height: 18 }} />
                              <div style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>Candidate Signature</div>
                            </div>
                            <div>
                              <div style={{ width: 120, borderBottom: '1px solid #94a3b8', height: 18 }} />
                              <div style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>Invigilator Signature</div>
                            </div>
                          </div>
                        </div>

                        {/* Center: Roll Number Columns */}
                        <div style={{ padding: '0 8px', borderLeft: '1px dashed #cbd5e1', borderRight: '1px dashed #cbd5e1' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#0f172a', marginBottom: 5, textAlign: 'center' }}>
                            ROLL NUMBER
                          </div>
                          <div style={{ display: 'flex', gap: 3, marginBottom: 4, justifyContent: 'center' }}>
                            {Array.from({ length: parseInt(omrRollDigits, 10) }).map((_, c) => (
                              <div key={c} style={{ width: 14, height: 14, border: '1px solid #334155', borderRadius: 2 }} />
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            {Array.from({ length: parseInt(omrRollDigits, 10) }).map((_, c) => (
                              <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {Array.from({ length: 10 }).map((_, d) => (
                                  <div
                                    key={d}
                                    style={{
                                      width: 13,
                                      height: 13,
                                      borderRadius: '50%',
                                      border: '1px solid #0f172a',
                                      fontSize: 7,
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#0f172a',
                                    }}
                                  >
                                    {d}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right: Paper Set */}
                        <div style={{ width: 70, textAlign: 'center' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>
                            SET
                          </div>
                          <div style={{ width: 28, height: 16, border: '1px solid #334155', borderRadius: 2, margin: '0 auto 6px', fontWeight: 800, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {omrSet !== 'GENERIC' ? omrSet : ''}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                            {['A', 'B', 'C', 'D'].map((s) => {
                              const isPreFilled = omrSet === s;
                              return (
                                <div
                                  key={s}
                                  style={{
                                    width: 15,
                                    height: 15,
                                    borderRadius: '50%',
                                    border: '1px solid #0f172a',
                                    background: isPreFilled ? '#0f172a' : '#ffffff',
                                    color: isPreFilled ? '#ffffff' : '#0f172a',
                                    fontSize: 8,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {s}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Question Bubbles Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: totalQ > 120
                          ? 'repeat(5, 1fr)'
                          : totalQ > 45
                            ? 'repeat(4, 1fr)'
                            : 'repeat(3, 1fr)',
                        gap: 12,
                      }}>
                        {(() => {
                          const numCols = totalQ > 120 ? 5 : (totalQ > 45 ? 4 : 3);
                          const qPerCol = Math.ceil(totalQ / numCols);

                          const cols = [];
                          for (let c = 0; c < numCols; c++) {
                            const startQ = c * qPerCol + 1;
                            const endQ = Math.min(totalQ, (c + 1) * qPerCol);
                            if (startQ > totalQ) break;

                            const colFirstQ = paper.questions?.[startQ - 1];
                            const subTitle = colFirstQ?.subject ? colFirstQ.subject.toUpperCase() : 'QUESTIONS';

                            cols.push(
                              <div key={c} style={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ background: '#1e293b', color: '#ffffff', fontSize: 9, fontWeight: 700, padding: '4px 6px', textAlign: 'center' }}>
                                  {subTitle} (Q {startQ} - {endQ})
                                </div>
                                <div>
                                  {Array.from({ length: endQ - startQ + 1 }).map((_, r) => renderQRow(startQ + r, false))}
                                </div>
                              </div>
                            );
                          }
                          return cols;
                        })()}
                      </div>

                      {/* Footer Bar */}
                      <div style={{ marginTop: 14, paddingTop: 8, borderTop: '1px solid #cbd5e1', textAlign: 'center', fontSize: 8, color: '#64748b' }}>
                        {paper.instituteName || 'LEADSON ACADEMY'} · SHEET ID: QF-OMR-SET-{omrSet}-{totalQ}Q · OPTICAL EVALUATION COMPATIBLE
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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

      {/* CBT Launch & Management Modal */}
      {showCbtModal && (
        <CbtLaunchModal
          paper={paper}
          onClose={() => setShowCbtModal(false)}
          onOpenDashboard={(cbtCode) => navigate(`/cbt/${cbtCode}/dashboard`)}
        />
      )}
    </div>
  );
}

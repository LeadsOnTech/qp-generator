import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ChapterPickerModal from '../components/ChapterPickerModal';

export default function GeneratePaper() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examFromUrl = searchParams.get('exam');
  const [tree, setTree] = useState([]);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [patternMessage, setPatternMessage] = useState(null);

  const [title, setTitle] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [institutes, setInstitutes] = useState([]);
  const [paperType, setPaperType] = useState('DPP');
  const [examName, setExamName] = useState('');
  const [subjectCounts, setSubjectCounts] = useState({}); // { Physics: { mcq: 20, nvq: 10 }, ... }
  const [subjectChapters, setSubjectChapters] = useState({}); // { Physics: [{chapter, topics?}, ...] } — empty/absent means "whole syllabus"
  const [pickerSubject, setPickerSubject] = useState(null); // which subject's modal is open, or null
  const [mix, setMix] = useState({ easy: 40, medium: 40, hard: 20 });
  const [avoidRepeats, setAvoidRepeats] = useState(true);
  const [includeSolutions, setIncludeSolutions] = useState(false);
  const [optionFormat, setOptionFormat] = useState('AUTO');
  const [answerFormat, setAnswerFormat] = useState('STANDARD');

  // 5-Year Blueprint Presets state
  const [blueprints, setBlueprints] = useState([]);
  const [loadingBlueprints, setLoadingBlueprints] = useState(false);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState(null);
  const [subjectChapterDistributions, setSubjectChapterDistributions] = useState({});
  const [showWeightageDetails, setShowWeightageDetails] = useState(false);
  const [showSaveCustomModal, setShowSaveCustomModal] = useState(false);
  const [customBlueprintName, setCustomBlueprintName] = useState('');
  const [customBlueprintDesc, setCustomBlueprintDesc] = useState('');

  const loadBlueprints = (eName) => {
    if (!eName) return;
    setLoadingBlueprints(true);
    api.getExamBlueprints(eName)
      .then((bps) => {
        setBlueprints(bps || []);
      })
      .catch((err) => console.warn('Could not load blueprints:', err))
      .finally(() => setLoadingBlueprints(false));
  };

  useEffect(() => {
    api.syllabusTree().then((t) => {
      setTree(t);
      const initialExam = examFromUrl && t.some((e) => e.name === examFromUrl) ? examFromUrl : (t[0]?.name || '');
      if (initialExam) {
        setExamName(initialExam);
        loadBlueprints(initialExam);
      }
    }).catch((err) => setError(err.message));

    if (isAdmin) {
      api.listInstitutes().then(setInstitutes).catch(() => {});
    } else {
      // Institute-role users don't pick from a list — they always use their
      // own account's branding automatically (the backend enforces this
      // regardless of what's sent, so this is just for display purposes).
      api.myInstitute().then((inst) => {
        setInstituteId(inst.id);
        setInstituteName(inst.name);
      }).catch(() => {});
    }
  }, [isAdmin, examFromUrl]);

  const exam = tree.find((e) => e.name === examName);
  const mixTotal = Number(mix.easy) + Number(mix.medium) + Number(mix.hard);
  const totalQuestions = Object.values(subjectCounts).reduce((s, v) => s + (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0), 0);

  useEffect(() => {
    if (!examName) return;
    api.getExamPattern(examName)
      .then((pattern) => {
        if (pattern.subjects) {
          const counts = {};
          for (const s of pattern.subjects) counts[s.name] = { mcq: String(s.mcqCount || s.count || 0), nvq: String(s.nvqCount || 0) };
          setSubjectCounts(counts);
          setPatternMessage(`Loaded ${examName}'s saved pattern.`);
        } else {
          setSubjectCounts({});
          setPatternMessage(null);
        }
        if (pattern.difficultyMix) setMix(pattern.difficultyMix);
        if (pattern.paperType) setPaperType(pattern.paperType);
      })
      .catch(() => {});
  }, [examName]);

  async function savePattern() {
    const subjects = Object.entries(subjectCounts)
      .filter(([, v]) => Number(v) > 0)
      .map(([name, v]) => ({ name, count: Number(v) }));
    if (subjects.length === 0) return setError('Enter at least one subject count before saving a pattern.');
    try {
      await api.saveExamPattern(examName, {
        subjects,
        difficultyMix: { easy: Number(mix.easy), medium: Number(mix.medium), hard: Number(mix.hard) },
        paperType,
      });
      setPatternMessage(`Saved as ${examName}'s default pattern — it will auto-load next time.`);
    } catch (err) {
      setError(err.message);
    }
  }

  function setCount(subjectName, type, value) {
    setSubjectCounts((prev) => ({ ...prev, [subjectName]: { ...prev[subjectName], [type]: value } }));
  }

  function setSelectionFor(subjectName, entries) {
    setSubjectChapters((prev) => ({ ...prev, [subjectName]: entries }));
  }

  function handleExamChange(newExam) {
    setExamName(newExam);
    setSubjectCounts({});
    setSubjectChapterDistributions({});
    setSelectedBlueprintId(null);
    loadBlueprints(newExam);
  }

  function applyBlueprint(bp) {
    setSelectedBlueprintId(bp.id);
    if (bp.paperType) setPaperType(bp.paperType);
    if (bp.optionFormat) setOptionFormat(bp.optionFormat);
    if (bp.answerFormat) setAnswerFormat(bp.answerFormat);
    if (bp.difficultyMix) setMix(bp.difficultyMix);
    if (!title || title.includes('Blueprint') || title.includes('Grand Test') || title.includes('Mock') || title.includes('Revision')) {
      setTitle(`${bp.name} — ${new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`);
    }

    const counts = {};
    const distributions = {};
    const chaptersSel = {};

    for (const s of bp.subjects) {
      counts[s.name] = { mcq: String(s.mcqCount || 0), nvq: String(s.nvqCount || 0) };
      if (s.chapterDistribution) {
        distributions[s.name] = s.chapterDistribution;
        chaptersSel[s.name] = s.chapterDistribution.map(cd => ({ chapter: cd.chapter }));
      }
    }

    setSubjectCounts(counts);
    setSubjectChapterDistributions(distributions);
    setSubjectChapters(chaptersSel);
    setShowWeightageDetails(true);
    setPatternMessage(`Applied blueprint: "${bp.name}" with real 5-year chapter weightages.`);
  }

  async function handleSaveCustomBlueprint() {
    if (!customBlueprintName.trim()) return setError('Enter a name for your custom blueprint.');
    const subjects = Object.entries(subjectCounts).map(([name, v]) => ({
      name,
      mcqCount: Number(v?.mcq) || 0,
      nvqCount: Number(v?.nvq) || 0,
      chapterDistribution: subjectChapterDistributions[name] || undefined,
    }));

    try {
      await api.saveExamBlueprint(examName, {
        name: customBlueprintName.trim(),
        description: customBlueprintDesc.trim() || 'Custom Institute Blueprint',
        paperType,
        optionFormat,
        answerFormat,
        totalQuestions,
        difficultyMix: { easy: Number(mix.easy), medium: Number(mix.medium), hard: Number(mix.hard) },
        subjects,
      });
      setShowSaveCustomModal(false);
      setCustomBlueprintName('');
      setCustomBlueprintDesc('');
      loadBlueprints(examName);
      setPatternMessage(`Custom blueprint "${customBlueprintName}" saved successfully!`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteCustomBlueprint(e, bpId) {
    e.stopPropagation();
    if (!window.confirm('Delete this custom blueprint preset?')) return;
    try {
      await api.deleteExamBlueprint(examName, bpId);
      if (selectedBlueprintId === bpId) setSelectedBlueprintId(null);
      loadBlueprints(examName);
      setPatternMessage('Custom blueprint deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function generate() {
    setError(null);
    const subjects = Object.entries(subjectCounts).filter(([, v]) => (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0) > 0).map(([name, v]) => ({
      name,
      mcqCount: Number(v?.mcq) || 0,
      nvqCount: Number(v?.nvq) || 0,
      selection: (subjectChapters[name] && subjectChapters[name].length > 0) ? subjectChapters[name] : undefined,
      chapterDistribution: (subjectChapterDistributions[name] && subjectChapterDistributions[name].length > 0) ? subjectChapterDistributions[name] : undefined,
    }));

    if (!title.trim()) return setError('Give the paper a title (e.g. "Weekly Test 04").');
    if (subjects.length === 0) return setError('Enter a question count for at least one subject.');
    if (mixTotal !== 100) return setError(`Difficulty mix must add up to 100% (currently ${mixTotal}%).`);

    setGenerating(true);
    try {
      const res = await api.generatePaper({
        title: title.trim(),
        instituteName: instituteName.trim() || undefined,
        instituteId: instituteId || undefined,
        paperType,
        examName,
        optionFormat,
        answerFormat,
        subjects,
        difficultyMix: { easy: Number(mix.easy), medium: Number(mix.medium), hard: Number(mix.hard) },
        avoidRepeats,
        includeSolutions,
      });
      navigate(`/papers/${res.paperId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 3 — Paper Engine</p>
        <h1 className="page-title">Generate Paper</h1>
        <p className="page-sub">
          Choose the exam, how many questions per subject, and the difficulty mix. The engine picks
          from the Verified Bank — respecting the Syllabus Master (removed chapters are never used)
          and skipping questions used in your last three finalized papers. You'll preview everything
          before any PDF is created.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {patternMessage && <div className="alert alert-success">{patternMessage}</div>}

      <div className="card card-pad" style={{ maxWidth: 980 }}>
        <div className="field">
          <label>Test type</label>
          <select value={paperType} onChange={(e) => setPaperType(e.target.value)}>
            <option value="DPP">DPP (Daily Practice Problems)</option>
            <option value="WEEKLY_TEST">Weekly Test</option>
            <option value="GRAND_TEST">Grand Test</option>
            <option value="MOCK_TEST">Mock Test</option>
            <option value="MODEL_PAPER">Model Paper</option>
          </select>
        </div>

        <div className="field">
          <label>Paper title / topic</label>
          <input type="text" placeholder='e.g. "Kinematics & Cell Biology" or "Full Syllabus"' value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {isAdmin ? (
          <>
            <div className="field">
              <label>Institute (letterhead branding)</label>
              <select
                value={instituteId}
                onChange={(e) => {
                  setInstituteId(e.target.value);
                  const picked = institutes.find((i) => i.id === e.target.value);
                  if (picked) setInstituteName(picked.name);
                }}
              >
                <option value="">— Type a custom name instead —</option>
                {institutes.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
              {institutes.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
                  No saved institutes yet — <Link to="/institutes" style={{ color: 'var(--gold-500)' }}>add one</Link> to reuse its logo/phone/address automatically, or just type a name below.
                </div>
              )}
            </div>

            {!instituteId && (
              <div className="field">
                <label>Institute name (custom, no logo — printed on the letterhead)</label>
                <input type="text" placeholder="e.g. KVR Junior College, Vijayawada" value={instituteName} onChange={(e) => setInstituteName(e.target.value)} />
              </div>
            )}
          </>
        ) : (
          <div className="field">
            <label>Letterhead branding</label>
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: 'var(--paper-dim)',
              fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{instituteName ? <>Using <strong>{instituteName}</strong>'s saved branding</> : 'Loading your institute…'}</span>
              <Link to="/my-institute" style={{ color: 'var(--gold-500)', fontWeight: 600, fontSize: 12.5 }}>Edit branding</Link>
            </div>
          </div>
        )}

        <div className="field">
          <label>Exam</label>
          <select value={examName} onChange={(e) => handleExamChange(e.target.value)}>
            {tree.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
          </select>
        </div>

        {/* 5-Year Exam Blueprint Presets Card */}
        {examName && (
          <div style={{
            margin: '18px 0',
            padding: '16px 18px',
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📊</span>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: 0.3 }}>
                    5-Year Exam Blueprint Presets
                  </h3>
                  <span style={{
                    background: '#dbeafe',
                    color: '#1e40af',
                    fontWeight: 700,
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 12,
                    border: '1px solid #bfdbfe'
                  }}>
                    NTA / CET Historical Trends (2020-2024)
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Auto-populates subject question counts and chapter-by-chapter weightage derived from the last 5 years of competitive papers.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '4px 10px', color: '#1e40af', fontWeight: 600, border: '1px solid #bfdbfe', background: '#eff6ff' }}
                onClick={() => setShowSaveCustomModal(true)}
                title="Save your current chapter counts and difficulty mix as a reusable blueprint preset"
              >
                💾 Save Current as Custom Blueprint
              </button>
            </div>

            {/* Blueprint Presets Grid */}
            {loadingBlueprints ? (
              <div style={{ fontSize: 13, color: '#64748b' }}>Loading blueprint presets…</div>
            ) : blueprints.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b' }}>No presets available for this exam yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                {blueprints.map((bp) => {
                  const isSelected = selectedBlueprintId === bp.id;
                  return (
                    <div
                      key={bp.id}
                      onClick={() => applyBlueprint(bp)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.15)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: isSelected ? '#1e40af' : '#0f172a' }}>
                          {bp.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: bp.isCustom ? '#fef3c7' : '#dcfce7',
                            color: bp.isCustom ? '#92400e' : '#15803d',
                            whiteSpace: 'nowrap',
                          }}>
                            {bp.badge || (bp.isCustom ? 'Custom' : 'Official Preset')}
                          </span>
                          {bp.isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomBlueprint(e, bp.id)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', fontSize: 12, padding: 0 }}
                              title="Delete preset"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>
                        {bp.description}
                      </p>
                      <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 11, color: '#475569', fontWeight: 600 }}>
                        <span>📝 {bp.totalQuestions} Questions</span>
                        <span>⚡ {bp.difficultyMix ? `${bp.difficultyMix.easy}%E / ${bp.difficultyMix.medium}%M / ${bp.difficultyMix.hard}%H` : 'Standard Mix'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expandable Chapter Weightage Inspector */}
            {selectedBlueprintId && Object.keys(subjectChapterDistributions).length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '3px 8px', fontSize: 12, color: '#1e40af', fontWeight: 600 }}
                    onClick={() => setShowWeightageDetails((v) => !v)}
                  >
                    {showWeightageDetails ? '▼ Hide 5-Year Chapter Weightage Breakdown' : '▶ View 5-Year Chapter Weightage Breakdown'}
                  </button>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>
                    Questions will be sampled strictly according to these chapter quotas
                  </span>
                </div>

                {showWeightageDetails && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 10 }}>
                    {Object.entries(subjectChapterDistributions).map(([subjName, chapters]) => (
                      <div key={subjName} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 4, marginBottom: 6 }}>
                          {subjName} ({chapters.reduce((s, c) => s + (c.count || 0), 0)} Qs target)
                        </div>
                        <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {chapters.map((c, cIdx) => (
                            <div key={cIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, padding: '2px 0' }}>
                              <span style={{ color: '#334155', maxWidth: '75%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.chapter}>
                                {c.chapter}
                              </span>
                              <span style={{
                                fontWeight: 700,
                                color: c.count >= 3 ? '#b45309' : '#1e3a8a',
                                background: c.count >= 3 ? '#fef3c7' : '#f1f5f9',
                                padding: '1px 6px',
                                borderRadius: 4,
                                fontSize: 10.5
                              }}>
                                {c.count} Qs
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label>Options format</label>
          <select value={optionFormat} onChange={(e) => setOptionFormat(e.target.value)}>
            <option value="AUTO">Automatic by Exam (A, B, C, D for EAPCET/KCET; 1, 2, 3, 4 for NEET/JEE)</option>
            <option value="ALPHA">(A), (B), (C), (D) — EAPCET & State CET standard</option>
            <option value="NUMERIC">(1), (2), (3), (4) — NEET & JEE standard</option>
          </select>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            The question options, instructions, and answer key will all match this exact format.
          </div>
        </div>

        <div className="field">
          <label>Question Paper Layout / Answer Format</label>
          <select value={answerFormat} onChange={(e) => setAnswerFormat(e.target.value)}>
            <option value="STANDARD">Standard Format — Clean layout without brackets (Best for OMR sheets)</option>
            <option value="STUDENT_ANSWER">Student Answer Format [   ] — With square brackets on right side of each question</option>
          </select>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            {answerFormat === 'STUDENT_ANSWER'
              ? 'Adds neat square brackets [   ] next to every question for students to write their option directly (ideal when colleges do not provide OMR sheets).'
              : 'Standard exam paper format without brackets. Best suited when students mark answers on separate OMR sheets.'}
          </div>
        </div>

        {exam && (
          <div className="field">
            <label>Questions per subject</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {exam.subjects.map((s) => {
                const selectionEntries = subjectChapters[s.name] || [];
                return (
                  <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{s.name}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: 'var(--ink-soft)' }}>MCQ</label>
                          <input type="text" inputMode="numeric" placeholder="0" value={subjectCounts[s.name]?.mcq || ''} onChange={(e) => setCount(s.name, 'mcq', e.target.value.replace(/[^0-9]/g, ''))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: 'var(--ink-soft)' }}>NVQ</label>
                          <input type="text" inputMode="numeric" placeholder="0" value={subjectCounts[s.name]?.nvq || ''} onChange={(e) => setCount(s.name, 'nvq', e.target.value.replace(/[^0-9]/g, ''))} style={{ width: '100%' }} />
                        </div>
                      </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ marginTop: 8, padding: '7px 10px', fontSize: 12, width: '100%' }}
                      onClick={() => setPickerSubject(s.name)}
                    >
                      {selectionEntries.length > 0
                        ? `${selectionEntries.length} chapter${selectionEntries.length !== 1 ? 's' : ''} narrowed`
                        : 'Whole syllabus (click to narrow)'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 8 }}>
              Total: <strong>{totalQuestions}</strong> question{totalQuestions !== 1 ? 's' : ''}. Leave a subject unnarrowed to draw from its whole syllabus.
            </div>
          </div>
        )}

        {exam && pickerSubject && (
          <ChapterPickerModal
            open={Boolean(pickerSubject)}
            onClose={() => setPickerSubject(null)}
            subjectName={pickerSubject}
            chapters={(exam.subjects.find((s) => s.name === pickerSubject)?.chapters || []).filter((c) => c.syllabusStatus === 'ACTIVE')}
            selection={subjectChapters[pickerSubject] || []}
            onChange={(entries) => setSelectionFor(pickerSubject, entries)}
          />
        )}

        <div className="field">
          <label>Difficulty mix (must total 100%)</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {['easy', 'medium', 'hard'].map((level) => (
              <div key={level} style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, marginBottom: 4, textTransform: 'capitalize' }}>{level} %</div>
                <input
                  type="text" inputMode="numeric"
                  value={mix[level]}
                  onChange={(e) => setMix((m) => ({ ...m, [level]: e.target.value.replace(/[^0-9]/g, '') }))}
                />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12.5, marginTop: 6, color: mixTotal === 100 ? 'var(--success)' : 'var(--danger)' }}>
            Current total: {mixTotal}%
          </div>
        </div>

        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input id="avoidRepeats" type="checkbox" checked={avoidRepeats} onChange={(e) => setAvoidRepeats(e.target.checked)} />
          <label htmlFor="avoidRepeats" style={{ margin: 0 }}>Avoid questions used in the last 3 finalized papers</label>
        </div>

        <div className="field" style={{ background: 'var(--paper-dim)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <input id="includeSolutions" type="checkbox" checked={includeSolutions} onChange={(e) => setIncludeSolutions(e.target.checked)} style={{ marginTop: 3 }} />
            <label htmlFor="includeSolutions" style={{ margin: 0 }}>
              <strong>Include worked solutions</strong> (optional add-on)
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4, fontWeight: 400 }}>
                Every paper already includes the questions and a free answer key. Turning this on
                adds a full worked-solutions section, charged <strong>1 extra credit per solution</strong>
                {' '}(only for questions that actually have a solution).
              </div>
            </label>
          </div>
          <div style={{ fontSize: 12.5, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)', color: 'var(--ink-soft)' }}>
            {includeSolutions ? (
              <>Estimated cost: <strong>{totalQuestions}</strong> credits for questions + up to <strong>{totalQuestions}</strong> more for solutions
              {' '}= up to <strong>{totalQuestions * 2}</strong> credits. Answer key is free. Exact solution charge depends on how many of these questions have a solution.</>
            ) : (
              <>Estimated cost: <strong>{totalQuestions}</strong> credit{totalQuestions !== 1 ? 's' : ''} ({totalQuestions} question{totalQuestions !== 1 ? 's' : ''} + free answer key).</>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={generate} disabled={generating}>
            {generating ? 'Assembling paper…' : 'Generate & Preview'}
          </button>
          <button className="btn btn-ghost" onClick={savePattern} disabled={!examName || totalQuestions === 0} type="button">
            Save as {examName || 'exam'}'s default pattern
          </button>
        </div>
      </div>

      {/* Save Custom Blueprint Modal */}
      {showSaveCustomModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(16,29,51,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setShowSaveCustomModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 12, width: '100%', maxWidth: 500, padding: 24,
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700 }}>Save as Custom Blueprint Preset</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              Save the current subject question counts, chapter weightages, and difficulty mix as a reusable preset for {examName}.
            </p>
            <div className="field">
              <label>Preset Name</label>
              <input
                type="text"
                placeholder={`e.g. Apex Pre-Final ${examName} Blueprint (${totalQuestions} Qs)`}
                value={customBlueprintName}
                onChange={(e) => setCustomBlueprintName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Short Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Weighted mock for final revision batch"
                value={customBlueprintDesc}
                onChange={(e) => setCustomBlueprintDesc(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowSaveCustomModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveCustomBlueprint}>Save Preset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

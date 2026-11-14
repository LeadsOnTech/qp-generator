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
  const [subjectChapters, setSubjectChapters] = useState({}); // { Physics: [{chapter, topics?}, ...] }
  const [pickerSubject, setPickerSubject] = useState(null); // which subject's modal is open
  const [mix, setMix] = useState({ easy: 40, medium: 40, hard: 20 });
  const [avoidRepeats, setAvoidRepeats] = useState(true);
  const [includeSolutions, setIncludeSolutions] = useState(false);
  const [optionFormat, setOptionFormat] = useState('AUTO');
  const [answerFormat, setAnswerFormat] = useState('STANDARD');
  const [modelMix, setModelMix] = useState('BALANCED');
  const [diagramPreference, setDiagramPreference] = useState('BALANCED');

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
          setPatternMessage(`Loaded ${examName}'s saved default pattern.`);
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
      .filter(([, v]) => (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0) > 0)
      .map(([name, v]) => ({ name, count: (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0) }));
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
        modelMix,
        diagramPreference,
      });
      navigate(`/papers/${res.paperId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div className="studio-badge">
          <span>⚡</span>
          <span>Paper Engine v4.6 &bull; Verified Bank</span>
        </div>
        <h1 className="studio-title">Question Paper Studio</h1>
        <p className="studio-sub">
          Generate rigorous, watermark-ready exam papers with automatic 5-year NTA &amp; CET historical weightages.
          Syllabus-excluded chapters are filtered out, and previously generated questions are automatically rotated.
        </p>
        <div className="studio-chips">
          <div className="studio-chip">
            <span>Exam:</span> <strong>{examName || 'Select an Exam'}</strong>
          </div>
          <div className="studio-chip">
            <span>Format:</span> <strong>{paperType.replace('_', ' ')}</strong>
          </div>
          <div className="studio-chip">
            <span>Questions:</span> <strong>{totalQuestions} Selected</strong>
          </div>
          <div className="studio-chip">
            <span>Mix:</span> <strong>{mix.easy}%E / {mix.medium}%M / {mix.hard}%H</strong>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {patternMessage && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <span>{patternMessage}</span>
        </div>
      )}

      {/* STEP 1: EXAM & BLUEPRINT PRESETS */}
      <div className="executive-card">
        <div className="card-section-header">
          <div>
            <h3 className="card-section-title">
              <span style={{ color: '#2563EB' }}>01</span>
              <span>Select Exam &amp; 5-Year Blueprint Presets</span>
            </h3>
            <p className="card-section-sub">
              Pick your target entrance exam and apply pre-calibrated chapter distributions matching actual 2020–2024 trends.
            </p>
          </div>
          {examName && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12.5, padding: '7px 14px', border: '1px solid #CBD5E1' }}
              onClick={() => setShowSaveCustomModal(true)}
            >
              💾 Save As Custom Preset
            </button>
          )}
        </div>

        <div className="field">
          <label>Target Entrance Examination</label>
          <select value={examName} onChange={(e) => handleExamChange(e.target.value)} style={{ fontWeight: 600 }}>
            {tree.map((e) => (
              <option key={e.id} value={e.name}>{e.name} — Full Question Pool</option>
            ))}
          </select>
        </div>

        {/* Blueprint Presets Grid */}
        {examName && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                Historical Weightage Blueprints
              </span>
              <span style={{ fontSize: 12, color: '#64748B' }}>
                Click a blueprint to auto-fill subject &amp; chapter quotas
              </span>
            </div>

            {loadingBlueprints ? (
              <div className="skeleton" style={{ height: 100 }} />
            ) : blueprints.length === 0 ? (
              <div style={{ padding: '16px 20px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13, color: '#64748B' }}>
                No saved blueprints found for this exam yet. Customize your counts below to save one!
              </div>
            ) : (
              <div className="blueprint-grid">
                {blueprints.map((bp) => {
                  const isSelected = selectedBlueprintId === bp.id;
                  return (
                    <div
                      key={bp.id}
                      onClick={() => applyBlueprint(bp)}
                      className={`blueprint-card-item${isSelected ? ' selected' : ''}`}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: isSelected ? '#1E40AF' : '#0F172A' }}>
                            {bp.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 9999,
                              background: bp.isCustom ? '#FEF3C7' : '#DCFCE7',
                              color: bp.isCustom ? '#92400E' : '#166534',
                            }}>
                              {bp.badge || (bp.isCustom ? 'Custom' : 'Official')}
                            </span>
                            {bp.isCustom && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteCustomBlueprint(e, bp.id)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#DC2626', fontSize: 13 }}
                                title="Delete preset"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                          {bp.description}
                        </p>
                      </div>

                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#475569', fontWeight: 600 }}>
                        <span>📝 {bp.totalQuestions} Questions</span>
                        <span>⚡ {bp.difficultyMix ? `${bp.difficultyMix.easy}%E / ${bp.difficultyMix.medium}%M / ${bp.difficultyMix.hard}%H` : 'Standard'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Chapter Weightage Breakdown Accordion */}
            {selectedBlueprintId && Object.keys(subjectChapterDistributions).length > 0 && (
              <div style={{ marginTop: 16, padding: '14px 18px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 12.5, color: '#2563EB', fontWeight: 700, border: '1px solid #BFDBFE', background: '#EFF6FF' }}
                    onClick={() => setShowWeightageDetails((v) => !v)}
                  >
                    {showWeightageDetails ? '▲ Hide Chapter Breakdown' : '▼ Inspect 5-Year Chapter Quotas'}
                  </button>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    Engine samples strictly according to historical question frequencies
                  </span>
                </div>

                {showWeightageDetails && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
                    {Object.entries(subjectChapterDistributions).map(([subjName, chapters]) => (
                      <div key={subjName} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{subjName}</span>
                          <span style={{ color: '#2563EB' }}>{chapters.reduce((s, c) => s + (c.count || 0), 0)} Qs</span>
                        </div>
                        <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {chapters.map((c, cIdx) => (
                            <div key={cIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '2px 0' }}>
                              <span style={{ color: '#334155', maxWidth: '75%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.chapter}>
                                {c.chapter}
                              </span>
                              <span style={{
                                fontWeight: 700,
                                color: c.count >= 3 ? '#92400E' : '#1E40AF',
                                background: c.count >= 3 ? '#FEF3C7' : '#EFF6FF',
                                padding: '1px 6px',
                                borderRadius: 6,
                                fontSize: 11
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
      </div>

      {/* STEP 2: PAPER PARTICULARS & BRANDING */}
      <div className="executive-card">
        <div className="card-section-header">
          <div>
            <h3 className="card-section-title">
              <span style={{ color: '#2563EB' }}>02</span>
              <span>Paper Title &amp; Letterhead Branding</span>
            </h3>
            <p className="card-section-sub">
              Define the paper header, assessment scope, and collegiate branding for print watermarks.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div className="field">
            <label>Assessment Type</label>
            <select value={paperType} onChange={(e) => setPaperType(e.target.value)}>
              <option value="DPP">DPP (Daily Practice Problems)</option>
              <option value="WEEKLY_TEST">Weekly Test / Unit Exam</option>
              <option value="GRAND_TEST">Grand Test / Pre-Final</option>
              <option value="MOCK_TEST">Official Simulation Mock Test</option>
              <option value="MODEL_PAPER">State Board Model Paper</option>
            </select>
          </div>

          <div className="field">
            <label>Paper Title / Topic Scope</label>
            <input
              type="text"
              placeholder='e.g. "Mechanics & Organic Chemistry Grand Test"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        {isAdmin ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="field">
              <label>Institute Branding (Logo &amp; Header)</label>
              <select
                value={instituteId}
                onChange={(e) => {
                  setInstituteId(e.target.value);
                  const picked = institutes.find((i) => i.id === e.target.value);
                  if (picked) setInstituteName(picked.name);
                }}
              >
                <option value="">— Use Custom Plain Name —</option>
                {institutes.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
            {!instituteId && (
              <div className="field">
                <label>Custom Institution Name</label>
                <input
                  type="text"
                  placeholder="e.g. Narayana IIT Academy, Hyderabad"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="field">
            <label>Official Institute Letterhead</label>
            <div style={{
              padding: '12px 18px',
              borderRadius: 12,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>
                Using <strong>{instituteName || 'College Branding'}</strong> (Auto-attached to watermark &amp; PDF header)
              </span>
              <Link to="/my-institute" style={{ color: '#2563EB', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                Edit Letterhead &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* STEP 3: SUBJECT & QUESTION QUOTAS */}
      {exam && (
        <div className="executive-card">
          <div className="card-section-header">
            <div>
              <h3 className="card-section-title">
                <span style={{ color: '#2563EB' }}>03</span>
                <span>Subject &amp; Chapter Quotas</span>
              </h3>
              <p className="card-section-sub">
                Allocate Multiple Choice (MCQ) and Numerical Value (NVQ) counts. Narrow specific chapters if testing unit syllabus.
              </p>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', background: '#F1F5F9', padding: '6px 14px', borderRadius: 9999 }}>
              Total: {totalQuestions} Questions
            </div>
          </div>

          <div className="subject-quota-grid">
            {exam.subjects.map((s) => {
              const selectionEntries = subjectChapters[s.name] || [];
              const mcqCount = subjectCounts[s.name]?.mcq || '';
              const nvqCount = subjectCounts[s.name]?.nvq || '';
              return (
                <div key={s.id} className="subject-quota-box">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{s.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>
                        {(Number(mcqCount) || 0) + (Number(nvqCount) || 0)} Qs
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>MCQ</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={mcqCount}
                          onChange={(e) => setCount(s.name, 'mcq', e.target.value.replace(/[^0-9]/g, ''))}
                          style={{ textAlign: 'center', fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>NVQ</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={nvqCount}
                          onChange={(e) => setCount(s.name, 'nvq', e.target.value.replace(/[^0-9]/g, ''))}
                          style={{ textAlign: 'center', fontWeight: 700 }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: 12, padding: '7px 10px', fontSize: 12, width: '100%', border: '1px solid #CBD5E1' }}
                    onClick={() => setPickerSubject(s.name)}
                  >
                    {selectionEntries.length > 0
                      ? `🎯 ${selectionEntries.length} Chapter${selectionEntries.length !== 1 ? 's' : ''} Narrowed`
                      : '📖 Whole Syllabus (Click to Narrow)'}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 14 }}>
            💡 <em>Tip:</em> Leaving a subject without narrowed chapters samples questions proportionately from the entire active syllabus.
          </div>
        </div>
      )}

      {/* Chapter Picker Modal */}
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

      {/* STEP 4: DIFFICULTY & LAYOUT SETTINGS */}
      <div className="executive-card">
        <div className="card-section-header">
          <div>
            <h3 className="card-section-title">
              <span style={{ color: '#2563EB' }}>04</span>
              <span>Difficulty Distribution &amp; Layout Formatting</span>
            </h3>
            <p className="card-section-sub">
              Fine-tune cognitive challenge levels and choose whether questions are formatted for OMR or direct answer sheets.
            </p>
          </div>
        </div>

        {/* Difficulty Mix */}
        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ margin: 0 }}>Difficulty Mix Ratio (Must Total 100%)</label>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: mixTotal === 100 ? '#DCFCE7' : '#FEE2E2',
              color: mixTotal === 100 ? '#166534' : '#991B1B'
            }}>
              Current: {mixTotal}% {mixTotal === 100 ? '✓ Balanced' : '⚠️ Must equal 100%'}
            </span>
          </div>

          {/* Visual Bar */}
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${mix.easy}%`, background: '#22C55E', transition: 'width 0.2s' }} title={`Easy ${mix.easy}%`} />
            <div style={{ width: `${mix.medium}%`, background: '#3B82F6', transition: 'width 0.2s' }} title={`Medium ${mix.medium}%`} />
            <div style={{ width: `${mix.hard}%`, background: '#F59E0B', transition: 'width 0.2s' }} title={`Hard ${mix.hard}%`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', display: 'block', marginBottom: 4 }}>Easy %</span>
              <input
                type="text"
                inputMode="numeric"
                value={mix.easy}
                onChange={(e) => setMix((m) => ({ ...m, easy: e.target.value.replace(/[^0-9]/g, '') }))}
                style={{ textAlign: 'center', fontWeight: 700 }}
              />
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', display: 'block', marginBottom: 4 }}>Medium %</span>
              <input
                type="text"
                inputMode="numeric"
                value={mix.medium}
                onChange={(e) => setMix((m) => ({ ...m, medium: e.target.value.replace(/[^0-9]/g, '') }))}
                style={{ textAlign: 'center', fontWeight: 700 }}
              />
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', display: 'block', marginBottom: 4 }}>Hard %</span>
              <input
                type="text"
                inputMode="numeric"
                value={mix.hard}
                onChange={(e) => setMix((m) => ({ ...m, hard: e.target.value.replace(/[^0-9]/g, '') }))}
                style={{ textAlign: 'center', fontWeight: 700 }}
              />
            </div>
          </div>
        </div>

        {/* Layout & Option Format */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 18 }}>
          <div className="field">
            <label>Options Enumeration Format</label>
            <select value={optionFormat} onChange={(e) => setOptionFormat(e.target.value)}>
              <option value="AUTO">Automatic by Exam (A, B, C, D for CETs; 1, 2, 3, 4 for NEET/JEE)</option>
              <option value="ALPHA">(A), (B), (C), (D) — State CET Standard</option>
              <option value="NUMERIC">(1), (2), (3), (4) — NTA NEET / JEE Standard</option>
            </select>
          </div>

          <div className="field">
            <label>Question Paper Layout / Answer Format</label>
            <select value={answerFormat} onChange={(e) => setAnswerFormat(e.target.value)}>
              <option value="STANDARD">Standard Layout (Best for OMR Sheet Exams)</option>
              <option value="STUDENT_ANSWER">Student Answer Format [   ] (Brackets next to each question)</option>
            </select>
          </div>
        </div>

        {/* Model Variety / Mix Selector */}
        <div style={{ marginTop: 14 }}>
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ margin: 0 }}>MCQ Question Model Variety &amp; Distribution</label>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', background: '#DBEAFE', padding: '2px 8px', borderRadius: 6 }}>
                Prevents 100% Theory or 100% Calculation Papers
              </span>
            </div>
            <select value={modelMix} onChange={(e) => setModelMix(e.target.value)}>
              <option value="BALANCED">🎯 Balanced Mix of All Models (Theory + Numerical Problems + Statements + Diagrams) — Recommended</option>
              <option value="THEORY_ONLY">📖 Theory &amp; Conceptual Focus (Definitions, Concepts, Reasoning)</option>
              <option value="PROBLEMS_ONLY">🧮 Numerical &amp; Calculations Focus (Formulas, Math, Quantitative)</option>
              <option value="ANY">🎲 Any / Random Unrestricted</option>
            </select>
            <p style={{ fontSize: 11.5, color: '#64748B', marginTop: 5, marginBottom: 0 }}>
              {modelMix === 'BALANCED' && 'Guarantees that generated papers contain a realistic, pedagogically balanced mix across theoretical questions, numerical calculation problems, and special formats (statements/diagrams).'}
              {modelMix === 'THEORY_ONLY' && 'Prioritizes theoretical definitions, qualitative reasoning, and factual questions from the question bank.'}
              {modelMix === 'PROBLEMS_ONLY' && 'Prioritizes mathematical calculations, formulas, numerical problem solving, and quantitative questions.'}
              {modelMix === 'ANY' && 'Picks questions at random based strictly on difficulty without balancing question models.'}
            </p>
          </div>
        </div>

        {/* Diagram & Image Questions Filter */}
        <div style={{ marginTop: 14 }}>
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ margin: 0, fontWeight: 700 }}>🖼️ Diagram &amp; Image Questions Filter</label>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#D1FAE5', padding: '2px 8px', borderRadius: 6 }}>
                Image Controls
              </span>
            </div>
            <select value={diagramPreference} onChange={(e) => setDiagramPreference(e.target.value)}>
              <option value="BALANCED">🎯 Balanced Mix (Auto-mix diagrams with normal text questions) — Standard</option>
              <option value="ONLY_DIAGRAMS">🖼️ Only Image / Diagram Questions (100% Visual / Diagram-Based Paper)</option>
              <option value="PREFER_DIAGRAMS">⚡ Heavy Diagram Focus (Prioritize all available diagrams in selected chapters)</option>
              <option value="NO_DIAGRAMS">📄 Text-Only (Exclude all diagrams and figures)</option>
            </select>
            <p style={{ fontSize: 11.5, color: '#64748B', marginTop: 5, marginBottom: 0 }}>
              {diagramPreference === 'BALANCED' && 'Blends normal theoretical and calculation questions with diagram/figure questions from your Question Bank.'}
              {diagramPreference === 'ONLY_DIAGRAMS' && 'Picks ONLY questions that have attached diagrams/figures (ideal for visual tests, circuit analysis, and ray optics worksheets).'}
              {diagramPreference === 'PREFER_DIAGRAMS' && 'Prioritizes diagram-based questions from every selected chapter, filling remaining slots with normal questions.'}
              {diagramPreference === 'NO_DIAGRAMS' && 'Excludes all questions containing diagrams or figures (ideal for pure text printing).'}
            </p>
          </div>
        </div>

        {/* Avoid repeats toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', marginTop: 12 }}>
          <input
            id="avoidRepeats"
            type="checkbox"
            checked={avoidRepeats}
            onChange={(e) => setAvoidRepeats(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#2563EB', cursor: 'pointer' }}
          />
          <label htmlFor="avoidRepeats" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
            Rotate Questions: Avoid questions used in the last 3 finalized papers for this institute
          </label>
        </div>

        {/* Worked Solutions Addon */}
        <div style={{
          marginTop: 14,
          padding: '16px 18px',
          borderRadius: 14,
          border: includeSolutions ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
          background: includeSolutions ? '#EFF6FF' : '#FFFFFF',
          transition: 'all 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <input
              id="includeSolutions"
              type="checkbox"
              checked={includeSolutions}
              onChange={(e) => setIncludeSolutions(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#2563EB', cursor: 'pointer', marginTop: 3 }}
            />
            <label htmlFor="includeSolutions" style={{ margin: 0, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Include Worked Step-by-Step Solutions</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#DBEAFE', color: '#1E40AF' }}>
                  2-Column Paper-Saver Format
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B', lineHeight: 1.4 }}>
                Adds a compact 2-column worked-solutions booklet at the end of the question paper, minimizing Xerox paper consumption.
                (Charged 1 extra credit only for questions with full solutions).
              </p>
            </label>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM ACTION DOCK */}
      <div className="sticky-action-dock">
        <div className="dock-meta">
          <div className="dock-stat">
            <span className="dock-stat-label">Total Questions</span>
            <span className="dock-stat-val">{totalQuestions} Qs</span>
          </div>
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />
          <div className="dock-stat">
            <span className="dock-stat-label">Estimated Credits</span>
            <span className="dock-stat-val" style={{ color: '#60A5FA' }}>
              {includeSolutions ? `${totalQuestions} to ${totalQuestions * 2}` : totalQuestions} Cr
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: '#E2E8F0', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)' }}
            onClick={savePattern}
            disabled={!examName || totalQuestions === 0}
          >
            Save Default Pattern
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '12px 28px', fontSize: 15, fontWeight: 700 }}
            onClick={generate}
            disabled={generating || totalQuestions === 0 || mixTotal !== 100}
          >
            {generating ? '⚙️ Assembling Paper...' : 'Generate & Preview Paper →'}
          </button>
        </div>
      </div>

      {/* Save Custom Blueprint Modal */}
      {showSaveCustomModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setShowSaveCustomModal(false)}>
          <div style={{
            background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 500, padding: 28,
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
              Save Custom Blueprint Preset
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
              Save current question counts, chapter distributions, and difficulty mix as a reusable one-click preset for {examName}.
            </p>
            <div className="field">
              <label>Preset Name</label>
              <input
                type="text"
                placeholder={`e.g. Apex Pre-Final ${examName} (${totalQuestions} Qs)`}
                value={customBlueprintName}
                onChange={(e) => setCustomBlueprintName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Short Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Heavy Mechanics & Organic Chemistry focus"
                value={customBlueprintDesc}
                onChange={(e) => setCustomBlueprintDesc(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowSaveCustomModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveCustomBlueprint}>Save Preset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

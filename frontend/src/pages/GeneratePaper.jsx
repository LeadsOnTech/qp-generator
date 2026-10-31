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

  useEffect(() => {
    api.syllabusTree().then((t) => {
      setTree(t);
      const initialExam = examFromUrl && t.some((e) => e.name === examFromUrl) ? examFromUrl : (t[0]?.name || '');
      if (initialExam) setExamName(initialExam);
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

  async function generate() {
    setError(null);
    const subjects = Object.entries(subjectCounts).filter(([, v]) => (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0) > 0).map(([name, v]) => ({ name, mcqCount: Number(v?.mcq) || 0, nvqCount: Number(v?.nvq) || 0,
        selection: (subjectChapters[name] && subjectChapters[name].length > 0) ? subjectChapters[name] : undefined,
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
          <select value={examName} onChange={(e) => { setExamName(e.target.value); setSubjectCounts({}); }}>
            {tree.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
          </select>
        </div>

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
            <option value="STANDARD">Standard Format — Clean layout without answer boxes (Best for OMR sheets)</option>
            <option value="STUDENT_ANSWER">Student Answer Format [  ] — With answer box on right side of each question</option>
          </select>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            {answerFormat === 'STUDENT_ANSWER'
              ? 'Adds a neat [  ] answer box next to every question for students to write their option directly (ideal when colleges do not provide OMR sheets).'
              : 'Standard exam paper format without answer boxes. Best suited when students mark answers on separate OMR sheets.'}
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
    </div>
  );
}

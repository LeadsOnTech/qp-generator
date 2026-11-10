import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStoredToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import '../college-builder.css';

function getAuthToken() {
  return getStoredToken();
}

// =========================================================================
// STANDARD INSTITUTIONAL CONTENT PRESETS (AUTO-CONFORMING TO TEMPLATE)
// =========================================================================

const DEFAULT_WHY_CHOOSE_US = [
  {
    icon: 'academic-cap',
    title: 'IITian & Doctor Faculty Pool',
    description: 'Learn directly from seasoned master teachers with 15+ years of track record producing Top 100 AIRs in NEET & JEE Advanced.'
  },
  {
    icon: 'document-text',
    title: 'Daily Practice Problem (DPP) Sheets',
    description: 'Every lecture is reinforced with graded homework problem sheets (Level 1 Foundation, Level 2 Standard, Level 3 Challenger).'
  },
  {
    icon: 'desktop-computer',
    title: 'NTA-Pattern Computer CBT Labs',
    description: 'State-of-the-art air-conditioned computer terminals replicating official JEE Main & CUET exam interfaces with full analytics.'
  },
  {
    icon: 'chat-bubble',
    title: '1-on-1 Personalized Mentorship',
    description: 'Dedicated subject deans review weekly error logs, rectify silly mistakes, and provide targeted stress counseling.'
  },
  {
    icon: 'device-mobile',
    title: 'Parent Mobile App & Daily SMS',
    description: 'Real-time biometric attendance alerts, weekly exam performance cards, and automated marks progress reports.'
  },
  {
    icon: 'shield-check',
    title: 'Disciplined & Safe Campus',
    description: 'CCTV-secured campus with separate modern residential hostels, hygienic dining, and continuous academic vigil.'
  }
];

const DEFAULT_METHODOLOGY_STEPS = [
  {
    stepNumber: '01',
    badge: 'FOUNDATION',
    title: 'First-Principles Concept Mastery',
    description: 'Deep theoretical grounding without rote memorization. Visual simulations and interactive problem derivations by senior faculty.'
  },
  {
    stepNumber: '02',
    badge: 'APPLICATION',
    title: 'Daily Graded Worksheets (DPPs)',
    description: 'Immediate reinforcement of concepts through timed practice sets covering single-choice, numerical, and assertion-reason questions.'
  },
  {
    stepNumber: '03',
    badge: 'TESTING',
    title: 'Weekly All-India Benchmark Mocks',
    description: 'Standardized weekend exams benchmarking student performance across state and national peers with negative-marking analysis.'
  },
  {
    stepNumber: '04',
    badge: 'ANALYSIS',
    title: 'Diagnostic Error-Log Correction',
    description: 'Every mock exam is followed by micro-level error tracing to classify mistakes into conceptual gaps, speed issues, or misreads.'
  },
  {
    stepNumber: '05',
    badge: 'RANK ACCELERATION',
    title: 'Super-30 Intensive Final Sprint',
    description: 'High-intensity revision capsules, previous 15-year chapter-wise PYQ marathons, and psychological confidence conditioning.'
  }
];

const DEFAULT_STATS_COUNTERS = [
  { value: '15,000+', label: 'Students Mentored' },
  { value: '2,500+', label: 'NEET & JEE Selections' },
  { value: '50+', label: 'Master Faculty Members' },
  { value: '99.8%', label: 'Highest State Percentile' }
];

const DEFAULT_ADMISSION_PROCESS = [
  {
    step: '01',
    title: 'Submit Online Enquiry',
    description: 'Complete our quick online registration form with student academic marks and stream preference.'
  },
  {
    step: '02',
    title: 'Diagnostic Talent & Scholarship Test',
    description: 'Appear for the Annual Scholarship Test (AITSE) to evaluate baseline readiness and qualify for fee waivers.'
  },
  {
    step: '03',
    title: 'Personal Academic Counseling',
    description: 'Meet with senior academic deans to map individual career targets and batch allocation.'
  },
  {
    step: '04',
    title: 'Seat Allotment & Enrollment',
    description: 'Finalize document verification, collect curriculum kit, and attend the student induction program.'
  }
];

const DEFAULT_SCHOLARSHIP_DETAILS = [
  {
    name: 'State Ranker Scholarship',
    criteria: 'Top 50 Ranks in AITSE or 98%+ in 10th Board Exams',
    benefit: '100% Full Tuition Waiver for 2 Years'
  },
  {
    name: 'Merit Excellence Scholarship',
    criteria: 'Ranks 51 - 150 in AITSE or 95% - 97.9% in 10th Board Exams',
    benefit: '75% Tuition Fee Waiver'
  },
  {
    name: 'Academic Achiever Concession',
    criteria: 'Ranks 151 - 500 in AITSE or 90% - 94.9% in 10th Board Exams',
    benefit: '50% Tuition Fee Waiver'
  },
  {
    name: 'Defense & Social Quota',
    criteria: 'Wards of Armed Forces / Police & Single Parent Girls',
    benefit: 'Special 25% Institutional Grant'
  }
];

const DEFAULT_FAQS = [
  {
    question: 'What is the admission procedure for intermediate MPC & BiPC courses?',
    answer: 'Admissions are based on 10th standard board exam scores and our annual talent screening test. Parents can register online or visit our campus for direct academic counseling.'
  },
  {
    question: 'What competitive exams do you prepare students for?',
    answer: 'We provide dedicated coaching for NEET (Medical), JEE Main & JEE Advanced (Engineering), CUET, and state EAPCET, fully integrated with the Intermediate Board syllabus.'
  },
  {
    question: 'Are residential hostel facilities available for outstation students?',
    answer: 'Yes, we provide separate, fully secure air-cooled residential hostels for boys and girls with 24x7 warden supervision, hygienic vegetarian dining, and evening doubt-clearing sessions.'
  },
  {
    question: 'How do parents track student test performance and attendance?',
    answer: 'Parents receive automated daily SMS alerts for attendance and can access our mobile app to view detailed weekly mock test scorecards, ranks, and teacher remarks.'
  },
  {
    question: 'What scholarships or fee concessions are available?',
    answer: 'Merit scholarships up to 100% tuition fee waiver are awarded based on our Scholarship Talent Search Exam and exceptional 10th board CGPA scores.'
  }
];

function safeParseArray(raw, fallback = []) {
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

// 1. Visual Why Choose Us Editor
function WhyChooseUsVisualEditor({ value, onChange }) {
  const [items, setItems] = useState(() => safeParseArray(value, DEFAULT_WHY_CHOOSE_US));
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (value) {
      const parsed = safeParseArray(value, null);
      if (parsed) setItems(parsed);
    }
  }, [value]);

  const updateItems = (newItems) => {
    setItems(newItems);
    onChange(JSON.stringify(newItems));
  };

  const handleChange = (index, field, val) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: val };
    updateItems(copy);
  };

  const handleAdd = () => {
    const newItem = {
      icon: 'academic-cap',
      title: 'New Institutional Advantage',
      description: 'Highlight what makes this program or campus feature uniquely valuable for students.'
    };
    updateItems([...items, newItem]);
  };

  const handleDelete = (index) => {
    if (items.length <= 1) {
      if (!confirm('Are you sure you want to remove this pillar?')) return;
    }
    const filtered = items.filter((_, idx) => idx !== index);
    updateItems(filtered);
  };

  const handleMove = (index, dir) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    updateItems(copy);
  };

  const handleReset = () => {
    if (confirm('Reset Why Choose Us pillars to the standard recommended 6 institutional pillars?')) {
      updateItems(DEFAULT_WHY_CHOOSE_US);
    }
  };

  return (
    <div className="cwb-structured-box">
      <div className="cwb-structured-top">
        <div className="cwb-structured-title-group">
          <div className="cwb-structured-title">
            <span>🏛️ Why Choose Our College ({items.length} Pillars)</span>
            <span className="cwb-item-pill">Section 06</span>
          </div>
          <p className="cwb-structured-desc">
            Natural visual editor: define the key reasons students choose your college. Changes auto-adapt cleanly to the website template cards.
          </p>
        </div>
        <div className="cwb-structured-toolbar">
          <button type="button" onClick={handleReset} className="cwb-btn-chip">
            ↺ Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className={`cwb-btn-chip ${showRaw ? 'cwb-btn-chip-primary' : ''}`}
          >
            {showRaw ? '✓ Visual Cards' : '⚡ Advanced JSON'}
          </button>
          <button type="button" onClick={handleAdd} className="cwb-btn-chip cwb-btn-chip-primary">
            + Add Pillar
          </button>
        </div>
      </div>

      {showRaw ? (
        <div>
          <textarea
            rows={6}
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) setItems(parsed);
              } catch (_) {}
            }}
            className="cwb-textarea"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}
          />
          <p className="cwb-hint">Advanced: raw JSON format. Click '✓ Visual Cards' to switch back to friendly form inputs.</p>
        </div>
      ) : (
        <div className="cwb-vcard-stack">
          {items.map((item, idx) => (
            <div key={idx} className="cwb-vcard">
              <div className="cwb-vcard-header">
                <span className="cwb-vcard-pill">
                  Pillar #{idx + 1}
                </span>
                <div className="cwb-vcard-actions">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="cwb-btn-chip"
                    title="Move Up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="cwb-btn-chip"
                    title="Move Down"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="cwb-btn-chip cwb-btn-chip-danger"
                    title="Delete Pillar"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>

              <div className="cwb-grid-fields">
                <div className="cwb-col-4">
                  <label className="cwb-label">Pillar Icon</label>
                  <select
                    value={item.icon || 'academic-cap'}
                    onChange={(e) => handleChange(idx, 'icon', e.target.value)}
                    className="cwb-select"
                  >
                    <option value="academic-cap">🎓 Faculty / Academics</option>
                    <option value="document-text">📄 DPP / Practice Sheets</option>
                    <option value="desktop-computer">💻 CBT Computer Labs</option>
                    <option value="chat-bubble">💬 1-on-1 Mentorship</option>
                    <option value="device-mobile">📱 Parent Mobile App</option>
                    <option value="shield-check">🛡️ Campus Safety & Vigil</option>
                    <option value="star">⭐ Ranks & Excellence</option>
                    <option value="beaker">🔬 Modern Science Labs</option>
                  </select>
                </div>

                <div className="cwb-col-8">
                  <label className="cwb-label">Card Heading / Advantage Title</label>
                  <input
                    type="text"
                    value={item.title || ''}
                    onChange={(e) => handleChange(idx, 'title', e.target.value)}
                    placeholder="e.g. IITian & Doctor Faculty Pool"
                    className="cwb-input"
                  />
                </div>

                <div className="cwb-col-12">
                  <label className="cwb-label">Sub-heading / Description</label>
                  <textarea
                    rows={2}
                    value={item.description || ''}
                    onChange={(e) => handleChange(idx, 'description', e.target.value)}
                    placeholder="Explain this institutional pillar in 1-2 compelling sentences..."
                    className="cwb-textarea"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={handleAdd} className="cwb-btn-dashed">
            + Add Another Advantage Pillar
          </button>
        </div>
      )}
    </div>
  );
}

// 2. Visual Methodology Steps Editor
function MethodologyStepsVisualEditor({ value, onChange }) {
  const [items, setItems] = useState(() => safeParseArray(value, DEFAULT_METHODOLOGY_STEPS));
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (value) {
      const parsed = safeParseArray(value, null);
      if (parsed) setItems(parsed);
    }
  }, [value]);

  const updateItems = (newItems) => {
    setItems(newItems);
    onChange(JSON.stringify(newItems));
  };

  const handleChange = (index, field, val) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: val };
    updateItems(copy);
  };

  const handleAdd = () => {
    const nextNum = items.length < 9 ? `0${items.length + 1}` : `${items.length + 1}`;
    const newItem = {
      stepNumber: nextNum,
      badge: 'MASTERY',
      title: 'Advanced Practice & Problem Solving',
      description: 'Intensive practice sessions targeting tricky problems and multi-concept questions.'
    };
    updateItems([...items, newItem]);
  };

  const handleDelete = (index) => {
    if (items.length <= 1) {
      if (!confirm('Are you sure you want to remove this stage?')) return;
    }
    const filtered = items.filter((_, idx) => idx !== index);
    updateItems(filtered);
  };

  const handleMove = (index, dir) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    updateItems(copy);
  };

  const handleReset = () => {
    if (confirm('Reset teaching methodology to the standard 5-step framework?')) {
      updateItems(DEFAULT_METHODOLOGY_STEPS);
    }
  };

  return (
    <div className="cwb-structured-box">
      <div className="cwb-structured-top">
        <div className="cwb-structured-title-group">
          <div className="cwb-structured-title">
            <span>🎯 Teaching Methodology & Rigour ({items.length} Stages)</span>
            <span className="cwb-item-pill">Section 09</span>
          </div>
          <p className="cwb-structured-desc">
            Natural visual editor: define the learning workflow from fundamental theory to rank acceleration.
          </p>
        </div>
        <div className="cwb-structured-toolbar">
          <button type="button" onClick={handleReset} className="cwb-btn-chip">
            ↺ Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className={`cwb-btn-chip ${showRaw ? 'cwb-btn-chip-primary' : ''}`}
          >
            {showRaw ? '✓ Visual Cards' : '⚡ Advanced JSON'}
          </button>
          <button type="button" onClick={handleAdd} className="cwb-btn-chip cwb-btn-chip-primary">
            + Add Stage
          </button>
        </div>
      </div>

      {showRaw ? (
        <div>
          <textarea
            rows={6}
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) setItems(parsed);
              } catch (_) {}
            }}
            className="cwb-textarea"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}
          />
          <p className="cwb-hint">Advanced: raw JSON format.</p>
        </div>
      ) : (
        <div className="cwb-vcard-stack">
          {items.map((step, idx) => (
            <div key={idx} className="cwb-vcard">
              <div className="cwb-vcard-header">
                <span className="cwb-vcard-pill">
                  Stage {step.stepNumber || idx + 1}: {step.badge || 'STEP'}
                </span>
                <div className="cwb-vcard-actions">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="cwb-btn-chip"
                    title="Move Up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="cwb-btn-chip"
                    title="Move Down"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="cwb-btn-chip cwb-btn-chip-danger"
                    title="Delete Stage"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>

              <div className="cwb-grid-fields">
                <div className="cwb-col-2">
                  <label className="cwb-label">Step #</label>
                  <input
                    type="text"
                    value={step.stepNumber || ''}
                    onChange={(e) => handleChange(idx, 'stepNumber', e.target.value)}
                    placeholder="01"
                    className="cwb-input"
                  />
                </div>

                <div className="cwb-col-3">
                  <label className="cwb-label">Stage Badge</label>
                  <input
                    type="text"
                    value={step.badge || ''}
                    onChange={(e) => handleChange(idx, 'badge', e.target.value)}
                    placeholder="e.g. FOUNDATION"
                    className="cwb-input"
                  />
                </div>

                <div className="cwb-col-7">
                  <label className="cwb-label">Stage Title / Heading</label>
                  <input
                    type="text"
                    value={step.title || ''}
                    onChange={(e) => handleChange(idx, 'title', e.target.value)}
                    placeholder="e.g. First-Principles Concept Mastery"
                    className="cwb-input"
                  />
                </div>

                <div className="cwb-col-12">
                  <label className="cwb-label">Pedagogical Description / Explanation</label>
                  <textarea
                    rows={2}
                    value={step.description || ''}
                    onChange={(e) => handleChange(idx, 'description', e.target.value)}
                    placeholder="Explain what the student accomplishes in this learning stage..."
                    className="cwb-textarea"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={handleAdd} className="cwb-btn-dashed">
            + Add Another Methodology Stage
          </button>
        </div>
      )}
    </div>
  );
}

// 3. Visual Stats & Counters Editor
function StatsCountersVisualEditor({ value, onChange }) {
  const [items, setItems] = useState(() => safeParseArray(value, DEFAULT_STATS_COUNTERS));
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (value) {
      const parsed = safeParseArray(value, null);
      if (parsed) setItems(parsed);
    }
  }, [value]);

  const updateItems = (newItems) => {
    setItems(newItems);
    onChange(JSON.stringify(newItems));
  };

  const handleChange = (index, field, val) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: val };
    updateItems(copy);
  };

  const handleAdd = () => {
    const newItem = { value: '100+', label: 'New Metric Label' };
    updateItems([...items, newItem]);
  };

  const handleDelete = (index) => {
    const filtered = items.filter((_, idx) => idx !== index);
    updateItems(filtered);
  };

  const handleReset = () => {
    if (confirm('Reset institutional stats to default metrics?')) {
      updateItems(DEFAULT_STATS_COUNTERS);
    }
  };

  return (
    <div className="cwb-structured-box">
      <div className="cwb-structured-top">
        <div className="cwb-structured-title-group">
          <div className="cwb-structured-title">
            <span>📊 Key Institutional Metrics & Counters ({items.length})</span>
            <span className="cwb-item-pill">Section 03</span>
          </div>
          <p className="cwb-structured-desc">
            Animated numbers displayed directly below your hero banner (e.g., student selections, faculty count, alumni base).
          </p>
        </div>
        <div className="cwb-structured-toolbar">
          <button type="button" onClick={handleReset} className="cwb-btn-chip">
            ↺ Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className={`cwb-btn-chip ${showRaw ? 'cwb-btn-chip-primary' : ''}`}
          >
            {showRaw ? '✓ Visual Cards' : '⚡ Advanced JSON'}
          </button>
          <button type="button" onClick={handleAdd} className="cwb-btn-chip cwb-btn-chip-primary">
            + Add Metric
          </button>
        </div>
      </div>

      {showRaw ? (
        <div>
          <textarea
            rows={5}
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) setItems(parsed);
              } catch (_) {}
            }}
            className="cwb-textarea"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}
          />
        </div>
      ) : (
        <div>
          <div className="cwb-stat-grid-editor">
            {items.map((stat, idx) => (
              <div key={idx} className="cwb-stat-cell-editor">
                <div className="cwb-stat-cell-top">
                  <span className="cwb-card-badge">Metric #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="cwb-btn-chip cwb-btn-chip-danger"
                    title="Remove Metric"
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <label className="cwb-label">Number / Value (with +, %)</label>
                  <input
                    type="text"
                    value={stat.value || ''}
                    onChange={(e) => handleChange(idx, 'value', e.target.value)}
                    placeholder="e.g. 15,000+"
                    className="cwb-input"
                  />
                </div>
                <div>
                  <label className="cwb-label">Metric Label</label>
                  <input
                    type="text"
                    value={stat.label || ''}
                    onChange={(e) => handleChange(idx, 'label', e.target.value)}
                    placeholder="e.g. Students Mentored"
                    className="cwb-input"
                  />
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={handleAdd} className="cwb-btn-dashed">
            + Add Another Metric Counter
          </button>
        </div>
      )}
    </div>
  );
}

// 4. Visual Admission Roadmap Editor
function AdmissionRoadmapVisualEditor({ value, onChange }) {
  const [items, setItems] = useState(() => safeParseArray(value, DEFAULT_ADMISSION_PROCESS));
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (value) {
      const parsed = safeParseArray(value, null);
      if (parsed) setItems(parsed);
    }
  }, [value]);

  const updateItems = (newItems) => {
    setItems(newItems);
    onChange(JSON.stringify(newItems));
  };

  const handleChange = (index, field, val) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: val };
    updateItems(copy);
  };

  const handleAdd = () => {
    const nextStep = items.length < 9 ? `0${items.length + 1}` : `${items.length + 1}`;
    const newItem = {
      step: nextStep,
      title: 'New Admission Step',
      description: 'Describe what the applicant needs to complete at this stage.'
    };
    updateItems([...items, newItem]);
  };

  const handleDelete = (index) => {
    const filtered = items.filter((_, idx) => idx !== index);
    updateItems(filtered);
  };

  const handleMove = (index, dir) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    updateItems(copy);
  };

  const handleReset = () => {
    if (confirm('Reset to the standard 4-step admission roadmap?')) {
      updateItems(DEFAULT_ADMISSION_PROCESS);
    }
  };

  return (
    <div className="cwb-structured-box">
      <div className="cwb-structured-top">
        <div className="cwb-structured-title-group">
          <div className="cwb-structured-title">
            <span>🗺️ Admission Process Roadmap ({items.length} Steps)</span>
            <span className="cwb-item-pill">Section 12 / 13</span>
          </div>
          <p className="cwb-structured-desc">
            Natural visual editor: clear sequential steps guiding prospective students from online inquiry to final enrollment.
          </p>
        </div>
        <div className="cwb-structured-toolbar">
          <button type="button" onClick={handleReset} className="cwb-btn-chip">
            ↺ Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className={`cwb-btn-chip ${showRaw ? 'cwb-btn-chip-primary' : ''}`}
          >
            {showRaw ? '✓ Visual Cards' : '⚡ Advanced JSON'}
          </button>
          <button type="button" onClick={handleAdd} className="cwb-btn-chip cwb-btn-chip-primary">
            + Add Step
          </button>
        </div>
      </div>

      {showRaw ? (
        <div>
          <textarea
            rows={5}
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) setItems(parsed);
              } catch (_) {}
            }}
            className="cwb-textarea"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}
          />
        </div>
      ) : (
        <div className="cwb-vcard-stack">
          {items.map((st, idx) => (
            <div key={idx} className="cwb-vcard">
              <div className="cwb-vcard-header">
                <span className="cwb-vcard-pill">
                  Step {st.step || idx + 1}
                </span>
                <div className="cwb-vcard-actions">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="cwb-btn-chip"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="cwb-btn-chip"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="cwb-btn-chip cwb-btn-chip-danger"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>

              <div className="cwb-grid-fields">
                <div className="cwb-col-2">
                  <label className="cwb-label">Step #</label>
                  <input
                    type="text"
                    value={st.step || ''}
                    onChange={(e) => handleChange(idx, 'step', e.target.value)}
                    placeholder="01"
                    className="cwb-input"
                  />
                </div>

                <div className="cwb-col-10">
                  <label className="cwb-label">Step Heading / Action Title</label>
                  <input
                    type="text"
                    value={st.title || ''}
                    onChange={(e) => handleChange(idx, 'title', e.target.value)}
                    placeholder="e.g. Submit Online Enquiry"
                    className="cwb-input"
                  />
                </div>

                <div className="cwb-col-12">
                  <label className="cwb-label">Step Description & Guidance</label>
                  <textarea
                    rows={2}
                    value={st.description || st.desc || ''}
                    onChange={(e) => handleChange(idx, 'description', e.target.value)}
                    placeholder="Complete our quick online registration form..."
                    className="cwb-textarea"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={handleAdd} className="cwb-btn-dashed">
            + Add Another Admission Step
          </button>
        </div>
      )}
    </div>
  );
}

// 5. Visual Scholarship Tiers Editor
function ScholarshipTiersVisualEditor({ value, onChange }) {
  const [items, setItems] = useState(() => safeParseArray(value, DEFAULT_SCHOLARSHIP_DETAILS));
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (value) {
      const parsed = safeParseArray(value, null);
      if (parsed) setItems(parsed);
    }
  }, [value]);

  const updateItems = (newItems) => {
    setItems(newItems);
    onChange(JSON.stringify(newItems));
  };

  const handleChange = (index, field, val) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: val };
    updateItems(copy);
  };

  const handleAdd = () => {
    const newItem = {
      name: 'Special Merit Concession',
      criteria: 'Top percentile in screening test',
      benefit: '50% Tuition Fee Waiver'
    };
    updateItems([...items, newItem]);
  };

  const handleDelete = (index) => {
    const filtered = items.filter((_, idx) => idx !== index);
    updateItems(filtered);
  };

  const handleMove = (index, dir) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    updateItems(copy);
  };

  const handleReset = () => {
    if (confirm('Reset to the standard scholarship concession tiers?')) {
      updateItems(DEFAULT_SCHOLARSHIP_DETAILS);
    }
  };

  return (
    <div className="cwb-structured-box">
      <div className="cwb-structured-top">
        <div className="cwb-structured-title-group">
          <div className="cwb-structured-title">
            <span>🏆 Scholarship & Concession Tiers ({items.length} Tiers)</span>
            <span className="cwb-item-pill">Section 12 / 13</span>
          </div>
          <p className="cwb-structured-desc">
            Natural visual editor: define transparent merit fee waivers to motivate top academic talent.
          </p>
        </div>
        <div className="cwb-structured-toolbar">
          <button type="button" onClick={handleReset} className="cwb-btn-chip">
            ↺ Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className={`cwb-btn-chip ${showRaw ? 'cwb-btn-chip-primary' : ''}`}
          >
            {showRaw ? '✓ Visual Cards' : '⚡ Advanced JSON'}
          </button>
          <button type="button" onClick={handleAdd} className="cwb-btn-chip cwb-btn-chip-primary">
            + Add Tier
          </button>
        </div>
      </div>

      {showRaw ? (
        <div>
          <textarea
            rows={5}
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) setItems(parsed);
              } catch (_) {}
            }}
            className="cwb-textarea"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}
          />
        </div>
      ) : (
        <div className="cwb-vcard-stack">
          {items.map((sc, idx) => (
            <div key={idx} className="cwb-vcard">
              <div className="cwb-vcard-header">
                <span className="cwb-vcard-pill">
                  Tier #{idx + 1}: {sc.name || sc.bracket || 'Scholarship'}
                </span>
                <div className="cwb-vcard-actions">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="cwb-btn-chip"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="cwb-btn-chip"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="cwb-btn-chip cwb-btn-chip-danger"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>

              <div className="cwb-grid-fields">
                <div className="cwb-col-6">
                  <label className="cwb-label">Scholarship / Tier Name</label>
                  <input
                    type="text"
                    value={sc.name || sc.bracket || ''}
                    onChange={(e) => handleChange(idx, 'name', e.target.value)}
                    placeholder="e.g. State Ranker Scholarship"
                    className="cwb-input"
                  />
                </div>

                <div className="cwb-col-6">
                  <label className="cwb-label">Fee Concession Benefit</label>
                  <input
                    type="text"
                    value={sc.benefit || sc.scholarship || ''}
                    onChange={(e) => handleChange(idx, 'benefit', e.target.value)}
                    placeholder="e.g. 100% Full Tuition Waiver for 2 Years"
                    className="cwb-input"
                  />
                </div>

                <div className="cwb-col-12">
                  <label className="cwb-label">Qualifying Eligibility Criteria</label>
                  <input
                    type="text"
                    value={sc.criteria || ''}
                    onChange={(e) => handleChange(idx, 'criteria', e.target.value)}
                    placeholder="e.g. Top 50 Ranks in AITSE or 98%+ in 10th Board Exams"
                    className="cwb-input"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={handleAdd} className="cwb-btn-dashed">
            + Add Another Scholarship Tier
          </button>
        </div>
      )}
    </div>
  );
}

// 6. Visual FAQs Editor
function FaqsVisualEditor({ value, onChange }) {
  const [items, setItems] = useState(() => safeParseArray(value, DEFAULT_FAQS));
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (value) {
      const parsed = safeParseArray(value, null);
      if (parsed) setItems(parsed);
    }
  }, [value]);

  const updateItems = (newItems) => {
    setItems(newItems);
    onChange(JSON.stringify(newItems));
  };

  const handleChange = (index, field, val) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: val };
    updateItems(copy);
  };

  const handleAdd = () => {
    const newItem = {
      question: 'New Question: What support is provided for board vs competitive exams?',
      answer: 'Explain clearly how the college supports student success with balanced scheduling.'
    };
    updateItems([...items, newItem]);
  };

  const handleDelete = (index) => {
    const filtered = items.filter((_, idx) => idx !== index);
    updateItems(filtered);
  };

  const handleMove = (index, dir) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    updateItems(copy);
  };

  const handleReset = () => {
    if (confirm('Reset to the standard college FAQs?')) {
      updateItems(DEFAULT_FAQS);
    }
  };

  return (
    <div className="cwb-structured-box">
      <div className="cwb-structured-top">
        <div className="cwb-structured-title-group">
          <div className="cwb-structured-title">
            <span>❓ Frequently Asked Questions (FAQ Accordion, {items.length} Q&As)</span>
            <span className="cwb-item-pill">Section 14</span>
          </div>
          <p className="cwb-structured-desc">
            Natural visual editor: answer common parent questions directly on your public website contact desk.
          </p>
        </div>
        <div className="cwb-structured-toolbar">
          <button type="button" onClick={handleReset} className="cwb-btn-chip">
            ↺ Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className={`cwb-btn-chip ${showRaw ? 'cwb-btn-chip-primary' : ''}`}
          >
            {showRaw ? '✓ Visual Cards' : '⚡ Advanced JSON'}
          </button>
          <button type="button" onClick={handleAdd} className="cwb-btn-chip cwb-btn-chip-primary">
            + Add Question
          </button>
        </div>
      </div>

      {showRaw ? (
        <div>
          <textarea
            rows={6}
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) setItems(parsed);
              } catch (_) {}
            }}
            className="cwb-textarea"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}
          />
        </div>
      ) : (
        <div className="cwb-vcard-stack">
          {items.map((faq, idx) => (
            <div key={idx} className="cwb-vcard">
              <div className="cwb-vcard-header">
                <span className="cwb-vcard-pill">
                  Q#{idx + 1}
                </span>
                <div className="cwb-vcard-actions">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="cwb-btn-chip"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="cwb-btn-chip"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="cwb-btn-chip cwb-btn-chip-danger"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>

              <div className="cwb-grid-fields">
                <div className="cwb-col-12">
                  <label className="cwb-label">Question (Heading)</label>
                  <input
                    type="text"
                    value={faq.question || ''}
                    onChange={(e) => handleChange(idx, 'question', e.target.value)}
                    placeholder="e.g. What is the admission procedure for intermediate MPC & BiPC courses?"
                    className="cwb-input"
                  />
                </div>

                <div className="cwb-col-12">
                  <label className="cwb-label">Answer (Detailed Explanation / Sub-heading)</label>
                  <textarea
                    rows={3}
                    value={faq.answer || ''}
                    onChange={(e) => handleChange(idx, 'answer', e.target.value)}
                    placeholder="Provide a reassuring, comprehensive explanation for parents and students..."
                    className="cwb-textarea"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={handleAdd} className="cwb-btn-dashed">
            + Add Another Question
          </button>
        </div>
      )}
    </div>
  );
}

export default function CollegeWebsiteBuilder() {
  const { user, hasModuleAccess } = useAuth();
  const [website, setWebsite] = useState(null);
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Core Form state for Website record
  const [form, setForm] = useState({});

  // Sub-items states
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [openExams, setOpenExams] = useState([]);

  // Modals for creating/editing sub-items
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState(null); // 'courses' | 'faculty' | 'facilities' | 'achievements' | 'testimonials' | 'gallery' | 'jobs'
  const [modalForm, setModalForm] = useState({});

  // Live preview device view
  const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop | tablet | mobile

  // Super Admin switchboard state
  const [allInstitutes, setAllInstitutes] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentInstituteId, setCurrentInstituteId] = useState(null);

  // CBT Enquiries & Payments State
  const [enquiryFilter, setEnquiryFilter] = useState('ALL'); // 'ALL' | 'CBT' | 'PENDING'
  const [processingEnquiryId, setProcessingEnquiryId] = useState(null);

  useEffect(() => {
    fetchWebsite();
  }, []);

  async function fetchWebsite(forcedId) {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const params = new URLSearchParams(hashQuery || window.location.search);
      const targetId = forcedId || params.get('instituteId') || currentInstituteId;

      const url = targetId
        ? `/api/college-cms/website?instituteId=${encodeURIComponent(targetId)}`
        : '/api/college-cms/website';

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(targetId ? { 'x-institute-id': targetId } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load college website configuration');

      setWebsite(data.website);
      setInstitute(data.institute);
      setForm(data.website);
      setCourses(data.website.courses || []);
      setFaculty(data.website.faculties || []);
      setFacilities(data.website.facilities || []);
      setAchievements(data.website.achievements || []);
      setTestimonials(data.website.testimonials || []);
      setGallery(data.website.galleryItems || []);
      setEnquiries(data.website.enquiries || []);
      setJobs(data.website.jobPostings || []);

      if (data.allInstitutes) setAllInstitutes(data.allInstitutes);
      if (data.isSuperAdmin) setIsSuperAdmin(true);
      if (data.institute?.id) setCurrentInstituteId(data.institute.id);

      // Fetch exams & applications
      fetchExams(token, targetId || data.institute?.id);
      fetchApplications(token, targetId || data.institute?.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExams(token, instId) {
    try {
      const targetId = instId || currentInstituteId;
      const url = targetId ? `/api/college-cms/exams?instituteId=${encodeURIComponent(targetId)}` : '/api/college-cms/exams';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          ...(targetId ? { 'x-institute-id': targetId } : {}),
        },
      });
      const data = await res.json();
      if (res.ok) setOpenExams(data.exams || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchApplications(token, instId) {
    try {
      const targetId = instId || currentInstituteId;
      const url = targetId ? `/api/college-cms/applications?instituteId=${encodeURIComponent(targetId)}` : '/api/college-cms/applications';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          ...(targetId ? { 'x-institute-id': targetId } : {}),
        },
      });
      const data = await res.json();
      if (res.ok) setApplications(data.applications || []);
    } catch (e) {
      console.error(e);
    }
  }

  // Save full website record
  async function handleSaveWebsiteSettings(e) {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const token = getAuthToken();
      const targetId = currentInstituteId || institute?.id;
      const res = await fetch('/api/college-cms/website', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(targetId ? { 'x-institute-id': targetId } : {}),
        },
        body: JSON.stringify({ ...form, ...(targetId ? { instituteId: targetId } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');
      setWebsite(data.website);
      setForm(data.website);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle(publish) {
    setSaving(true);
    try {
      const token = getAuthToken();
      const endpoint = publish ? '/api/college-cms/publish' : '/api/college-cms/unpublish';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change publish status');
      setWebsite(data.website);
      setForm(data.website);
      alert(data.message);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Upload helper
  async function handleFileUpload(file, targetField) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/college-cms/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data.url;
    } catch (err) {
      alert(err.message);
      return null;
    }
  }

  // Sub-items management (Courses, Faculty, Facilities, etc.)
  async function handleSaveSubItem() {
    try {
      const token = getAuthToken();
      const isEdit = Boolean(editingItem?.id);
      const endpoint = `/api/college-cms/${modalType}${isEdit ? `/${editingItem.id}` : ''}`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(modalForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      // Refresh data
      fetchWebsite();
      setEditingItem(null);
      setModalType(null);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteSubItem(type, id) {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/college-cms/${type}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete item');
      fetchWebsite();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggleExamVisible(examId, currentVal) {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/college-cms/exams/${examId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublicWebsiteVisible: !currentVal }),
      });
      if (!res.ok) throw new Error('Failed to update exam visibility');
      fetchExams(token);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleUpdateEnquiryStatus(enquiryId, status) {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/college-cms/enquiries/${enquiryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update lead status');
      fetchWebsite();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleApproveCbt(enquiryId) {
    setProcessingEnquiryId(enquiryId);
    try {
      const token = getAuthToken();
      const targetId = currentInstituteId || institute?.id;
      const res = await fetch(`/api/college-cms/enquiries/${enquiryId}/approve-cbt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(targetId ? { 'x-institute-id': targetId } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve registration');
      setEnquiries((prev) =>
        prev.map((item) => (item.id === enquiryId ? data.enquiry : item))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingEnquiryId(null);
    }
  }

  async function handleRejectCbt(enquiryId) {
    if (!window.confirm('Are you sure you want to reject this CBT registration?')) return;
    setProcessingEnquiryId(enquiryId);
    try {
      const token = getAuthToken();
      const targetId = currentInstituteId || institute?.id;
      const res = await fetch(`/api/college-cms/enquiries/${enquiryId}/reject-cbt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(targetId ? { 'x-institute-id': targetId } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject registration');
      setEnquiries((prev) =>
        prev.map((item) => (item.id === enquiryId ? { ...item, paymentStatus: 'REJECTED', status: 'CLOSED' } : item))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingEnquiryId(null);
    }
  }

  async function handleSendWhatsAppCredentials(enq) {
    const cleanPhone = (enq.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const collegeName = website?.displayName || institute?.name || 'College';
    const cbtUrl = fullLiveUrl;

    const message = `🎓 *${collegeName} - Online CBT Mock Exam Hall Ticket* 🎓\n\nDear *${enq.studentName}*,\nYour registration and payment for *${enq.cbtExamName || enq.courseOfInterest || 'CBT Mock Examination'}* have been verified successfully!\n\n📝 *Your Official Exam Credentials*:\n• *Roll Number / ID*: ${enq.candidateRollNumber || 'Generated'}\n• *Exam Passcode*: ${enq.candidatePassword || 'Generated'}\n• *Exam Portal Link*: ${cbtUrl}\n\n⏰ *Important Instructions*:\n1. Log in 15 minutes before the scheduled exam start time.\n2. Ensure stable internet connection during your test.\n3. Keep your roll number and passcode safe.\n\nBest of luck!\n- *${collegeName} Admissions Desk*`;

    const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    try {
      const token = getAuthToken();
      const targetId = currentInstituteId || institute?.id;
      await fetch(`/api/college-cms/enquiries/${enq.id}/log-whatsapp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(targetId ? { 'x-institute-id': targetId } : {}),
        },
      });
      setEnquiries((prev) =>
        prev.map((item) => (item.id === enq.id ? { ...item, whatsappSentAt: new Date().toISOString() } : item))
      );
    } catch (e) {
      console.warn('Could not log WhatsApp dispatch:', e);
    }
  }

  function handleCopyLink(url) {
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  }

  if (loading) {
    return (
      <div className="cwb-studio">
        <div className="cwb-workspace" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ width: 44, height: 44, border: '4px solid #1e3a8a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'cwbPulse 1s infinite linear', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>Loading College Website Studio...</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Retrieving your institutional branding, sections, and academic catalogue</p>
        </div>
      </div>
    );
  }

  const isSubscriptionLocked =
    (user?.role === 'INSTITUTE' && !hasModuleAccess('COLLEGE_WEBSITE')) ||
    (error && (error.includes('MODULE_SUBSCRIPTION_REQUIRED') || error.includes('not active for your institution')));

  if (isSubscriptionLocked) {
    return (
      <div style={{ maxWidth: 760, margin: '40px auto', padding: '0 16px' }}>
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', padding: '32px', color: '#ffffff' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              <span>🌐</span> OPTIONAL ADD-ON MODULE
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#ffffff' }}>
              Dynamic College Website & Portal
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#bfdbfe', maxWidth: 620, lineHeight: 1.5 }}>
              Launch your official, fully branded institutional website with course catalogs, faculty recruitment, student admission enquiry capture, and online exam listings.
            </p>
          </div>

          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '20px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Module Subscription
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
                  ₹1,499 <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>/ month</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 700 }}>
                  OR ALL 4 MODULES IN BUNDLE
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  ₹4,499 / mo <span style={{ color: '#16a34a', fontSize: 12 }}>(Save ₹497)</span>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12, textTransform: 'uppercase' }}>
              Included Features:
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 28 }}>
              <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#475569' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                <span>White-label public website at your college domain/slug</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#475569' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                <span>Course offerings, fee structure & syllabus details</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#475569' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                <span>Faculty careers & recruitment resume upload management</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#475569' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                <span>Direct student lead and parent enquiry capture CRM</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                to="/subscriptions"
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                View Plans & Activate Module →
              </Link>
              <Link
                to="/recharge"
                style={{
                  padding: '12px 20px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                Recharge via UPI / NEFT
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !website) {
    const isSessionExpired = error && (error.toLowerCase().includes('session') || error.toLowerCase().includes('logged in') || error.toLowerCase().includes('token'));
    const isInstituteError = error && error.includes('Only institute accounts');

    return (
      <div className="cwb-studio">
        <div className="cwb-workspace" style={{ maxWidth: 540, margin: '40px auto', textAlign: 'center', padding: '40px 30px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>{isSessionExpired ? '🔐' : '⚠️'}</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {isSessionExpired ? 'Authentication Required' : 'Website Studio Access'}
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '8px 0 24px 0', lineHeight: 1.5 }}>
            {isInstituteError
              ? 'You are currently logged in with a Super Admin account. Select a college from the Super Admin Console or log in with the college admin credentials.'
              : error || 'College website configuration not found.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/admin/websites" className="cwb-btn cwb-btn-primary">
              🏛️ Open Super Admin Websites Console →
            </Link>
            <button onClick={() => fetchWebsite()} className="cwb-btn cwb-btn-secondary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const publicUrl = `/#/colleges/${website.slug}`;
  const fullLiveUrl = `${window.location.origin}/#/colleges/${website.slug}`;

  // Categorized Navigation Suite: 5 Logical Pillars
  const NAV_CATEGORIES = [
    {
      title: '01 • Hub & Operations',
      items: [
        { id: 'overview', label: 'Dashboard & Health', icon: '📊' },
        { id: 'enquiries', label: 'Admissions Inbox', icon: '📥', count: enquiries.length },
        { id: 'publish', label: 'Publish & Status', icon: '🚀' },
      ],
    },
    {
      title: '02 • Brand & Identity',
      items: [
        { id: 'profile', label: 'College Profile', icon: '🏛' },
        { id: 'theme', label: 'Branding & Theme', icon: '🎨' },
        { id: 'seo', label: 'SEO & Social Share', icon: '🔍' },
      ],
    },
    {
      title: '03 • Homepage Content',
      items: [
        { id: 'hero', label: 'Hero Showcase', icon: '⚡' },
        { id: 'director', label: 'Director Message', icon: '👨‍💼' },
        { id: 'about', label: 'About & Vision', icon: '📖' },
        { id: 'facilities', label: 'Campus Facilities', icon: '🏢', count: facilities.length },
        { id: 'gallery', label: 'Photo Gallery', icon: '🖼', count: gallery.length },
      ],
    },
    {
      title: '04 • Academics & People',
      items: [
        { id: 'courses', label: 'Courses Offered', icon: '🎓', count: courses.length },
        { id: 'faculty', label: 'Faculty Directory', icon: '👨‍🏫', count: faculty.length },
        { id: 'achievements', label: 'Student Achievements', icon: '🏆', count: achievements.length },
        { id: 'testimonials', label: 'Testimonials', icon: '💬', count: testimonials.length },
      ],
    },
    {
      title: '05 • Portals & Outreach',
      items: [
        { id: 'admissions', label: 'Admissions & Dates', icon: '📜' },
        { id: 'exams', label: 'Open CBT Exams', icon: '📝', count: openExams.filter((e) => e.isPublicWebsiteVisible).length },
        { id: 'careers', label: 'Faculty Careers', icon: '💼', count: jobs.length },
        { id: 'preview', label: 'Interactive Preview', icon: '📱' },
      ],
    },
  ];

  return (
    <div className="cwb-studio">
      {/* ==================== 1. EXECUTIVE HEADER COMMAND BAR ==================== */}
      <div className="cwb-header">
        <div className="cwb-identity-block">
          <div className="cwb-emblem-avatar">
            {website.displayName ? website.displayName.charAt(0).toUpperCase() : '🏛'}
          </div>
          <div>
            <div className="cwb-title-row">
              <h1 className="cwb-college-title">
                {website.displayName || institute?.name}
              </h1>
              {website.isPublished ? (
                <span className="cwb-badge-live">
                  LIVE (v{website.publishedVersion})
                </span>
              ) : (
                <span className="cwb-badge-draft">
                  DRAFT MODE
                </span>
              )}
            </div>
            <div className="cwb-meta-row">
              <span>Public Portal:</span>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="cwb-meta-link">
                questionstudio.in/colleges/{website.slug}
              </a>
            </div>
          </div>
        </div>

        <div className="cwb-header-actions">
          {isSuperAdmin && allInstitutes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>🛡️ Super Admin:</span>
              <select
                value={institute?.id || currentInstituteId || ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  setCurrentInstituteId(newId);
                  window.location.hash = `#/website-builder?instituteId=${newId}`;
                  fetchWebsite(newId);
                }}
                style={{ fontSize: 12, fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', color: '#0f172a' }}
              >
                {allInstitutes.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleCopyLink(fullLiveUrl)}
            className="cwb-btn cwb-btn-secondary"
            title="Copy portal URL"
          >
            <span>{copySuccess ? '✓' : '📋'}</span>
            <span>{copySuccess ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="cwb-btn cwb-btn-secondary"
          >
            <span>↗</span>
            <span>Visit Live</span>
          </a>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`cwb-btn ${activeTab === 'preview' ? 'cwb-btn-primary' : 'cwb-btn-purple'}`}
          >
            <span>📱</span>
            <span>Interactive Preview</span>
          </button>

          {website.isPublished ? (
            <button
              type="button"
              onClick={() => handlePublishToggle(false)}
              disabled={saving}
              className="cwb-btn cwb-btn-danger"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePublishToggle(true)}
              disabled={saving}
              className="cwb-btn cwb-btn-emerald"
            >
              <span>🚀</span>
              <span>Publish Live</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================== 2. MASTER STUDIO GRID ==================== */}
      <div className="cwb-studio-grid">
        {/* Left Categorized Navigation Sidebar */}
        <aside className="cwb-sidebar">
          {NAV_CATEGORIES.map((cat, idx) => (
            <div key={idx} className="cwb-nav-category">
              <div className="cwb-category-label">{cat.title}</div>
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`cwb-nav-item ${activeTab === item.id ? 'active' : ''}`}
                >
                  <div className="cwb-nav-item-left">
                    <span className="cwb-nav-icon">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="cwb-nav-count">{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Right Content Workspace */}
        <main className="cwb-workspace">
          {saveSuccess && (
            <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#065f46', fontSize: 13, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✓</span>
              <span>Website changes saved successfully to draft!</span>
            </div>
          )}

          {/* ==================== TAB 1: OVERVIEW & HEALTH ==================== */}
          {activeTab === 'overview' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Website Overview & Institutional Health</h2>
                  <p className="cwb-section-desc">Live performance metrics, modular subscription status, and homepage section controls.</p>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="cwb-stat-grid">
                <div className="cwb-stat-card blue">
                  <span className="cwb-stat-label">Admission Leads</span>
                  <span className="cwb-stat-val">{enquiries.length}</span>
                  <span className="cwb-stat-sub">Prospective student inquiries</span>
                </div>

                <div className="cwb-stat-card emerald">
                  <span className="cwb-stat-label">Courses Published</span>
                  <span className="cwb-stat-val">{courses.length}</span>
                  <span className="cwb-stat-sub">Competitive academic streams</span>
                </div>

                <div className="cwb-stat-card purple">
                  <span className="cwb-stat-label">Faculty Directory</span>
                  <span className="cwb-stat-val">{faculty.length}</span>
                  <span className="cwb-stat-sub">Academic mentors & HODs</span>
                </div>

                <div className="cwb-stat-card amber">
                  <span className="cwb-stat-label">Open CBT Exams</span>
                  <span className="cwb-stat-val">
                    {openExams.filter((e) => e.isPublicWebsiteVisible).length}
                  </span>
                  <span className="cwb-stat-sub">Tests open for public practice</span>
                </div>
              </div>

              {/* Quick Share Banner */}
              <div className="cwb-share-box">
                <h3 className="cwb-share-title">Quick Share & Digital Outreach</h3>
                <p className="cwb-share-desc">
                  Share your public portal link on WhatsApp admission groups, hoardings, print prospectus, and SMS notifications:
                </p>
                <div className="cwb-share-input-row">
                  <input
                    type="text"
                    readOnly
                    value={fullLiveUrl}
                    className="cwb-share-input"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink(fullLiveUrl)}
                    className="cwb-btn cwb-btn-primary"
                  >
                    <span>{copySuccess ? '✓ Copied' : 'Copy Public URL'}</span>
                  </button>
                </div>
              </div>

              {/* Modular SaaS Facilities & Subscriptions */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 24, background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', margin: 0 }}>
                    Modular SaaS Facilities & Subscriptions
                  </h3>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>QuestionsStudio Multi-Tenant Engine</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px 0' }}>
                  Colleges can independently purchase modules. Inactive modules are gracefully hidden from the public portal without broken layouts.
                </p>

                <div className="cwb-form-grid-2">
                  <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>📄 Question Paper Generation</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Centralized question bank & auto blueprint generator</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 9999, background: '#ecfdf5', color: '#065f46' }}>INCLUDED</span>
                  </div>

                  <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>🌐 Public College Website</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>17-section longform institutional homepage</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 9999, background: '#ecfdf5', color: '#065f46' }}>ACTIVE</span>
                  </div>

                  <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>💻 Online Examination System (CBT)</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Public mock test discovery & timed CBT test engine</div>
                    </div>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={form.hasOnlineExamModule ?? true}
                        onChange={(e) => setForm({ ...form, hasOnlineExamModule: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                      />
                    </label>
                  </div>

                  <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>💼 Faculty Recruitment Portal</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Job vacancy management & resume applications</div>
                    </div>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={form.hasRecruitmentModule ?? true}
                        onChange={(e) => setForm({ ...form, hasRecruitmentModule: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                      />
                    </label>
                  </div>

                  <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>📥 Student Leads & Admissions CRM</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Online lead capture & WhatsApp counseling links</div>
                    </div>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={form.hasCrmModule ?? true}
                        onChange={(e) => setForm({ ...form, hasCrmModule: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                      />
                    </label>
                  </div>

                  <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>📢 College Advertising & Promotion</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Sponsored examination placement on portal</div>
                    </div>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={form.hasAdvertisingModule ?? false}
                        onChange={(e) => setForm({ ...form, hasAdvertisingModule: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 17-Section Homepage Visibility Toggles */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', margin: 0 }}>
                      17-Section Homepage Visibility Toggles
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                      Selectively show or hide sections from your public college website homepage without losing any configured content.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveWebsiteSettings}
                    disabled={saving}
                    className="cwb-btn cwb-btn-primary"
                  >
                    {saving ? 'Saving...' : 'Save Toggles'}
                  </button>
                </div>

                <div className="cwb-toggles-grid">
                  {[
                    { key: 'showStatsSection', label: '3. Stats & Counters' },
                    { key: 'showAboutSection', label: '4. About Us & Heritage' },
                    { key: 'showDirectorSection', label: '5. Director Message' },
                    { key: 'showWhyUsSection', label: '6. Why Choose Our College' },
                    { key: 'showCoursesSection', label: '7. Courses Offered' },
                    { key: 'showFacultySection', label: '8. Faculty Showcase' },
                    { key: 'showMethodologySection', label: '9. Teaching Methodology' },
                    { key: 'showFacilitiesSection', label: '10. Campus Facilities' },
                    { key: 'showResultsSection', label: '11. Student Hall of Fame' },
                    { key: 'showAdmissionsSection', label: '12. Admissions & Scholarships' },
                    { key: 'showOpenExamsSection', label: '13. Open CBT Exams' },
                    { key: 'showCareersSection', label: '14. Faculty Careers' },
                    { key: 'showGallerySection', label: '15. Photo Gallery' },
                    { key: 'showTestimonialsSection', label: '16. Testimonials' },
                    { key: 'showFaqSection', label: '17. FAQs Accordion' },
                    { key: 'showContactFormSection', label: '18. Admission Enquiry Form' },
                  ].map((sec) => {
                    const isChecked = form[sec.key] ?? true;
                    return (
                      <label key={sec.key} className={`cwb-toggle-card ${isChecked ? 'active' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setForm({ ...form, [sec.key]: e.target.checked })}
                          className="cwb-toggle-checkbox"
                        />
                        <span className="cwb-toggle-label">{sec.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: COLLEGE PROFILE ==================== */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveWebsiteSettings}>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">College Profile & Institutional Identity</h2>
                  <p className="cwb-section-desc">Manage primary college name, accreditations, contact helpline numbers, and location map.</p>
                </div>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>

              <div className="cwb-form-grid-2">
                <div className="cwb-form-group">
                  <label className="cwb-label">Display College Name *</label>
                  <input
                    type="text"
                    value={form.displayName || ''}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    className="cwb-input"
                    placeholder="e.g. Andhra Inspire Academy of Science & Technology"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">Motto / Tagline</label>
                  <input
                    type="text"
                    value={form.mottoTagline || ''}
                    onChange={(e) => setForm({ ...form, mottoTagline: e.target.value })}
                    className="cwb-input"
                    placeholder="e.g. Nurturing Scholarly Excellence & Ethical Character"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">Establishment Year</label>
                  <input
                    type="number"
                    value={form.estYear || ''}
                    onChange={(e) => setForm({ ...form, estYear: e.target.value })}
                    className="cwb-input"
                    placeholder="e.g. 2008"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">Accreditation & Affiliations</label>
                  <input
                    type="text"
                    placeholder="e.g. Board of Intermediate Education AP (BIEAP) & CBSE"
                    value={form.accreditation || ''}
                    onChange={(e) => setForm({ ...form, accreditation: e.target.value })}
                    className="cwb-input"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">Official Telephone *</label>
                  <input
                    type="tel"
                    value={form.contactPhone || ''}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="cwb-input"
                    placeholder="+91 866 245 8899"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">Official Admissions Email *</label>
                  <input
                    type="email"
                    value={form.contactEmail || ''}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className="cwb-input"
                    placeholder="admissions@inspireacademy.edu.in"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">WhatsApp Helpline Number (10 digits)</label>
                  <input
                    type="tel"
                    placeholder="9848012345 (used for student instant chat)"
                    value={form.whatsappNumber || ''}
                    onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                    className="cwb-input"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">Google Maps Embed URL</label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={form.googleMapEmbedUrl || ''}
                    onChange={(e) => setForm({ ...form, googleMapEmbedUrl: e.target.value })}
                    className="cwb-input"
                  />
                </div>
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Campus Physical Address</label>
                <textarea
                  rows={2}
                  value={form.campusAddress || ''}
                  onChange={(e) => setForm({ ...form, campusAddress: e.target.value })}
                  className="cwb-textarea"
                  placeholder="Plot 14-B, Academic Enclave, Near Benz Circle, Vijayawada, AP - 520010"
                />
              </div>

              <div className="cwb-save-bar">
                <span className="cwb-hint">Remember to publish to live when you are ready to update the public portal.</span>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== TAB 3: BRANDING & THEME ==================== */}
          {activeTab === 'theme' && (
            <form onSubmit={handleSaveWebsiteSettings}>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Branding, Colors & Institutional Palettes</h2>
                  <p className="cwb-section-desc">Customize primary and accent colors to match your college crest and identity guidelines.</p>
                </div>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Theme Colors'}
                </button>
              </div>

              <div className="cwb-form-grid-3">
                <div className="cwb-form-group">
                  <label className="cwb-label">Primary Brand Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={form.primaryColor || '#0b1a30'}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      style={{ width: 42, height: 42, borderRadius: 10, cursor: 'pointer', border: '1px solid #cbd5e1' }}
                    />
                    <input
                      type="text"
                      value={form.primaryColor || '#0b1a30'}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                </div>

                <div className="cwb-form-group">
                  <label className="cwb-label">Secondary Tone Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={form.secondaryColor || '#0f766e'}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      style={{ width: 42, height: 42, borderRadius: 10, cursor: 'pointer', border: '1px solid #cbd5e1' }}
                    />
                    <input
                      type="text"
                      value={form.secondaryColor || '#0f766e'}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                </div>

                <div className="cwb-form-group">
                  <label className="cwb-label">Accent Highlight Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={form.accentColor || '#b45309'}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      style={{ width: 42, height: 42, borderRadius: 10, cursor: 'pointer', border: '1px solid #cbd5e1' }}
                    />
                    <input
                      type="text"
                      value={form.accentColor || '#b45309'}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                </div>
              </div>

              {/* Curated Theme Presets */}
              <div style={{ marginTop: 24 }}>
                <label className="cwb-label" style={{ marginBottom: 10 }}>Recommended Curated Academic Palettes</label>
                <div className="cwb-form-grid-3">
                  {[
                    { name: 'Heritage Navy & Bronze', p: '#0b1a30', s: '#0f766e', a: '#b45309' },
                    { name: 'Oxford Royal Blue', p: '#1e3a8a', s: '#0369a1', a: '#f59e0b' },
                    { name: 'Imperial Crimson', p: '#831843', s: '#9f1239', a: '#ea580c' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        primaryColor: preset.p,
                        secondaryColor: preset.s,
                        accentColor: preset.a,
                      })}
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{preset.name}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: preset.p }} />
                        <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: preset.s }} />
                        <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: preset.a }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cwb-save-bar">
                <span className="cwb-hint">Color changes take effect immediately across hero, buttons, and badges.</span>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Theme Colors'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== TAB 4: HERO BANNER ==================== */}
          {activeTab === 'hero' && (
            <form onSubmit={handleSaveWebsiteSettings}>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Homepage Hero Section Management</h2>
                  <p className="cwb-section-desc">Design your primary institutional showcase, top announcement banner, and campus photography.</p>
                </div>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Hero Section'}
                </button>
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">🔥 Top Announcement Ticker (Urgent Header Banner)</label>
                <input
                  type="text"
                  value={form.promotionalBannerText || ''}
                  onChange={(e) => setForm({ ...form, promotionalBannerText: e.target.value })}
                  placeholder="e.g. 🔥 Admissions Open for Academic Year 2026-27 | Scholarship Test this Sunday | Call: +91 98480 12345"
                  className="cwb-input"
                />
                <p className="cwb-hint">Leave blank if you prefer not to display an urgent header marquee.</p>
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Hero Main Headline *</label>
                <input
                  type="text"
                  value={form.heroTitle || ''}
                  onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
                  placeholder="e.g. Empowering Future Doctors & Engineers with Academic Rigor"
                  className="cwb-input"
                />
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Hero Subtitle & Vision Summary</label>
                <textarea
                  rows={3}
                  value={form.heroSubtitle || ''}
                  onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
                  className="cwb-textarea"
                  placeholder="Comprehensive coaching for NEET, JEE Main & Advanced alongside accredited intermediate education."
                />
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Campus Hero Photography Banner</label>
                <div className="cwb-upload-box">
                  {form.heroBannerUrl ? (
                    <img src={form.heroBannerUrl} alt="Hero Preview" className="cwb-upload-preview" style={{ width: 120, height: 80 }} />
                  ) : (
                    <div className="cwb-upload-preview" style={{ width: 120, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#94a3b8' }}>
                      🏛
                    </div>
                  )}
                  <div className="cwb-upload-meta">
                    <label className="cwb-upload-btn-label">
                      <span>📸</span>
                      <span>Upload Campus Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const url = await handleFileUpload(file, 'heroBannerUrl');
                            if (url) setForm({ ...form, heroBannerUrl: url });
                          }
                        }}
                      />
                    </label>
                    <p className="cwb-hint">Recommended resolution: 1920x1080px or higher for crisp desktop display.</p>
                  </div>
                </div>
              </div>

              <div className="cwb-save-bar">
                <span className="cwb-hint">Changes to hero headline and imagery will update Section 1 of the public site.</span>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Hero Section'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== TAB 5: DIRECTOR PROFILE ==================== */}
          {activeTab === 'director' && (
            <form onSubmit={handleSaveWebsiteSettings}>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Director & Leadership Profile</h2>
                  <p className="cwb-section-desc">Showcase the visionary educator leading your institution with their credentials, photo, and student address.</p>
                </div>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Director Profile'}
                </button>
              </div>

              <div className="cwb-form-grid-2">
                <div className="cwb-form-group">
                  <label className="cwb-label">Director / Principal Name *</label>
                  <input
                    type="text"
                    value={form.directorName || ''}
                    onChange={(e) => setForm({ ...form, directorName: e.target.value })}
                    className="cwb-input"
                    placeholder="e.g. Dr. K. V. Ramanjaneyulu"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">Designation / Title</label>
                  <input
                    type="text"
                    value={form.directorTitle || 'Founder & Academic Director'}
                    onChange={(e) => setForm({ ...form, directorTitle: e.target.value })}
                    className="cwb-input"
                  />
                </div>
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Qualifications & Experience Credentials</label>
                <input
                  type="text"
                  placeholder="e.g. M.Sc. Physics (IIT Madras), Ph.D., 25+ Years Mentoring Toppers"
                  value={form.directorQualifications || ''}
                  onChange={(e) => setForm({ ...form, directorQualifications: e.target.value })}
                  className="cwb-input"
                />
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Director's Message to Students & Parents</label>
                <textarea
                  rows={5}
                  value={form.directorMessage || ''}
                  onChange={(e) => setForm({ ...form, directorMessage: e.target.value })}
                  className="cwb-textarea"
                  placeholder="Welcome to our institution. Our goal is to build genuine intellectual clarity and discipline..."
                />
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Director Photograph</label>
                <div className="cwb-upload-box">
                  {form.directorPhotoUrl ? (
                    <img src={form.directorPhotoUrl} alt="Director" className="cwb-upload-preview" />
                  ) : (
                    <div className="cwb-upload-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#94a3b8' }}>
                      👨‍💼
                    </div>
                  )}
                  <div className="cwb-upload-meta">
                    <label className="cwb-upload-btn-label">
                      <span>📷</span>
                      <span>Upload Portrait Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const url = await handleFileUpload(file, 'directorPhotoUrl');
                            if (url) setForm({ ...form, directorPhotoUrl: url });
                          }
                        }}
                      />
                    </label>
                    <p className="cwb-hint">Professional formal photograph with natural lighting recommended.</p>
                  </div>
                </div>
              </div>

              <div className="cwb-save-bar">
                <span className="cwb-hint">Renders with high editorial elegance on Section 5 of your homepage.</span>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Director Profile'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== TAB 6: ABOUT COLLEGE & VISION ==================== */}
          {activeTab === 'about' && (
            <form onSubmit={handleSaveWebsiteSettings}>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">About College, Vision & Mission</h2>
                  <p className="cwb-section-desc">Institutional background, scholarly heritage, educational philosophy, and core objectives.</p>
                </div>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save About Details'}
                </button>
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">About Section Headline</label>
                <input
                  type="text"
                  value={form.aboutTitle || ''}
                  onChange={(e) => setForm({ ...form, aboutTitle: e.target.value })}
                  className="cwb-input"
                  placeholder="e.g. A Legacy of Uncompromising Academic Excellence"
                />
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">About College Narrative</label>
                <textarea
                  rows={4}
                  value={form.aboutText || ''}
                  onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
                  className="cwb-textarea"
                />
              </div>

              <div className="cwb-form-grid-2">
                <div className="cwb-form-group">
                  <label className="cwb-label">Vision Statement</label>
                  <textarea
                    rows={3}
                    value={form.visionText || ''}
                    onChange={(e) => setForm({ ...form, visionText: e.target.value })}
                    className="cwb-textarea"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">Mission Statement</label>
                  <textarea
                    rows={3}
                    value={form.missionText || ''}
                    onChange={(e) => setForm({ ...form, missionText: e.target.value })}
                    className="cwb-textarea"
                  />
                </div>
              </div>

              {/* Section 03: Key Stats & Metric Counters */}
              <StatsCountersVisualEditor
                value={form.statsCountersJson}
                onChange={(json) => setForm({ ...form, statsCountersJson: json })}
              />

              {/* Section 06: Why Choose Us (Advantages) */}
              <WhyChooseUsVisualEditor
                value={form.whyChooseUsJson}
                onChange={(json) => setForm({ ...form, whyChooseUsJson: json })}
              />

              {/* Section 09: Teaching Methodology Framework */}
              <MethodologyStepsVisualEditor
                value={form.methodologyStepsJson}
                onChange={(json) => setForm({ ...form, methodologyStepsJson: json })}
              />

              <div className="cwb-save-bar">
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save About Details'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== TAB 7: COURSES OFFERED ==================== */}
          {activeTab === 'courses' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Academic Courses & Competitive Programs ({courses.length})</h2>
                  <p className="cwb-section-desc">Manage streams, eligibility, target exams (NEET / JEE / Foundation), and program durations.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('courses');
                    setModalForm({
                      courseName: '',
                      category: 'MEDICAL',
                      targetExam: 'NEET',
                      duration: '2 Academic Years',
                      eligibility: '',
                      description: '',
                    });
                  }}
                  className="cwb-btn cwb-btn-primary"
                >
                  <span>+</span>
                  <span>Add New Course</span>
                </button>
              </div>

              {courses.length === 0 ? (
                <div className="cwb-empty-state">
                  <span className="cwb-empty-icon">🎓</span>
                  <h3 className="cwb-empty-title">No Courses Added Yet</h3>
                  <p className="cwb-empty-desc">Add competitive exam streams like NEET, JEE Main & Advanced, or Intermediate programs.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setModalType('courses');
                      setModalForm({ courseName: '', category: 'MEDICAL', targetExam: 'NEET', duration: '2 Years' });
                    }}
                    className="cwb-btn cwb-btn-primary"
                  >
                    + Add Your First Course
                  </button>
                </div>
              ) : (
                <div className="cwb-items-grid">
                  {courses.map((c) => (
                    <div key={c.id} className="cwb-item-card">
                      <div>
                        <div className="cwb-item-card-top">
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                            🎓
                          </div>
                          <div>
                            <h3 className="cwb-item-card-title">{c.courseName}</h3>
                            <div className="cwb-item-card-meta">
                              <span className="cwb-item-pill" style={{ background: '#dbeafe', color: '#1e40af' }}>{c.category}</span>
                              <span className="cwb-item-pill">🎯 {c.targetExam || 'General'}</span>
                              <span className="cwb-item-pill">⏱ {c.duration || 'Flexible'}</span>
                            </div>
                          </div>
                        </div>
                        {c.eligibility && (
                          <p style={{ fontSize: 11, color: '#64748b', margin: '6px 0' }}>
                            <strong>Eligibility:</strong> {c.eligibility}
                          </p>
                        )}
                        {c.description && <p className="cwb-item-card-desc">{c.description}</p>}
                      </div>

                      <div className="cwb-item-card-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(c);
                            setModalType('courses');
                            setModalForm(c);
                          }}
                          className="cwb-btn cwb-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubItem('courses', c.id)}
                          className="cwb-btn cwb-btn-danger"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 8: FACULTY DIRECTORY ==================== */}
          {activeTab === 'faculty' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Faculty Directory & Mentors ({faculty.length})</h2>
                  <p className="cwb-section-desc">Showcase experienced professors, subject specialists, and master educators.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('faculty');
                    setModalForm({
                      name: '',
                      designation: 'Senior Faculty',
                      department: 'Physics',
                      qualification: '',
                      experienceYrs: 5,
                      bio: '',
                    });
                  }}
                  className="cwb-btn cwb-btn-primary"
                >
                  <span>+</span>
                  <span>Add Faculty Member</span>
                </button>
              </div>

              {faculty.length === 0 ? (
                <div className="cwb-empty-state">
                  <span className="cwb-empty-icon">👨‍🏫</span>
                  <h3 className="cwb-empty-title">No Faculty Members Added Yet</h3>
                  <p className="cwb-empty-desc">Highlight senior faculty, subject heads, and IIT/AIIMS alumni educators.</p>
                </div>
              ) : (
                <div className="cwb-items-grid">
                  {faculty.map((f) => (
                    <div key={f.id} className="cwb-item-card">
                      <div>
                        <div className="cwb-item-card-top">
                          {f.photoUrl ? (
                            <img src={f.photoUrl} alt={f.name} className="cwb-item-card-thumb" />
                          ) : (
                            <div className="cwb-item-card-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#94a3b8' }}>
                              👨‍🏫
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 className="cwb-item-card-title truncate">{f.name}</h3>
                            <p className="cwb-item-card-subtitle">{f.designation}</p>
                            <div className="cwb-item-card-meta">
                              <span className="cwb-item-pill" style={{ background: '#f1f5f9', color: '#1e3a8a' }}>{f.department}</span>
                              {f.experienceYrs && <span className="cwb-item-pill">{f.experienceYrs} Yrs Exp</span>}
                            </div>
                          </div>
                        </div>
                        {f.qualification && (
                          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0' }}>
                            🎓 {f.qualification}
                          </p>
                        )}
                        {f.bio && <p className="cwb-item-card-desc">{f.bio}</p>}
                      </div>

                      <div className="cwb-item-card-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(f);
                            setModalType('faculty');
                            setModalForm(f);
                          }}
                          className="cwb-btn cwb-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubItem('faculty', f.id)}
                          className="cwb-btn cwb-btn-danger"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 9: CAMPUS FACILITIES ==================== */}
          {activeTab === 'facilities' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Campus Infrastructure & Facilities ({facilities.length})</h2>
                  <p className="cwb-section-desc">Laboratories, digital libraries, air-conditioned classrooms, hostel, and sports arenas.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('facilities');
                    setModalForm({
                      title: '',
                      category: 'LAB',
                      description: '',
                    });
                  }}
                  className="cwb-btn cwb-btn-primary"
                >
                  <span>+</span>
                  <span>Add Facility</span>
                </button>
              </div>

              {facilities.length === 0 ? (
                <div className="cwb-empty-state">
                  <span className="cwb-empty-icon">🏢</span>
                  <h3 className="cwb-empty-title">No Campus Facilities Configured</h3>
                  <p className="cwb-empty-desc">Showcase modern science laboratories, computerized library, and residential amenities.</p>
                </div>
              ) : (
                <div className="cwb-items-grid">
                  {facilities.map((fc) => (
                    <div key={fc.id} className="cwb-item-card">
                      <div>
                        <div className="cwb-item-card-meta">
                          <span className="cwb-item-pill" style={{ background: '#ccfbf1', color: '#0f766e' }}>{fc.category}</span>
                        </div>
                        <h3 className="cwb-item-card-title">{fc.title}</h3>
                        <p className="cwb-item-card-desc" style={{ marginTop: 8 }}>{fc.description}</p>
                      </div>

                      <div className="cwb-item-card-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(fc);
                            setModalType('facilities');
                            setModalForm(fc);
                          }}
                          className="cwb-btn cwb-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubItem('facilities', fc.id)}
                          className="cwb-btn cwb-btn-danger"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 10: PHOTO GALLERY ==================== */}
          {activeTab === 'gallery' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Campus Photo Gallery ({gallery.length})</h2>
                  <p className="cwb-section-desc">Authentic photographs of laboratory sessions, campus life, awards, and sports events.</p>
                </div>
                <div>
                  <input
                    type="file"
                    id="gallery-file-upload"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const url = await handleFileUpload(file, 'gallery');
                        if (url) {
                          const token = getAuthToken();
                          await fetch('/api/college-cms/gallery', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              mediaUrl: url,
                              title: file.name.replace(/\.[^/.]+$/, ''),
                              category: 'CAMPUS',
                            }),
                          });
                          fetchWebsite();
                        }
                      }
                    }}
                  />
                  <label htmlFor="gallery-file-upload" className="cwb-btn cwb-btn-primary" style={{ cursor: 'pointer' }}>
                    <span>📸</span>
                    <span>Upload New Photograph</span>
                  </label>
                </div>
              </div>

              {gallery.length === 0 ? (
                <div className="cwb-empty-state">
                  <span className="cwb-empty-icon">🖼</span>
                  <h3 className="cwb-empty-title">Gallery is Empty</h3>
                  <p className="cwb-empty-desc">Upload real campus and student activity photographs to showcase institutional vitality.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                  {gallery.map((g) => (
                    <div key={g.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '1/1', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <img src={g.mediaUrl} alt={g.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => handleDeleteSubItem('gallery', g.id)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'rgba(225, 29, 72, 0.9)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 26,
                          height: 26,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                        title="Delete photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 11: ACHIEVEMENTS ==================== */}
          {activeTab === 'achievements' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Student Achievements & Hall of Fame ({achievements.length})</h2>
                  <p className="cwb-section-desc">Record verifiable national competitive ranks in NEET, JEE, and Olympiads.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('achievements');
                    setModalForm({
                      studentName: '',
                      examOrAward: 'NEET AIR 42',
                      rankOrScore: 'Score: 710/720',
                      year: 2025,
                      category: 'COMPETITIVE_EXAM',
                    });
                  }}
                  className="cwb-btn cwb-btn-primary"
                >
                  <span>+</span>
                  <span>Add Achiever</span>
                </button>
              </div>

              {achievements.length === 0 ? (
                <div className="cwb-empty-state">
                  <span className="cwb-empty-icon">🏆</span>
                  <h3 className="cwb-empty-title">No Achievers Listed Yet</h3>
                  <p className="cwb-empty-desc">Highlight genuine student accomplishments to build trust with visiting parents.</p>
                </div>
              ) : (
                <div className="cwb-items-grid">
                  {achievements.map((a) => (
                    <div key={a.id} className="cwb-item-card">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>🏅</span>
                          <span className="cwb-item-pill" style={{ background: '#fef3c7', color: '#92400e' }}>Batch {a.year}</span>
                        </div>
                        <h3 className="cwb-item-card-title">{a.studentName}</h3>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#1e40af', margin: '4px 0 2px 0' }}>{a.examOrAward}</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#b45309', margin: 0 }}>{a.rankOrScore}</p>
                      </div>

                      <div className="cwb-item-card-actions">
                        <button
                          type="button"
                          onClick={() => handleDeleteSubItem('achievements', a.id)}
                          className="cwb-btn cwb-btn-danger"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 12: TESTIMONIALS ==================== */}
          {activeTab === 'testimonials' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Student & Parent Testimonials ({testimonials.length})</h2>
                  <p className="cwb-section-desc">Authentic student reviews, parent feedback, and alumni endorsements.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('testimonials');
                    setModalForm({
                      authorName: '',
                      authorRole: 'Alumni (AIIMS New Delhi)',
                      quote: '',
                      rating: 5,
                    });
                  }}
                  className="cwb-btn cwb-btn-primary"
                >
                  <span>+</span>
                  <span>Add Testimonial</span>
                </button>
              </div>

              {testimonials.length === 0 ? (
                <div className="cwb-empty-state">
                  <span className="cwb-empty-icon">💬</span>
                  <h3 className="cwb-empty-title">No Testimonials Added</h3>
                  <p className="cwb-empty-desc">Share inspiring reviews from students and parents regarding academic guidance.</p>
                </div>
              ) : (
                <div className="cwb-items-grid">
                  {testimonials.map((t) => (
                    <div key={t.id} className="cwb-item-card">
                      <div>
                        <div style={{ color: '#f59e0b', fontSize: 14, marginBottom: 6 }}>{'★'.repeat(t.rating || 5)}</div>
                        <p style={{ fontSize: 12, color: '#334155', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                          "{t.quote}"
                        </p>
                        <h4 style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginTop: 10 }}>
                          — {t.authorName} ({t.authorRole})
                        </h4>
                      </div>

                      <div className="cwb-item-card-actions">
                        <button
                          type="button"
                          onClick={() => handleDeleteSubItem('testimonials', t.id)}
                          className="cwb-btn cwb-btn-danger"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 13: ADMISSIONS & DATES ==================== */}
          {activeTab === 'admissions' && (
            <form onSubmit={handleSaveWebsiteSettings}>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Admissions, Scholarships & Important Dates</h2>
                  <p className="cwb-section-desc">Configure academic calendar, scholarship criteria, and application procedure.</p>
                </div>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Admissions Details'}
                </button>
              </div>

              <div className="cwb-form-grid-2">
                <div className="cwb-form-group">
                  <label className="cwb-label">Current Academic Intake Year</label>
                  <input
                    type="text"
                    value={form.admissionYear || '2026 - 2027'}
                    onChange={(e) => setForm({ ...form, admissionYear: e.target.value })}
                    className="cwb-input"
                    placeholder="2026 - 2027"
                  />
                </div>
                <div className="cwb-form-group">
                  <label className="cwb-label">Admission Helpline Mobile / Phone</label>
                  <input
                    type="tel"
                    value={form.contactPhone || ''}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="cwb-input"
                  />
                </div>
              </div>

              {/* Section 12/13: Visual Admission Roadmap */}
              <AdmissionRoadmapVisualEditor
                value={form.admissionProcessJson}
                onChange={(json) => setForm({ ...form, admissionProcessJson: json })}
              />

              {/* Section 12/13: Visual Scholarship Tiers */}
              <ScholarshipTiersVisualEditor
                value={form.scholarshipDetailsJson}
                onChange={(json) => setForm({ ...form, scholarshipDetailsJson: json })}
              />

              <div className="cwb-save-bar">
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save Admissions Details'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== TAB 14: OPEN CBT EXAMINATIONS ==================== */}
          {activeTab === 'exams' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Open CBT Examinations & Direct UPI Monetization</h2>
                  <p className="cwb-section-desc">Sell online mock tests directly to outside aspirants, collect UPI payments with 0% gateway commission, and verify 12-digit UTR references.</p>
                </div>
              </div>

              {/* CBT Mock Exam Monetization & Official UPI QR Setup Card */}
              <div className="cwb-card" style={{ marginBottom: 24, border: '1px solid #bfdbfe', background: '#f8fafc', padding: 22, borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>⚡</span> CBT Mock Exam Monetization & College UPI QR Setup
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                      Set your online mock exam registration fee. Students scan your college UPI QR code (PhonePe/GPay), pay directly to your bank account, and submit their 12-digit UTR.
                    </p>
                  </div>
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
                    Direct UPI Settlement • 0% Fee
                  </span>
                </div>

                <form onSubmit={handleSaveWebsiteSettings}>
                  <div className="cwb-grid-fields">
                    <div className="cwb-col-6">
                      <label className="cwb-label">Mock Exam Registration Fee (₹ INR)</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: 10, color: '#64748b', fontWeight: 800 }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          value={form.examFee ?? 0}
                          onChange={(e) => setForm({ ...form, examFee: parseInt(e.target.value, 10) || 0 })}
                          placeholder="0 for Free Test, or 199, 499..."
                          className="cwb-input"
                          style={{ paddingLeft: 28, fontWeight: 700 }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                        {form.examFee > 0
                          ? `Paid test: ₹${form.examFee}. Outside students must scan UPI QR and submit 12-digit UTR.`
                          : 'Free test: Outside students receive instant hall ticket and password without payment.'}
                      </span>
                    </div>

                    <div className="cwb-col-6">
                      <label className="cwb-label">College Official UPI ID (VPA)</label>
                      <input
                        type="text"
                        value={form.upiId || ''}
                        onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                        placeholder="e.g. andhrainspire@sbi, 9848022338@ybl"
                        className="cwb-input"
                        style={{ fontFamily: 'monospace', fontWeight: 700 }}
                      />
                      <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                        Official PhonePe, Google Pay, or BHIM UPI ID for student fees.
                      </span>
                    </div>

                    <div className="cwb-col-6">
                      <label className="cwb-label">Payee / Account Name</label>
                      <input
                        type="text"
                        value={form.payeeName || ''}
                        onChange={(e) => setForm({ ...form, payeeName: e.target.value })}
                        placeholder="e.g. Andhra Inspire Academy"
                        className="cwb-input"
                      />
                    </div>

                    <div className="cwb-col-6">
                      <label className="cwb-label">Official College UPI QR Code Image</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {form.upiQrUrl ? (
                          <div style={{ position: 'relative', width: 64, height: 64, border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                            <img src={form.upiQrUrl} alt="UPI QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, upiQrUrl: '' })}
                              style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : null}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await handleFileUpload(file);
                              if (url) setForm((prev) => ({ ...prev, upiQrUrl: url }));
                            } catch (err) {
                              alert('QR upload failed: ' + err.message);
                            }
                          }}
                          className="cwb-input"
                          style={{ flex: 1, padding: 6 }}
                        />
                      </div>
                    </div>

                    <div className="cwb-col-12">
                      <label className="cwb-label">Candidate Payment Instructions</label>
                      <textarea
                        rows={2}
                        value={form.cbtPaymentInstructions || ''}
                        onChange={(e) => setForm({ ...form, cbtPaymentInstructions: e.target.value })}
                        placeholder="e.g. Scan QR code using PhonePe, Google Pay, or Paytm. Complete payment of ₹199 and copy the 12-digit UTR number from your receipt. Enter it below for verification."
                        className="cwb-textarea"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                      {saving ? 'Saving...' : '💾 Save Monetization & UPI Settings'}
                    </button>
                  </div>
                </form>
              </div>

              {openExams.length === 0 ? (
                <div className="cwb-empty-state">
                  <span className="cwb-empty-icon">📝</span>
                  <h3 className="cwb-empty-title">No CBT Exams Available Yet</h3>
                  <p className="cwb-empty-desc">Generate a question paper in your QuestionStudio dashboard and launch a CBT exam to feature it here.</p>
                  <Link to="/generate" className="cwb-btn cwb-btn-primary">
                    Go to Paper Generator →
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {openExams.map((exam) => (
                    <div
                      key={exam.id}
                      style={{
                        padding: 18,
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>{exam.title}</h4>
                          <span className="cwb-item-pill" style={{ background: '#eff6ff', color: '#1e40af' }}>
                            {exam.examName} • {exam.durationMinutes} mins
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                          Access Code: <code style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, color: '#2563eb' }}>{exam.code}</code>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleExamVisible(exam.id, exam.isPublicWebsiteVisible)}
                        className={`cwb-btn ${exam.isPublicWebsiteVisible ? 'cwb-btn-emerald' : 'cwb-btn-secondary'}`}
                      >
                        {exam.isPublicWebsiteVisible ? '✓ Visible on Portal' : '+ Feature on Website'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 15: FACULTY CAREERS ==================== */}
          {activeTab === 'careers' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Faculty Recruitment & Job Vacancies ({jobs.length})</h2>
                  <p className="cwb-section-desc">Manage teacher recruitment posts and inspect submitted candidate resumes.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('jobs');
                    setModalForm({
                      jobTitle: '',
                      department: 'Physics',
                      employmentType: 'FULL_TIME',
                      vacanciesCount: 1,
                      minExperienceYrs: 3,
                      requiredQualifications: 'M.Sc.',
                      jobDescription: '',
                      isActive: true,
                    });
                  }}
                  className="cwb-btn cwb-btn-primary"
                >
                  <span>+</span>
                  <span>Post Job Vacancy</span>
                </button>
              </div>

              {/* Jobs list */}
              {jobs.length === 0 ? (
                <div className="cwb-empty-state">
                  <span className="cwb-empty-icon">💼</span>
                  <h3 className="cwb-empty-title">No Active Vacancies</h3>
                  <p className="cwb-empty-desc">Advertise faculty positions for NEET/JEE lecturers and senior teachers.</p>
                </div>
              ) : (
                <div className="cwb-items-grid">
                  {jobs.map((j) => (
                    <div key={j.id} className="cwb-item-card">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span className="cwb-item-pill" style={{ background: '#dbeafe', color: '#1e40af' }}>{j.department}</span>
                          <span className="cwb-item-pill">{j.employmentType || 'FULL TIME'}</span>
                        </div>
                        <h3 className="cwb-item-card-title">{j.jobTitle}</h3>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                          Applications received: <strong>{j._count?.applications || 0}</strong>
                        </p>
                      </div>

                      <div className="cwb-item-card-actions">
                        <button
                          type="button"
                          onClick={() => handleDeleteSubItem('jobs', j.id)}
                          className="cwb-btn cwb-btn-danger"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Received Applications */}
              <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
                  Received Candidate Applications ({applications.length})
                </h3>
                {applications.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>No resumes received yet from website applicants.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        style={{
                          padding: 14,
                          background: '#f8fafc',
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>{app.applicantName}</strong>
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {app.email} • {app.phone} • {app.experienceYrs} yrs exp
                          </span>
                        </div>
                        <a
                          href={`/uploads/resumes/${app.resumeFilename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="cwb-btn cwb-btn-primary"
                          style={{ padding: '6px 12px', fontSize: 11 }}
                        >
                          📄 Download Resume
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 16: ADMISSIONS & CBT PAYMENTS INBOX ==================== */}
          {activeTab === 'enquiries' && (() => {
            const cbtEnquiries = enquiries.filter((e) => e.isCbtRegistration);
            const pendingUtr = enquiries.filter((e) => e.isCbtRegistration && e.paymentStatus === 'PENDING_VERIFICATION');

            const displayList =
              enquiryFilter === 'CBT'
                ? cbtEnquiries
                : enquiryFilter === 'PENDING'
                ? pendingUtr
                : enquiries;

            return (
              <div>
                <div className="cwb-section-header">
                  <div>
                    <h2 className="cwb-section-title">Admissions & CBT Registrations Inbox ({enquiries.length})</h2>
                    <p className="cwb-section-desc">Manage admissions leads, verify student UPI UTR transactions, and dispatch CBT exam credentials via WhatsApp.</p>
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setEnquiryFilter('ALL')}
                      className={`cwb-btn ${enquiryFilter === 'ALL' ? 'cwb-btn-primary' : 'cwb-btn-secondary'}`}
                      style={{ padding: '6px 14px', fontSize: 12 }}
                    >
                      All Leads ({enquiries.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnquiryFilter('CBT')}
                      className={`cwb-btn ${enquiryFilter === 'CBT' ? 'cwb-btn-purple' : 'cwb-btn-secondary'}`}
                      style={{ padding: '6px 14px', fontSize: 12 }}
                    >
                      ⚡ CBT Mock Registrations ({cbtEnquiries.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnquiryFilter('PENDING')}
                      className={`cwb-btn ${enquiryFilter === 'PENDING' ? 'cwb-btn-danger' : 'cwb-btn-secondary'}`}
                      style={{ padding: '6px 14px', fontSize: 12 }}
                    >
                      ⏳ Pending UTR ({pendingUtr.length})
                    </button>
                  </div>
                </div>

                {displayList.length === 0 ? (
                  <div className="cwb-empty-state">
                    <span className="cwb-empty-icon">📬</span>
                    <h3 className="cwb-empty-title">
                      {enquiryFilter === 'PENDING'
                        ? 'No Pending UTR Verifications'
                        : enquiryFilter === 'CBT'
                        ? 'No Online CBT Registrations Yet'
                        : 'No Inquiries Yet'}
                    </h3>
                    <p className="cwb-empty-desc">
                      {enquiryFilter === 'PENDING'
                        ? 'All candidate UPI payments have been verified and processed!'
                        : 'Prospective students and aspirants registering on your portal appear here in real time.'}
                    </p>
                  </div>
                ) : (
                  <div className="cwb-table-wrapper">
                    <table className="cwb-table">
                      <thead>
                        <tr>
                          <th>Aspirant / Candidate</th>
                          <th>Lead Type & Stream</th>
                          <th>Fee & UTR Reference</th>
                          <th>Payment Status</th>
                          <th>Credentials</th>
                          <th style={{ textAlign: 'right' }}>Actions & WhatsApp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayList.map((enq) => {
                          const isCbt = Boolean(enq.isCbtRegistration);
                          const isPending = enq.paymentStatus === 'PENDING_VERIFICATION';
                          const isApproved = enq.paymentStatus === 'APPROVED' || enq.paymentStatus === 'FREE';

                          return (
                            <tr key={enq.id}>
                              {/* Column 1: Candidate info */}
                              <td>
                                <strong style={{ display: 'block', color: '#0f172a' }}>{enq.studentName}</strong>
                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#334155', fontWeight: 700 }}>
                                  {enq.phone}
                                </span>
                                {enq.email && <div style={{ fontSize: 11, color: '#64748b' }}>{enq.email}</div>}
                                {enq.cityOrTown && <div style={{ fontSize: 10, color: '#94a3b8' }}>📍 {enq.cityOrTown}</div>}
                              </td>

                              {/* Column 2: Lead Type & Stream */}
                              <td>
                                {isCbt ? (
                                  <span className="cwb-item-pill" style={{ background: '#f5f3ff', color: '#6d28d9', fontWeight: 800 }}>
                                    ⚡ CBT Mock Exam
                                  </span>
                                ) : (
                                  <span className="cwb-item-pill" style={{ background: '#eff6ff', color: '#1e40af' }}>
                                    🏫 Admission Enquiry
                                  </span>
                                )}
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                                  {enq.cbtExamName || enq.courseOfInterest || 'General Admission'}
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                  {new Date(enq.createdAt).toLocaleDateString()}
                                </div>
                              </td>

                              {/* Column 3: Fee & UTR */}
                              <td>
                                {isCbt ? (
                                  <>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: enq.examFee > 0 ? '#059669' : '#0284c7' }}>
                                      {enq.examFee > 0 ? `₹${enq.examFee}` : 'FREE (Scholarship)'}
                                    </div>
                                    {enq.utrNumber ? (
                                      <div style={{ marginTop: 4 }}>
                                        <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>UTR Reference:</span>
                                        <code
                                          style={{
                                            fontFamily: 'monospace',
                                            fontWeight: 800,
                                            fontSize: 12,
                                            background: '#f1f5f9',
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            color: '#0f172a',
                                            cursor: 'pointer',
                                          }}
                                          title="Click to copy UTR"
                                          onClick={() => {
                                            navigator.clipboard.writeText(enq.utrNumber);
                                            alert('UTR copied: ' + enq.utrNumber);
                                          }}
                                        >
                                          {enq.utrNumber} 📋
                                        </code>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ fontSize: 11, color: '#64748b' }}>N/A (Admission)</span>
                                )}
                              </td>

                              {/* Column 4: Payment Status */}
                              <td>
                                {isCbt ? (
                                  <div>
                                    {enq.paymentStatus === 'PENDING_VERIFICATION' && (
                                      <span className="cwb-item-pill" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 800 }}>
                                        ⏳ PENDING UTR
                                      </span>
                                    )}
                                    {enq.paymentStatus === 'APPROVED' && (
                                      <span className="cwb-item-pill" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>
                                        ✅ APPROVED
                                      </span>
                                    )}
                                    {enq.paymentStatus === 'REJECTED' && (
                                      <span className="cwb-item-pill" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 800 }}>
                                        ❌ REJECTED
                                      </span>
                                    )}
                                    {enq.paymentStatus === 'FREE' && (
                                      <span className="cwb-item-pill" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800 }}>
                                        🎁 FREE ACCESS
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <select
                                    value={enq.status}
                                    onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value)}
                                    className="cwb-select"
                                    style={{ width: 'auto', padding: '4px 8px', fontSize: 11, fontWeight: 700 }}
                                  >
                                    <option value="NEW">NEW</option>
                                    <option value="CONTACTED">CONTACTED</option>
                                    <option value="COUNSELED">COUNSELED</option>
                                    <option value="ENROLLED">ENROLLED</option>
                                    <option value="CLOSED">CLOSED</option>
                                  </select>
                                )}
                              </td>

                              {/* Column 5: Generated Credentials */}
                              <td>
                                {enq.candidateRollNumber ? (
                                  <div style={{ fontSize: 11 }}>
                                    <div>Roll: <strong style={{ fontFamily: 'monospace', color: '#1e40af' }}>{enq.candidateRollNumber}</strong></div>
                                    <div>Pass: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{enq.candidatePassword}</strong></div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Not issued</span>
                                )}
                              </td>

                              {/* Column 6: Actions */}
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                                  {isCbt && isPending && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={processingEnquiryId === enq.id}
                                        onClick={() => handleApproveCbt(enq.id)}
                                        className="cwb-btn cwb-btn-emerald"
                                        style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                                        title="Verify UTR and generate roll number and exam passcode"
                                      >
                                        {processingEnquiryId === enq.id ? '...' : '✅ Verify & Approve'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={processingEnquiryId === enq.id}
                                        onClick={() => handleRejectCbt(enq.id)}
                                        className="cwb-btn cwb-btn-danger"
                                        style={{ padding: '4px 8px', fontSize: 11 }}
                                        title="Reject payment"
                                      >
                                        ✕ Reject
                                      </button>
                                    </>
                                  )}

                                  {isCbt && isApproved && enq.candidateRollNumber && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendWhatsAppCredentials(enq)}
                                      className="cwb-btn cwb-btn-emerald"
                                      style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                                      title="Open WhatsApp chat with pre-filled exam hall ticket and credentials"
                                    >
                                      {enq.whatsappSentAt ? '📲 Re-send WhatsApp' : '📲 WhatsApp Credentials'}
                                    </button>
                                  )}

                                  <a
                                    href={`https://wa.me/${enq.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="cwb-btn cwb-btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: 11 }}
                                    title="Open direct WhatsApp chat with student"
                                  >
                                    💬 Chat
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ==================== TAB 17: SEO & OPENGRAPH ==================== */}
          {activeTab === 'seo' && (
            <form onSubmit={handleSaveWebsiteSettings}>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Search Engine Optimization (SEO) & Social Meta</h2>
                  <p className="cwb-section-desc">Rank on Google for local coaching searches and control rich previews on WhatsApp / LinkedIn.</p>
                </div>
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save SEO Settings'}
                </button>
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Google Meta Title (Max 60 chars)</label>
                <input
                  type="text"
                  placeholder="e.g. Best NEET & IIT-JEE Coaching College in Vijayawada | Inspire Academy"
                  value={form.metaTitle || ''}
                  onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                  className="cwb-input"
                />
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Google Meta Description (150-160 characters)</label>
                <textarea
                  rows={3}
                  placeholder="Summary snippet displayed in search engine results and social preview cards."
                  value={form.metaDescription || ''}
                  onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                  className="cwb-textarea"
                />
              </div>

              <div className="cwb-form-group">
                <label className="cwb-label">Search Keywords (Comma separated)</label>
                <input
                  type="text"
                  placeholder="NEET coaching, JEE Main, best junior college, Vijayawada coaching"
                  value={form.metaKeywords || ''}
                  onChange={(e) => setForm({ ...form, metaKeywords: e.target.value })}
                  className="cwb-input"
                />
              </div>

              {/* Section 14: Visual FAQ Accordion */}
              <FaqsVisualEditor
                value={form.faqsJson}
                onChange={(json) => setForm({ ...form, faqsJson: json })}
              />

              <div className="cwb-save-bar">
                <button type="submit" disabled={saving} className="cwb-btn cwb-btn-primary">
                  {saving ? 'Saving...' : 'Save SEO Settings'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== TAB 18: INTERACTIVE PREVIEW ==================== */}
          {activeTab === 'preview' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Interactive Responsive Website Preview</h2>
                  <p className="cwb-section-desc">Experience your public institutional website across desktop, tablet, and mobile screens.</p>
                </div>
                <div className="cwb-preview-controls">
                  {['desktop', 'tablet', 'mobile'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPreviewDevice(d)}
                      className={`cwb-preview-device-btn ${previewDevice === d ? 'active' : ''}`}
                    >
                      {d === 'desktop' ? '🖥 Desktop' : d === 'tablet' ? '📱 Tablet (768px)' : '📱 Mobile (390px)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cwb-preview-viewport-container">
                <iframe
                  src={publicUrl}
                  title="Website Preview"
                  className={`cwb-preview-frame ${previewDevice}`}
                />
              </div>
            </div>
          )}

          {/* ==================== TAB 19: PUBLISH & STATUS ==================== */}
          {activeTab === 'publish' && (
            <div>
              <div className="cwb-section-header">
                <div>
                  <h2 className="cwb-section-title">Publish Website & Version Management</h2>
                  <p className="cwb-section-desc">Control public deployment, review publish version timestamps, and test live availability.</p>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Current Live Status: {website.isPublished ? '🟢 ONLINE' : '🟡 DRAFT MODE'}
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                      {website.isPublished
                        ? 'Your website is actively accessible worldwide at your unique institutional URL.'
                        : 'Your website is in draft mode. Visitors will see a maintenance notice until you publish.'}
                    </p>
                  </div>

                  {website.isPublished ? (
                    <button
                      type="button"
                      onClick={() => handlePublishToggle(false)}
                      disabled={saving}
                      className="cwb-btn cwb-btn-danger"
                    >
                      Unpublish Website
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePublishToggle(true)}
                      disabled={saving}
                      className="cwb-btn cwb-btn-emerald"
                      style={{ padding: '10px 22px', fontSize: 13 }}
                    >
                      🚀 Publish to Live Web
                    </button>
                  )}
                </div>

                <div style={{ paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ margin: 0 }}>Published Version: <strong>v{website.publishedVersion}</strong></p>
                  {website.publishedAt && (
                    <p style={{ margin: 0 }}>Last Published At: <strong>{new Date(website.publishedAt).toLocaleString()}</strong></p>
                  )}
                  <p style={{ margin: 0 }}>
                    Target Live URL:{' '}
                    <a href={publicUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline' }}>
                      {fullLiveUrl}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== 3. UNIVERSAL CREATE / EDIT MODAL ==================== */}
      {modalType && (
        <div className="cwb-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="cwb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cwb-modal-header">
              <h3 className="cwb-modal-title">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="cwb-modal-close"
              >
                ✕
              </button>
            </div>

            <div className="cwb-modal-body">
              {/* Courses Form */}
              {modalType === 'courses' && (
                <div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Course Name *</label>
                    <input
                      type="text"
                      value={modalForm.courseName || ''}
                      onChange={(e) => setModalForm({ ...modalForm, courseName: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. NEET 2-Year Intensive Medical Batch"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Category</label>
                    <select
                      value={modalForm.category || 'MEDICAL'}
                      onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                      className="cwb-select"
                    >
                      <option value="MEDICAL">Medical (NEET)</option>
                      <option value="ENGINEERING">Engineering (JEE Main & Adv)</option>
                      <option value="FOUNDATION">Foundation (Class 8-10)</option>
                      <option value="DEGREE">Intermediate (MPC / BiPC)</option>
                    </select>
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Target Exam</label>
                    <input
                      type="text"
                      placeholder="e.g. NEET UG / IIT JEE"
                      value={modalForm.targetExam || ''}
                      onChange={(e) => setModalForm({ ...modalForm, targetExam: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 2 Academic Years"
                      value={modalForm.duration || ''}
                      onChange={(e) => setModalForm({ ...modalForm, duration: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Eligibility Criteria</label>
                    <input
                      type="text"
                      placeholder="e.g. Class 10th with minimum 60% marks"
                      value={modalForm.eligibility || ''}
                      onChange={(e) => setModalForm({ ...modalForm, eligibility: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Brief Description</label>
                    <textarea
                      rows={3}
                      value={modalForm.description || ''}
                      onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                      className="cwb-textarea"
                    />
                  </div>
                </div>
              )}

              {/* Faculty Form */}
              {modalType === 'faculty' && (
                <div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Full Name *</label>
                    <input
                      type="text"
                      value={modalForm.name || ''}
                      onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. Prof. S. N. Murthy"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Designation *</label>
                    <input
                      type="text"
                      value={modalForm.designation || ''}
                      onChange={(e) => setModalForm({ ...modalForm, designation: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. Senior HOD Physics"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Department *</label>
                    <input
                      type="text"
                      value={modalForm.department || ''}
                      onChange={(e) => setModalForm({ ...modalForm, department: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. Physics / Chemistry / Zoology"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Academic Qualification</label>
                    <input
                      type="text"
                      value={modalForm.qualification || ''}
                      onChange={(e) => setModalForm({ ...modalForm, qualification: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. M.Sc. Physics (IIT Kharagpur)"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Experience (Years)</label>
                    <input
                      type="number"
                      value={modalForm.experienceYrs || ''}
                      onChange={(e) => setModalForm({ ...modalForm, experienceYrs: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Faculty Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const url = await handleFileUpload(file, 'faculty');
                          if (url) setModalForm({ ...modalForm, photoUrl: url });
                        }
                      }}
                      className="cwb-input"
                    />
                  </div>
                </div>
              )}

              {/* Facilities Form */}
              {modalType === 'facilities' && (
                <div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Facility Title *</label>
                    <input
                      type="text"
                      value={modalForm.title || ''}
                      onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. Advanced Digital Physics Laboratory"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Category</label>
                    <select
                      value={modalForm.category || 'LAB'}
                      onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                      className="cwb-select"
                    >
                      <option value="LAB">Science Laboratory</option>
                      <option value="LIBRARY">Library & Reading Room</option>
                      <option value="HOSTEL">Hostel & Dining</option>
                      <option value="SPORTS">Sports & Recreation</option>
                      <option value="CLASSROOM">Digital Smart Classrooms</option>
                    </select>
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Description</label>
                    <textarea
                      rows={3}
                      value={modalForm.description || ''}
                      onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                      className="cwb-textarea"
                    />
                  </div>
                </div>
              )}

              {/* Achievements Form */}
              {modalType === 'achievements' && (
                <div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Student Name *</label>
                    <input
                      type="text"
                      value={modalForm.studentName || ''}
                      onChange={(e) => setModalForm({ ...modalForm, studentName: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. K. Sai Teja"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Exam / Distinction *</label>
                    <input
                      type="text"
                      value={modalForm.examOrAward || ''}
                      onChange={(e) => setModalForm({ ...modalForm, examOrAward: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. NEET AIR 42 / JEE Advanced AIR 118"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Score / Rank</label>
                    <input
                      type="text"
                      value={modalForm.rankOrScore || ''}
                      onChange={(e) => setModalForm({ ...modalForm, rankOrScore: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. Score: 710/720"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Academic Year</label>
                    <input
                      type="number"
                      value={modalForm.year || 2025}
                      onChange={(e) => setModalForm({ ...modalForm, year: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                </div>
              )}

              {/* Testimonials Form */}
              {modalType === 'testimonials' && (
                <div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Author Name *</label>
                    <input
                      type="text"
                      value={modalForm.authorName || ''}
                      onChange={(e) => setModalForm({ ...modalForm, authorName: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. P. Harika"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Author Designation / Role</label>
                    <input
                      type="text"
                      value={modalForm.authorRole || ''}
                      onChange={(e) => setModalForm({ ...modalForm, authorRole: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. Alumni (AIIMS New Delhi) / Parent"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Rating (1 to 5 Stars)</label>
                    <select
                      value={modalForm.rating || 5}
                      onChange={(e) => setModalForm({ ...modalForm, rating: parseInt(e.target.value, 10) })}
                      className="cwb-select"
                    >
                      <option value={5}>★★★★★ (5 Stars)</option>
                      <option value={4}>★★★★☆ (4 Stars)</option>
                      <option value={3}>★★★☆☆ (3 Stars)</option>
                    </select>
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Quote / Review *</label>
                    <textarea
                      rows={3}
                      value={modalForm.quote || ''}
                      onChange={(e) => setModalForm({ ...modalForm, quote: e.target.value })}
                      className="cwb-textarea"
                    />
                  </div>
                </div>
              )}

              {/* Jobs Form */}
              {modalType === 'jobs' && (
                <div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Job Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior NEET Biology Faculty"
                      value={modalForm.jobTitle || ''}
                      onChange={(e) => setModalForm({ ...modalForm, jobTitle: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Department *</label>
                    <input
                      type="text"
                      placeholder="e.g. Zoology / Botany / Mathematics"
                      value={modalForm.department || ''}
                      onChange={(e) => setModalForm({ ...modalForm, department: e.target.value })}
                      className="cwb-input"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Required Qualifications</label>
                    <input
                      type="text"
                      value={modalForm.requiredQualifications || ''}
                      onChange={(e) => setModalForm({ ...modalForm, requiredQualifications: e.target.value })}
                      className="cwb-input"
                      placeholder="e.g. M.Sc. with minimum 5 years competitive coaching experience"
                    />
                  </div>
                  <div className="cwb-form-group">
                    <label className="cwb-label">Job Description *</label>
                    <textarea
                      rows={3}
                      value={modalForm.jobDescription || ''}
                      onChange={(e) => setModalForm({ ...modalForm, jobDescription: e.target.value })}
                      className="cwb-textarea"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="cwb-modal-footer">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="cwb-btn cwb-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSubItem}
                className="cwb-btn cwb-btn-primary"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

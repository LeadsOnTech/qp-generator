const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/GeneratePaper.jsx", "utf8");

// Change subjectCounts to be an object holding { mcq: 0, nvq: 0 }
content = content.replace(
  "const [subjectCounts, setSubjectCounts] = useState({}); // { Physics: 15, ... }",
  "const [subjectCounts, setSubjectCounts] = useState({}); // { Physics: { mcq: 20, nvq: 10 }, ... }"
);

// totalQuestions calculation
content = content.replace(
  "const totalQuestions = Object.values(subjectCounts).reduce((s, v) => s + (Number(v) || 0), 0);",
  "const totalQuestions = Object.values(subjectCounts).reduce((s, v) => s + (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0), 0);"
);

// loading saved pattern
content = content.replace(
  "for (const s of pattern.subjects) counts[s.name] = String(s.count);",
  "for (const s of pattern.subjects) counts[s.name] = { mcq: String(s.mcqCount || s.count || 0), nvq: String(s.nvqCount || 0) };"
);

// saving pattern
content = content.replace(
  "const subjects = Object.entries(subjectCounts)\n        .filter(([, v]) => Number(v) > 0)\n        .map(([name, v]) => ({ name, count: Number(v) }));",
  "const subjects = Object.entries(subjectCounts)\n        .filter(([, v]) => (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0) > 0)\n        .map(([name, v]) => ({ name, mcqCount: Number(v?.mcq) || 0, nvqCount: Number(v?.nvq) || 0 }));"
);

// generating paper
content = content.replace(
  "const subjects = Object.entries(subjectCounts)\n        .filter(([, v]) => Number(v) > 0)\n        .map(([name, v]) => ({\n          name,\n          count: Number(v),",
  "const subjects = Object.entries(subjectCounts)\n        .filter(([, v]) => (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0) > 0)\n        .map(([name, v]) => ({\n          name,\n          mcqCount: Number(v?.mcq) || 0,\n          nvqCount: Number(v?.nvq) || 0,"
);

// setCount function
content = content.replace(
  "function setCount(subjectName, value) {\n    setSubjectCounts((prev) => ({ ...prev, [subjectName]: value }));\n  }",
  "function setCount(subjectName, type, value) {\n    setSubjectCounts((prev) => ({ ...prev, [subjectName]: { ...prev[subjectName], [type]: value } }));\n  }"
);

// Input fields
content = content.replace(
  /<input\s+type="text" inputMode="numeric" placeholder="0"\s+value=\{subjectCounts\[s.name\] \|\| ''\}\s+onChange=\{\(e\) => setCount\(s.name, e.target.value.replace\(\/\[\^0-9\]\/g, ''\)\)\}\s+\/>/s,
  `<div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: 'var(--ink-soft)' }}>MCQ</label>
                          <input type="text" inputMode="numeric" placeholder="0" value={subjectCounts[s.name]?.mcq || ''} onChange={(e) => setCount(s.name, 'mcq', e.target.value.replace(/[^0-9]/g, ''))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: 'var(--ink-soft)' }}>NVQ</label>
                          <input type="text" inputMode="numeric" placeholder="0" value={subjectCounts[s.name]?.nvq || ''} onChange={(e) => setCount(s.name, 'nvq', e.target.value.replace(/[^0-9]/g, ''))} style={{ width: '100%' }} />
                        </div>
                      </div>`
);

fs.writeFileSync("frontend/src/pages/GeneratePaper.jsx", content, "utf8");

const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/PaperPreview.jsx", "utf8");

const oldStr = `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 18px', fontSize: 13.5 }}>
                      {['A', 'B', 'C', 'D'].map((key) => (
                        <div
                          key={key}
                          style={{
                            color: showAnswers && q.correctOption === key ? 'var(--success)' : 'var(--ink-soft)',
                            fontWeight: showAnswers && q.correctOption === key ? 700 : 400,
                          }}
                        >
                          ({key}) {q.options[key]}
                        </div>
                      ))}
                    </div>`;

const newStr = `{!(q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL' || q.questionType === 'NVQ') ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 18px', fontSize: 13.5 }}>
                      {['A', 'B', 'C', 'D'].map((key) => (
                        <div
                          key={key}
                          style={{
                            color: showAnswers && q.correctOption === key ? 'var(--success)' : 'var(--ink-soft)',
                            fontWeight: showAnswers && q.correctOption === key ? 700 : 400,
                          }}
                        >
                          ({key}) {q.options[key]}
                        </div>
                      ))}
                    </div>
                    ) : (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--paper-dim)', borderRadius: 4, display: 'inline-block', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {showAnswers ? \`Answer: \${q.correctOption}\` : 'Numerical Answer Box'}
                    </div>
                    )}`;

content = content.replace(oldStr, newStr);

fs.writeFileSync("frontend/src/pages/PaperPreview.jsx", content, "utf8");

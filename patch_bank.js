const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

const formatter = `
function formatHeadingText(text) {
  if (!text) return text;
  const regex = /(Statement I\\s*[:\\.]|Statement II\\s*[:\\.]|Statement 1\\s*[:\\.]|Statement 2\\s*[:\\.]|Assertion\\s*(?:\\(A\\))?\\s*[:\\.]|Reason\\s*(?:\\(R\\))?\\s*[:\\.]|Statement-1\\s*[:\\.]|Statement-2\\s*[:\\.]|Statement - 1\\s*[:\\.]|Statement - 2\\s*[:\\.])/gi;
  const parts = String(text).split(regex);
  return parts.map((part, i) => (i % 2 === 1) ? <strong key={i}>{part}</strong> : part);
}
`;

content = content.replace("export default function QuestionBank() {", formatter + "\nexport default function QuestionBank() {");

content = content.replace(
  /<div style=\{\{\s*fontSize:\s*14,\s*fontWeight:\s*500,\s*color:\s*'var\(--ink\)'\s*\}\}>\s*\{q\.questionText\}\s*<\/div>/g,
  "<div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{formatHeadingText(q.questionText)}</div>"
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");

const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/PaperPreview.jsx", "utf8");

const formatter = `
function formatHeadingText(text) {
  if (!text) return text;
  const regex = /(Statement I\\s*[:\\.]|Statement II\\s*[:\\.]|Statement 1\\s*[:\\.]|Statement 2\\s*[:\\.]|Assertion\\s*(?:\\(A\\))?\\s*[:\\.]|Reason\\s*(?:\\(R\\))?\\s*[:\\.]|Statement-1\\s*[:\\.]|Statement-2\\s*[:\\.]|Statement - 1\\s*[:\\.]|Statement - 2\\s*[:\\.])/gi;
  const parts = String(text).split(regex);
  return parts.map((part, i) => (i % 2 === 1) ? <strong key={i}>{part}</strong> : part);
}
`;

content = content.replace("export default function PaperPreview() {", formatter + "\nexport default function PaperPreview() {");

content = content.replace(
  /\{i \+ 1\}\.\s*\{q\.questionText\}/,
  "{i + 1}. {formatHeadingText(q.questionText)}"
);

fs.writeFileSync("frontend/src/pages/PaperPreview.jsx", content, "utf8");

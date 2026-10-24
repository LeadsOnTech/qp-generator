const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QualityChecks.jsx", "utf8");

content = content.replace(
  "<td className=\"q-text\">{q.questionText}</td>",
  "<td className=\"q-text\" style={{ whiteSpace: 'pre-wrap' }}>{q.questionText}</td>"
);
content = content.replace(
  "<td className=\"q-text\">\n                        {q.imageUrl && (\n                          <img\n                            src={`${api.imageBase()}${q.imageUrl}`}\n                            alt=\"\"\n                            style={{ width: 60, height: 40, objectFit: 'contain', float: 'right', marginLeft: 8, borderRadius: 4, background: 'var(--paper-dim)' }}\n                          />\n                        )}\n                        {q.questionText}\n                      </td>",
  "<td className=\"q-text\" style={{ whiteSpace: 'pre-wrap' }}>\n                        {q.imageUrl && (\n                          <img\n                            src={`${api.imageBase()}${q.imageUrl}`}\n                            alt=\"\"\n                            style={{ width: 60, height: 40, objectFit: 'contain', float: 'right', marginLeft: 8, borderRadius: 4, background: 'var(--paper-dim)' }}\n                          />\n                        )}\n                        {q.questionText}\n                      </td>"
);

fs.writeFileSync("frontend/src/pages/QualityChecks.jsx", content, "utf8");

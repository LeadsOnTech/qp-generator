const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/UploadPreview.jsx", "utf8");

content = content.replace(
  "<td className=\"q-text\">{q.questionText}</td>",
  "<td className=\"q-text\" style={{ whiteSpace: 'pre-wrap' }}>{q.questionText}</td>"
);

fs.writeFileSync("frontend/src/pages/UploadPreview.jsx", content, "utf8");

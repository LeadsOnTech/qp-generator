const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/SyllabusMaster.jsx", "utf8");

content = content.replace(
  "{ch.questionCount} question{ch.questionCount !== 1 ? 's' : ''}",
  "{ch.questionCount} questions ({ch.mcqCount || 0} MCQ, {ch.nvqCount || 0} NVQ)"
);

fs.writeFileSync("frontend/src/pages/SyllabusMaster.jsx", content, "utf8");

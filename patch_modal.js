const fs = require("fs");
let content = fs.readFileSync("frontend/src/components/ChapterPickerModal.jsx", "utf8");

content = content.replace(
  "{ch.questionCount} question{ch.questionCount !== 1 ? 's' : ''}",
  "{ch.questionCount} question{ch.questionCount !== 1 ? 's' : ''} ({ch.mcqCount || 0} MCQ, {ch.nvqCount || 0} NVQ)"
);

fs.writeFileSync("frontend/src/components/ChapterPickerModal.jsx", content, "utf8");

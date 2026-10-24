const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

content = content.replace(
  /\{q\.questionText\}/,
  "{formatHeadingText(q.questionText)}"
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");

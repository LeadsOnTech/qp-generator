const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

content = content.replace(
  /<button className="btn-secondary-ghost".*?<\/button>\s*<button className="btn-danger-ghost".*?<\/button>/s,
  (match) => `<>\n${match}\n</>`
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");

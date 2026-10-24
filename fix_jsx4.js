const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

content = content.replace(
  "                      {isAdmin && (\n                        <>\n<button className=\"btn-secondary-ghost\"",
  "                      {isAdmin && (\n                        <div style={{display: 'flex', gap: '8px'}}>\n                          <button className=\"btn-secondary-ghost\""
);

content = content.replace(
  "                        </button>\n</>\n                      )}",
  "                        </button>\n                        </div>\n                      )}"
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");

const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

content = content.replace(
  "{isAdmin && (\n                          <button className=\"btn-secondary-ghost\"",
  "{isAdmin && (\n                          <>\n                            <button className=\"btn-secondary-ghost\""
);

content = content.replace(
  "                            Remove\n                          </button>\n                        )}",
  "                            Remove\n                          </button>\n                          </>\n                        )}"
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");

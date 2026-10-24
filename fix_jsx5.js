const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

content = content.replace(
  "        </div>\n\n      {error &&",
  "        </div>\n      </div>\n\n      {error &&"
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");

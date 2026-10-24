const fs = require("fs");
const path = require("path");

["PaperPreview.jsx", "QuestionBank.jsx"].forEach(file => {
  const p = path.join(__dirname, "frontend", "src", "pages", file);
  let content = fs.readFileSync(p, "utf8");
  if (!content.includes("import React ")) {
    content = content.replace(/import \{/, "import React, {");
    fs.writeFileSync(p, content, "utf8");
  }
});

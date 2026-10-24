const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/pdfBuilder.js", "utf8");

content = content.replace(
  "const index = i + 1;\n    const index = q._renderIndex;",
  "const index = q._renderIndex;"
);

fs.writeFileSync("backend/src/lib/pdfBuilder.js", content, "utf8");

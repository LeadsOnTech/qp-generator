const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/richTextLayout.js", "utf8");

content = content.replace(
  /  \} else \{\r?\n      const transformed = textTransform\(segment\.value\);\r?\n      \/\/ Keep whitespace[\s\S]*?\}\r?\n    \}\r?\n  \}/,
  ""
);

fs.writeFileSync("backend/src/lib/richTextLayout.js", content, "utf8");

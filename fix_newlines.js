const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/richTextLayout.js", "utf8");

content = content.replace(
  "const isWhitespace = token.type === 'text' && /^\\s+$/.test(token.value);",
  "const isWhitespace = token.type === 'text' && /^\\s+$/.test(token.value);\n\n    if (token.type === 'text' && token.value.includes('\\n')) {\n      pushLine();\n      const extraLines = (token.value.match(/\\n/g) || []).length - 1;\n      for (let i = 0; i < extraLines; i++) {\n        current.items.push({ type: 'text', value: '', width: 0 });\n        pushLine();\n      }\n      continue;\n    }"
);

fs.writeFileSync("backend/src/lib/richTextLayout.js", content, "utf8");

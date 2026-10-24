const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/GeneratePaper.jsx", "utf8");

content = content.replace(
  "      const subjects = Object.entries(subjectCounts)\n        .filter(([, v]) => Number(v) > 0)\n        .map(([name, v]) => ({\n          name,\n          count: Number(v),",
  "      const subjects = Object.entries(subjectCounts)\n        .filter(([, v]) => (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0) > 0)\n        .map(([name, v]) => ({\n          name,\n          mcqCount: Number(v?.mcq) || 0,\n          nvqCount: Number(v?.nvq) || 0,"
);

fs.writeFileSync("frontend/src/pages/GeneratePaper.jsx", content, "utf8");

const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/GeneratePaper.jsx", "utf8");

content = content.replace(
  /const subjects = Object\.entries\(subjectCounts\)\s*\.filter\(\(\[, v\]\) => Number\(v\) > 0\)\s*\.map\(\(\[name, v\]\) => \(\{\s*name,\s*count: Number\(v\),/g,
  "const subjects = Object.entries(subjectCounts).filter(([, v]) => (Number(v?.mcq) || 0) + (Number(v?.nvq) || 0) > 0).map(([name, v]) => ({ name, mcqCount: Number(v?.mcq) || 0, nvqCount: Number(v?.nvq) || 0,"
);

fs.writeFileSync("frontend/src/pages/GeneratePaper.jsx", content, "utf8");

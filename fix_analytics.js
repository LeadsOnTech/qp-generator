const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/ChapterAnalytics.jsx", "utf8");

if (!content.includes("{ key: 'NVQ', label: 'NVQ' }")) {
  content = content.replace(
    "{ key: 'NUMERICAL', label: 'Numerical' },",
    "{ key: 'NUMERICAL', label: 'Numerical' },\n  { key: 'NVQ', label: 'NVQ' },"
  );
  fs.writeFileSync("frontend/src/pages/ChapterAnalytics.jsx", content, "utf8");
}

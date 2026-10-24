const fs = require("fs");
const files = [
  "frontend/src/pages/Dashboard.jsx",
  "frontend/src/pages/FeaturesPage.jsx",
  "backend/prisma/schema.prisma",
  "frontend/src/components/Layout.jsx"
];

for (const file of files) {
  try {
    let content = fs.readFileSync(file, "utf8");
    if (content.includes("â€")) {
      content = content.replace(/â€”/g, "—");
      content = content.replace(/â€“/g, "–");
      content = content.replace(/â€™/g, "'");
      content = content.replace(/â€œ/g, '"');
      content = content.replace(/â€/g, '"');
      fs.writeFileSync(file, content, "utf8");
      console.log("Fixed " + file);
    }
  } catch(e) {}
}

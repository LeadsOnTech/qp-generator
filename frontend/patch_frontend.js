const fs = require("fs");
const path = require("path");

const previewPath = path.join(__dirname, "src", "pages", "PaperPreview.jsx");
let content = fs.readFileSync(previewPath, "utf8");

if (!content.includes("<br")) {
  content = content.replace(
    /return parts\.map\(\(part, i\) => \(i % 2 === 1\) \? <strong key=\{i\}>\{part\}<\/strong> : part\);/,
    `return parts.map((part, i) => {
      if (i % 2 === 1) return <strong key={i} style={{ display: 'block', marginTop: '4px' }}>{part}</strong>;
      return part;
    });`
  );
  fs.writeFileSync(previewPath, content, "utf8");
}

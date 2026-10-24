const fs = require("fs");
const path = require("path");

const previewPath = path.join(__dirname, "frontend", "src", "pages", "PaperPreview.jsx");
let content = fs.readFileSync(previewPath, "utf8");

if (!content.includes("<br")) {
  const replacement = `
    const headingRegex = /(?:\\s*)(Statement I\\s*[:\\.]|Statement II\\s*[:\\.]|Statement 1\\s*[:\\.]|Statement 2\\s*[:\\.]|Assertion\\s*(?:\\(A\\))?\\s*[:\\.]|Reason\\s*(?:\\(R\\))?\\s*[:\\.]|Statement-1\\s*[:\\.]|Statement-2\\s*[:\\.]|Statement - 1\\s*[:\\.]|Statement - 2\\s*[:\\.])/gi;
    formattedText = formattedText.replace(headingRegex, '\\n$1').trim();
    
    const parts = formattedText.split(regex);
    return parts.map((part, i) => {
      if (i % 2 === 1) return <strong key={i}>{part}</strong>;
      return part.split('\\n').map((line, j) => <React.Fragment key={\`\${i}-\${j}\`}>{j > 0 && <br/>}{line}</React.Fragment>);
    });`;
    
  // just directly apply
  content = content.replace(
    /const parts = formattedText\.split\(regex\);\s*return parts\.map\(\(part, i\) => \(i % 2 === 1\) \? <strong key=\{i\}>\{part\}<\/strong> : part\);/,
    replacement
  );
  fs.writeFileSync(previewPath, content, "utf8");
}

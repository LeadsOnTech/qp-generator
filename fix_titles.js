const fs = require("fs");
let content = fs.readFileSync("frontend/src/landing.css", "utf8");

content = content.replace(
  /\.feature-card-title \{\s*font-family: var\(--font-display\);\s*font-size: 18px;\s*font-weight: 800;\s*margin-bottom: 12px;\s*color: #ffffff;/s,
  ".feature-card-title {\n  font-family: var(--font-display);\n  font-size: 18px;\n  font-weight: 800;\n  margin-bottom: 12px;\n  color: var(--premium-midnight);"
);

// Fallback in case regex misses
if (content.includes(".feature-card-title {\n  font-family: var(--font-display);\n  font-size: 18px;\n  font-weight: 800;\n  margin-bottom: 12px;\n  color: #ffffff;")) {
  content = content.replace(".feature-card-title {\n  font-family: var(--font-display);\n  font-size: 18px;\n  font-weight: 800;\n  margin-bottom: 12px;\n  color: #ffffff;", ".feature-card-title {\n  font-family: var(--font-display);\n  font-size: 18px;\n  font-weight: 800;\n  margin-bottom: 12px;\n  color: var(--premium-midnight);");
}

fs.writeFileSync("frontend/src/landing.css", content, "utf8");

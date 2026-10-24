const fs = require("fs");
let content = fs.readFileSync("frontend/src/landing.css", "utf8");

content = content.replace(
  /\.btn-primary-yellow \{\s*background-color: var\(--premium-blue\);\s*color: #ffffff;/s,
  ".btn-primary-yellow {\n  background: linear-gradient(135deg, #F6C84C 0%, #F59E0B 100%);\n  color: #0c1626;\n  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);"
);

// Fallback
if (!content.includes("#F6C84C 0%")) {
  content = content.replace(
    ".btn-primary-yellow {\n  background-color: var(--premium-blue);\n  color: #ffffff;\n  font-weight: 700;\n  padding: 12px 24px;",
    ".btn-primary-yellow {\n  background: linear-gradient(135deg, #F6C84C 0%, #F59E0B 100%);\n  color: #0c1626;\n  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);\n  font-weight: 700;\n  padding: 12px 24px;"
  );
}

fs.writeFileSync("frontend/src/landing.css", content, "utf8");

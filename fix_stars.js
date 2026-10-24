const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/LandingPage.jsx", "utf8");
content = content.replace(
  "<div className=\"trust-subtext\" style={{ color: 'var(--premium-yellow)' }}>â˜…â˜…â˜…â˜…â˜…</div>",
  "<div className=\"trust-subtext\" style={{ color: 'var(--premium-yellow)' }}>★ ★ ★ ★ ★</div>"
);

// If that doesn't match due to exact encoding issues in Node's buffer read, we use regex.
content = content.replace(/<div className="trust-subtext" style={{ color: 'var\(--premium-yellow\)' }}>.*?<\/div>/, "<div className=\"trust-subtext\" style={{ color: 'var(--premium-yellow)' }}>★★★★★</div>");

fs.writeFileSync("frontend/src/pages/LandingPage.jsx", content, "utf8");

const fs = require("fs");
let content = fs.readFileSync("frontend/src/landing.css", "utf8");

// Fix .section-title
content = content.replace(
  /\.section-title \{\s*font-family: var\(--font-display\);\s*font-size: 40px;\s*font-weight: 800;\s*color: var\(--premium-yellow\);/s,
  ".section-title {\n  font-family: var(--font-display);\n  font-size: 40px;\n  font-weight: 800;\n  color: var(--premium-midnight);"
);

// Fix .feature-card-header
content = content.replace(
  /\.feature-card-header \{\s*font-size: 18px;\s*font-weight: 800;\s*margin-bottom: 12px;\s*color: var\(--premium-yellow\);/s,
  ".feature-card-header {\n  font-size: 18px;\n  font-weight: 800;\n  margin-bottom: 12px;\n  color: var(--premium-midnight);"
);

// Fix .step-header
content = content.replace(
  /\.step-header \{\s*font-size: 22px;\s*font-weight: 800;\s*margin-bottom: 12px;\s*color: var\(--premium-yellow\);/s,
  ".step-header {\n  font-size: 22px;\n  font-weight: 800;\n  margin-bottom: 12px;\n  color: var(--premium-midnight);"
);

// Fix .hero-title
content = content.replace(
  /\.hero-title \{\s*color: var\(--premium-yellow\);/s,
  ".hero-title {\n  color: #ffffff;"
);

// Fix .hero-title span
content = content.replace(
  /\.hero-title span \{\s*color: var\(--premium-yellow\);/s,
  ".hero-title span {\n  color: #ffffff;"
);

// Fix .hero-badge
content = content.replace(
  /border: 1px solid rgba\(246, 200, 76, 0\.5\);\s*color: var\(--premium-yellow\);/s,
  "border: 1px solid rgba(255, 255, 255, 0.5);\n  color: #ffffff;"
);

// Fix .btn-primary-yellow
content = content.replace(
  /\.btn-primary-yellow \{\s*background-color: var\(--premium-yellow\);\s*color: var\(--premium-text\);/s,
  ".btn-primary-yellow {\n  background-color: var(--premium-blue);\n  color: #ffffff;"
);

// Fix .nav-link:hover
content = content.replace(
  /\.nav-link:hover \{\s*color: var\(--premium-yellow\);/s,
  ".nav-link:hover {\n  color: #ffffff;"
);

fs.writeFileSync("frontend/src/landing.css", content, "utf8");

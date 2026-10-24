const fs = require("fs");
let content = fs.readFileSync("frontend/src/index.css", "utf8");

content = content.replace(
  "position: sticky;\n  top: 0;\n  height: 100vh;",
  "position: sticky;\n  top: 0;\n  height: 100vh;\n  overflow-y: auto;\n  scrollbar-width: thin;\n  scrollbar-color: rgba(255,255,255,0.2) transparent;"
);

// If the above replace didn't hit exactly:
if (!content.includes("overflow-y: auto")) {
  content = content.replace(/position: sticky;.*?height: 100vh;/s, "position: sticky;\n  top: 0;\n  height: 100vh;\n  overflow-y: auto;\n  scrollbar-width: thin;\n  scrollbar-color: rgba(255,255,255,0.2) transparent;");
}

fs.writeFileSync("frontend/src/index.css", content, "utf8");

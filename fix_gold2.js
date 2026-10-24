const fs = require("fs");
let content = fs.readFileSync("frontend/src/landing.css", "utf8");

let lines = content.split("\n");

// Replace line 426
if (lines[426].includes("premium-yellow")) lines[426] = lines[426].replace("var(--premium-yellow)", "#ffffff");

// Replace line 492
if (lines[492].includes("premium-yellow")) lines[492] = lines[492].replace("var(--premium-yellow)", "var(--premium-midnight)");

// Replace line 688
if (lines[688].includes("premium-yellow")) lines[688] = lines[688].replace("var(--premium-yellow)", "var(--premium-blue)");

fs.writeFileSync("frontend/src/landing.css", lines.join("\n"), "utf8");

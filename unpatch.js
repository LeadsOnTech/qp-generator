const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

// Remove the broken patch block entirely
const badBlock = /  \/\/ Auto-subscript chemical[\s\S]*?    \}\);/g;
content = content.replace(badBlock, '');

// Also clean up the double const node... if any
content = content.replace(/_{const node = mathDocument[^}]*\}/g, '_{$$&}'); // Just to be safe, but wait, I just removed the whole block. Let's see if that's enough.

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");

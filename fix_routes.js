const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/questions.js", "utf8");

// Remove the endpoints I just added
const parts = content.split("/**\n * PUT /api/questions/:id\n */");
if (parts.length > 1) {
  content = parts[0];
}
// Make sure to add module.exports = router; back
content += "\nmodule.exports = router;\n";

fs.writeFileSync("backend/src/routes/questions.js", content, "utf8");

const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/papers.js", "utf8");
content = content.replace("router.delete('/:id', requireAuth, async (req, res) => {", "router.delete('/:id', async (req, res) => {");
fs.writeFileSync("backend/src/routes/papers.js", content, "utf8");

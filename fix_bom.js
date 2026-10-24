const fs = require("fs");
let content = fs.readFileSync("backend/prisma/schema.prisma", "utf8");
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
fs.writeFileSync("backend/prisma/schema.prisma", content, "utf8");

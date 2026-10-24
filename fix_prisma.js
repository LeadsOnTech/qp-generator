const fs = require("fs");
let content = fs.readFileSync("backend/prisma/schema.prisma", "utf8");
content = content.replace(/Ã¢â‚¬"/g, "—");
content = content.replace(/Ã¢"šÂ¹/g, "₹");
fs.writeFileSync("backend/prisma/schema.prisma", content, "utf8");

const fs = require("fs");
let content = fs.readFileSync("backend/prisma/schema.prisma", "utf8");
// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
// check if model WhatsAppVerification exists
if (!content.includes("model WhatsAppVerification")) {
  content += `\n
model WhatsAppVerification {
  id        String   @id @default(cuid())
  phone     String   @unique
  otp       String
  expiresAt DateTime
  verified  Boolean  @default(false)
  attempts  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
  fs.writeFileSync("backend/prisma/schema.prisma", content, "utf8");
} else {
  fs.writeFileSync("backend/prisma/schema.prisma", content, "utf8"); // Just save without BOM
}

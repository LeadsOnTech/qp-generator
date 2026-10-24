const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const count = await prisma.question.count();
  console.log("Total questions:", count);
}
run().finally(() => prisma.$disconnect());

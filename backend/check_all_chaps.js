const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const chapters = await prisma.chapter.findMany();
  chapters.forEach(c => console.log(c.name));
}
run().finally(() => prisma.$disconnect());

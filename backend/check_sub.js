const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const chap = await prisma.chapter.findFirst({
    where: { name: "Newton's Laws and Linear Momentum" },
    include: { subject: true }
  });
  console.log(chap.subject.name, chap.subject.id);
}
run().finally(() => prisma.$disconnect());

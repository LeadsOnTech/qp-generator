const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const qs = await prisma.question.findMany({
    where: { questionText: { contains: "restitution" } },
    include: { chapter: true, topic: true }
  });
  qs.forEach(q => console.log(q.id, q.chapter.name, q.topic?.name));
}
run().finally(() => prisma.$disconnect());

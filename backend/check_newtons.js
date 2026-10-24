const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const qs = await prisma.question.findMany({
    where: { chapter: { contains: "Newton" } },
    select: { id: true, questionText: true, chapter: true, topic: true }
  });
  console.log(`Found ${qs.length} questions in Newton's Laws.`);
  
  const collisionQs = qs.filter(q => q.questionText.toLowerCase().includes("collision") || q.questionText.toLowerCase().includes("restitution") || q.questionText.toLowerCase().includes("impulse"));
  console.log(`Found ${collisionQs.length} questions about collisions/impulse in this chapter.`);
}
run().finally(() => prisma.$disconnect());

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const chapterName = "Work, Energy and Power";
  
  // Ensure Subject (Physics)
  const physics = await prisma.subject.findFirst({ where: { name: "Physics" } });
  if (!physics) { console.log("Physics subject not found!"); return; }

  // Ensure Chapter exists
  let targetChapter = await prisma.chapter.findFirst({ where: { name: chapterName } });
  if (!targetChapter) {
    targetChapter = await prisma.chapter.create({
      data: { name: chapterName, subjectId: physics.id }
    });
  }

  // Ensure Topic exists
  let targetTopic = await prisma.topic.findFirst({ where: { name: "Collisions and Impulse", chapterId: targetChapter.id } });
  if (!targetTopic) {
    targetTopic = await prisma.topic.create({
      data: { name: "Collisions and Impulse", chapterId: targetChapter.id }
    });
  }

  // Find all Newton's laws questions
  const sourceChapter = await prisma.chapter.findFirst({ where: { name: { contains: "Newton" } } });
  if (!sourceChapter) return;

  const qs = await prisma.question.findMany({ where: { chapterId: sourceChapter.id } });
  
  let movedCount = 0;
  for (let q of qs) {
    const text = q.questionText.toLowerCase();
    if (text.includes("collision") || text.includes("restitution") || text.includes("impulse") || text.includes("bounces")) {
      await prisma.question.update({
        where: { id: q.id },
        data: { chapterId: targetChapter.id, topicId: targetTopic.id }
      });
      movedCount++;
    }
  }

  console.log(`Moved ${movedCount} collision questions to 'Work, Energy and Power' -> 'Collisions and Impulse'.`);
}
run().finally(() => prisma.$disconnect());

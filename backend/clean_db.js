const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clean() {
  console.log("Starting DB wipe...");
  await prisma.paperQuestion.deleteMany({});
  console.log("Cleared PaperQuestion");
  await prisma.paper.deleteMany({});
  console.log("Cleared Paper");
  await prisma.question.deleteMany({});
  console.log("Cleared Question");
  await prisma.uploadBatch.deleteMany({});
  console.log("Cleared UploadBatch");
  await prisma.topic.deleteMany({});
  console.log("Cleared Topic");
  await prisma.chapter.deleteMany({});
  console.log("Cleared Chapter");
  await prisma.subject.deleteMany({});
  console.log("Cleared Subject");
  await prisma.exam.deleteMany({});
  console.log("Cleared Exam");
  console.log("Wipe complete!");
}

clean().catch(console.error).finally(() => prisma.$disconnect());

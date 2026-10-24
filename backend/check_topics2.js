const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const chapters = await prisma.chapter.findMany({
    include: { topics: true }
  });
  const chapter = chapters.find(c => c.name.toLowerCase().includes("newton"));
  if (chapter) {
    console.log("Chapter:", chapter.name);
    console.log("Topics:", chapter.topics.map(t => t.name).join(", "));
  } else {
    console.log("No chapter found.");
  }
}
run().finally(() => prisma.$disconnect());

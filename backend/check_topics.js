const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const chapter = await prisma.chapter.findFirst({
    where: { name: { contains: "newton", mode: "insensitive" } },
    include: { topics: true }
  });
  if (chapter) {
    console.log("Chapter:", chapter.name);
    console.log("Topics:", chapter.topics.map(t => t.name).join(", "));
  } else {
    console.log("No chapter found.");
  }
}
run().finally(() => prisma.$disconnect());

const prisma = require("./src/db");
async function run() {
  const qs = await prisma.question.findMany({
    where: {
      chapter: { name: "Haloalkanes and Haloarenes" }
    },
    select: {
      id: true,
      questionText: true,
      imageFilename: true,
      sourceFileName: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true
    }
  });
  console.log("Haloalkanes questions in DB:", qs.length);
  for (const q of qs.slice(0, 5)) {
    console.log({
      text: q.questionText.slice(0, 50),
      imageFilename: q.imageFilename,
      optionA: q.optionA,
      optionB: q.optionB
    });
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());

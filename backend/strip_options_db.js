const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function stripOptionPrefix(text) {
  if (!text) return text;
  const r1 = /^\s*(?:\([1-4a-dA-D]\)\s*)/i;
  const r2 = /^\s*(?:[1-4a-dA-D][\.\)]\s+)/i;
  const r3 = /^\s*(?:[1-4a-dA-D][\.\)])$/i;

  let stripped = text;
  if (r1.test(text)) stripped = text.replace(r1, '');
  else if (r2.test(text)) stripped = text.replace(r2, '');
  else if (r3.test(text)) stripped = text.replace(r3, '');
  
  return stripped.trim() || text.trim();
}

async function run() {
  const questions = await prisma.question.findMany();
  let updated = 0;
  for (const q of questions) {
    const nA = stripOptionPrefix(q.optionA);
    const nB = stripOptionPrefix(q.optionB);
    const nC = stripOptionPrefix(q.optionC);
    const nD = stripOptionPrefix(q.optionD);
    
    if (nA !== q.optionA || nB !== q.optionB || nC !== q.optionC || nD !== q.optionD) {
      await prisma.question.update({
        where: { id: q.id },
        data: { optionA: nA, optionB: nB, optionC: nC, optionD: nD }
      });
      updated++;
    }
  }
  console.log(`Updated ${updated} questions.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'file:' + path.resolve(__dirname, '../prisma/dev.db') } }
});

async function resetClean() {
  console.log('--- Cleaning all questions, batches, papers, and taxonomy ---');

  // 1. Delete Paper Questions and Papers
  const pq = await prisma.paperQuestion.deleteMany({});
  console.log(`Deleted ${pq.count} paper question links.`);

  const p = await prisma.paper.deleteMany({});
  console.log(`Deleted ${p.count} generated papers.`);

  // 2. Delete all Questions
  const q = await prisma.question.deleteMany({});
  console.log(`Deleted ${q.count} questions.`);

  // 3. Delete all Upload Batches (clears Recent Upload History)
  const b = await prisma.uploadBatch.deleteMany({});
  console.log(`Deleted ${b.count} upload batch logs.`);

  // 4. Delete Taxonomy (Topics, Chapters, Subjects, Exams)
  const t = await prisma.topic.deleteMany({});
  console.log(`Deleted ${t.count} topics.`);

  const c = await prisma.chapter.deleteMany({});
  console.log(`Deleted ${c.count} chapters.`);

  const s = await prisma.subject.deleteMany({});
  console.log(`Deleted ${s.count} subjects.`);

  const e = await prisma.exam.deleteMany({});
  console.log(`Deleted ${e.count} exams.`);

  // 5. Clean out test images from backend/uploads/images
  const imgDir = path.resolve(__dirname, '../uploads/images');
  if (fs.existsSync(imgDir)) {
    const files = fs.readdirSync(imgDir);
    let removedImgCount = 0;
    for (const file of files) {
      fs.unlinkSync(path.join(imgDir, file));
      removedImgCount++;
    }
    console.log(`Removed ${removedImgCount} test images from uploads/images.`);
  }

  console.log('\n--- Running clean seed (NEET & EAPCET starter exams, Admin account) ---');
  require('../prisma/seed');
}

resetClean().catch(console.error);

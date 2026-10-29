const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'file:' + path.resolve(__dirname, '../prisma/dev.db') } }
});
const { parseSpreadsheet, validateHeaders, validateRow } = require('../src/lib/extract');
const { makeCaches, resolveTaxonomy } = require('../src/lib/syllabusMaster');

async function importFile(filePath, isDiagram = false) {
  const fileName = path.basename(filePath);
  console.log('Processing:', fileName);
  const buf = fs.readFileSync(filePath);
  const { rows, headerMap } = parseSpreadsheet(buf);
  validateHeaders(headerMap);

  const caches = makeCaches();
  let success = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const { ok, errors, data } = validateRow(rows[i], rowNum);
    if (!ok) {
      console.warn('Row error in', fileName, 'row', rowNum, errors);
      continue;
    }

    // Check duplicate
    const existing = await prisma.question.findFirst({
      where: { questionText: data.questionText, isActive: true }
    });
    if (existing) {
      skipped++;
      continue;
    }

    const { chapter, topic } = await resolveTaxonomy(data, caches);

    await prisma.question.create({
      data: {
        questionText: data.questionText,
        optionA: data.optionA,
        optionB: data.optionB,
        optionC: data.optionC,
        optionD: data.optionD,
        correctOption: data.correctOption,
        questionType: data.questionType || (isDiagram ? 'DIAGRAM_BASED' : 'MCQ'),
        difficulty: data.difficulty || 'MEDIUM',
        difficultySource: 'HUMAN_REVIEWED',
        chapterId: chapter.id,
        topicId: topic ? topic.id : null,
        ownerInstituteId: null,
        sharedGlobally: true,
        verificationLevel: 'AIA_VERIFIED',
        imageFilename: data.imageFilename || null,
        optionAImage: data.optionAImage || null,
        optionBImage: data.optionBImage || null,
        optionCImage: data.optionCImage || null,
        optionDImage: data.optionDImage || null,
        solutionText: data.solutionText || null,
        examYear: data.examYear || null,
        examSource: data.examSource || null,
        sourceFileName: fileName,
        sourceRow: rowNum,
        workflowState: 'BANK',
        isActive: true,
      }
    });
    success++;
  }

  console.log('Finished', fileName, '-> Success:', success, 'Skipped:', skipped);
  return { success, skipped };
}

async function run() {
  console.log('--- 1. Importing Diagram Questions ---');
  const diagramFile = 'C:/Users/Sharifuddin Shaik/Downloads/zDiagrams/Physics_Alternating_Current_Diagram_Questions_12Q/Physics_Alternating_Current_Diagram_Questions_12Q.xlsx';
  await importFile(diagramFile, true);

  console.log('--- 2. Importing Chapter Text Files ---');
  const textDir = 'C:/Users/Sharifuddin Shaik/Downloads/Physics_Ch24_Alternating_Current/1_Chapter_Files';
  const files = fs.readdirSync(textDir).filter(f => f.endsWith('.xlsx'));
  let totalTextSuccess = 0;
  for (const f of files) {
    const res = await importFile(path.join(textDir, f), false);
    totalTextSuccess += res.success;
  }

  console.log('=== All Alternating Current Imports Complete ===');
  console.log('Total Text Questions Added:', totalTextSuccess);

  // Check new stats
  const physicsCount = await prisma.question.count({
    where: {
      chapter: { subject: { name: 'Physics', exam: { name: 'EAPCET' } } },
      workflowState: 'BANK',
      isActive: true
    }
  });
  console.log('Total Active Physics Bank Questions in EAPCET DB now:', physicsCount);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

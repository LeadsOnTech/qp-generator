const { runAIBackgroundAudit } = require('../lib/autoQCAuditor');
const { distributeQuestionToExams, distributeAllExistingQuestions } = require('../lib/multiExamSync');
const { extractImageFilenames, purgeUnreferencedImages } = require('../lib/diagramCleaner');
const express = require('express');
const multer = require('multer');
const prisma = require('../db');
const { parseSpreadsheet, validateHeaders, validateRow } = require('../lib/extract');
const { makeCaches, resolveTaxonomy } = require('../lib/syllabusMaster');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB — typed files only, should be small
});

const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'];

function getExtension(filename) {
  const parts = filename.split('.');
  return parts[parts.length - 1].toLowerCase();
}

/**
 * POST /api/upload
 * Body: multipart/form-data with field "file"
 * Optional query: ?ownerInstituteId=xxx&sharedGlobally=true|false
 *
 * Accepts .xlsx / .xls / .csv only (Phase 1 deliberately excludes scanned PDFs).
 * Every row is validated independently — a bad row is skipped and logged,
 * it never blocks the rest of the batch from importing.
 */
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Attach a file under field name "file".' });
  }
  
  const crypto = require('crypto');
  const uploadBatchId = crypto.randomUUID();

  const ext = getExtension(req.file.originalname);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({
      error: `Unsupported file type ".${ext}". Phase 1 accepts typed .xlsx, .xls, or .csv only ` +
             `(scanned/image PDFs are not supported — please export typed content to Excel/CSV instead).`,
    });
  }

  const ownerInstituteId = req.query.ownerInstituteId || null;
  const sharedGlobally = req.query.sharedGlobally !== 'false'; // default true, contributor opts out explicitly
  const uploadedBy = req.query.uploadedBy || (ownerInstituteId ? ownerInstituteId : 'AIA');

  let rows, headerMap;
  try {
    const parsed = parseSpreadsheet(req.file.buffer);
    rows = parsed.rows;
    headerMap = parsed.headerMap;
    if (rows.length === 0) {
      return res.status(400).json({ error: 'The file appears to be empty (no data rows found).' });
    }
    validateHeaders(headerMap);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const caches = makeCaches();
  const rowErrors = [];
  let successCount = 0;
  const hasOptionsInFile = 'optiona' in headerMap || 'optionb' in headerMap || 'optionc' in headerMap || 'optiond' in headerMap;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +2 to account for 1-indexing and header row
    const { ok, errors, data } = validateRow(rows[i], rowNum, hasOptionsInFile);

    if (!ok) {
      rowErrors.push({ row: rowNum, errors });
      continue;
    }

    try {
      const { chapter, topic } = await resolveTaxonomy(data, caches);

      // If the chapter has been marked REMOVED in the Syllabus Master,
      // we still store the question (never throw away typed data) but
      // it will be excluded from paper generation by default — this is
      // the "auto-filter deleted syllabus" behaviour from planning.
      const createdQ = await prisma.question.create({
        data: {
          questionText: data.questionText,
          optionA: data.optionA,
          optionB: data.optionB,
          optionC: data.optionC,
          optionD: data.optionD,
          correctOption: data.correctOption,
          questionType: data.questionType,
          difficulty: data.difficulty,
          difficultySource: data.difficulty === 'UNTAGGED' ? 'NONE' : 'HUMAN_REVIEWED',
          chapterId: chapter.id,
          topicId: topic ? topic.id : null,
          ownerInstituteId,
          sharedGlobally: ownerInstituteId ? sharedGlobally : true,
          verificationLevel: ownerInstituteId ? 'COMMUNITY_CONTRIBUTED' : 'AIA_VERIFIED',
          imageFilename: data.imageFilename || null,
          optionAImage: data.optionAImage || null,
          optionBImage: data.optionBImage || null,
          optionCImage: data.optionCImage || null,
          optionDImage: data.optionDImage || null,
          solutionText: data.solutionText || null,
          examYear: data.examYear || null,
          examSource: data.examSource || null,
          sourceFileName: req.file.originalname,
          sourceRow: rowNum,
          workflowState: 'BANK',
          uploadBatchId,
        },
      });
      await distributeQuestionToExams(createdQ.id, data.examName || req.body.exam);
      successCount++;
    } catch (err) {
      rowErrors.push({ row: rowNum, errors: [`Database error: ${err.message}`] });
    }
  }

  // Ensure full multi-exam distribution across AP EAPCET, TG EAPCET, and KCET
  if (successCount > 0) {
    distributeAllExistingQuestions().catch((err) => console.error('Post-upload exam sync error:', err));
  }

  const batch = await prisma.uploadBatch.create({
    data: {
      id: uploadBatchId,
      fileName: req.file.originalname,
      fileType: ext,
      totalRows: rows.length,
      successCount,
      errorCount: rowErrors.length,
      errors: rowErrors.length > 0 ? JSON.stringify(rowErrors) : null,
      uploadedBy,
    },
  });

  // TRIGGER AI QC IN BACKGROUND
  runAIBackgroundAudit(batch.id).catch(err => console.error("Background QC error:", err));
  
  res.json({
    batchId: batch.id,
    fileName: req.file.originalname,
    totalRows: rows.length,
    successCount,
    errorCount: rowErrors.length,
    errors: rowErrors, // full detail so the uploader can fix and re-upload just the bad rows
  });
});

/**
 * Helper to delete all questions belonging to specified batches or source filenames,
 * and automatically purge any unreferenced diagram images from disk.
 */
async function deleteQuestionsForBatches(batchIds = [], fileNames = []) {
  const whereOr = [];
  if (Array.isArray(batchIds) && batchIds.length > 0) {
    whereOr.push({ uploadBatchId: { in: batchIds } });
  }
  if (Array.isArray(fileNames) && fileNames.length > 0) {
    whereOr.push({ sourceFileName: { in: fileNames } });
  }
  if (whereOr.length === 0) return 0;

  const questions = await prisma.question.findMany({
    where: { OR: whereOr },
    select: {
      id: true,
      imageFilename: true,
      optionAImage: true,
      optionBImage: true,
      optionCImage: true,
      optionDImage: true,
    },
  });
  const questionIds = questions.map((q) => q.id);
  const imageFiles = extractImageFilenames(questions);

  if (questionIds.length > 0) {
    // Delete child relationships before deleting questions
    await prisma.paperQuestion.deleteMany({ where: { questionId: { in: questionIds } } }).catch(() => {});
    await prisma.questionExamMapping.deleteMany({ where: { questionId: { in: questionIds } } }).catch(() => {});
    await prisma.cbtSubmission.deleteMany({ where: { questionId: { in: questionIds } } }).catch(() => {});
    await prisma.question.deleteMany({ where: { id: { in: questionIds } } });

    // Automatically purge diagram images that are no longer referenced by any remaining question
    await purgeUnreferencedImages(imageFiles, questionIds).catch((err) => {
      console.error('Error purging batch diagram images:', err);
    });
  }

  return questionIds.length;
}

/**
 * GET /api/upload/batches — recent upload history (audit trail)
 */
router.get('/batches', async (req, res) => {
  const take = req.query.limit === 'all' ? 500 : (parseInt(req.query.limit, 10) || 100);
  const batches = await prisma.uploadBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json(batches.map((b) => ({
    ...b,
    errors: b.errors ? JSON.parse(b.errors) : [],
  })));
});

/**
 * DELETE /api/upload/batches/:id
 * Removes an upload batch log from history AND cascade deletes all questions imported with it.
 */
router.delete('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await prisma.uploadBatch.findUnique({ where: { id } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    // Cascade delete all questions linked to this batch or filename
    const deletedQuestions = await deleteQuestionsForBatches([id], [batch.fileName]);

    // Delete the upload batch record
    await prisma.uploadBatch.delete({ where: { id } });

    res.json({
      success: true,
      deletedQuestions,
      message: `Batch "${batch.fileName}" and all ${deletedQuestions} associated question(s) were successfully deleted.`,
    });
  } catch (err) {
    console.error('Failed to delete upload batch:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/upload/batches/bulk-delete
 * Body: { batchIds: string[] }
 * Deletes multiple upload batches and all questions imported with them.
 */
router.post('/batches/bulk-delete', async (req, res) => {
  try {
    const { batchIds } = req.body;
    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      return res.status(400).json({ error: 'batchIds must be a non-empty array of IDs.' });
    }

    const batches = await prisma.uploadBatch.findMany({
      where: { id: { in: batchIds } },
      select: { id: true, fileName: true },
    });

    const ids = batches.map((b) => b.id);
    const fileNames = batches.map((b) => b.fileName);

    const deletedQuestions = await deleteQuestionsForBatches(ids, fileNames);
    await prisma.uploadBatch.deleteMany({ where: { id: { in: ids } } });

    res.json({
      success: true,
      deletedBatches: ids.length,
      deletedQuestions,
      message: `Successfully deleted ${ids.length} batch(es) and ${deletedQuestions} question(s) from the Question Bank.`,
    });
  } catch (err) {
    console.error('Failed to bulk delete upload batches:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/upload/batches/purge-by-keyword
 * Body: { keyword: string } e.g. "JEE"
 * Finds all batches matching the keyword and purges both the batches and all questions from the database.
 */
router.post('/batches/purge-by-keyword', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return res.status(400).json({ error: 'keyword is required (e.g. "JEE").' });
    }

    const kw = keyword.trim().toLowerCase();
    const allBatches = await prisma.uploadBatch.findMany({ select: { id: true, fileName: true } });
    const matchingBatches = allBatches.filter((b) => b.fileName && b.fileName.toLowerCase().includes(kw));

    const batchIds = matchingBatches.map((b) => b.id);
    const fileNames = matchingBatches.map((b) => b.fileName);

    // Also find any questions that have sourceFileName or examSource matching the keyword
    const allQuestions = await prisma.question.findMany({
      select: { id: true, sourceFileName: true, examSource: true },
    });
    const extraQuestions = allQuestions.filter((q) => {
      const sFile = (q.sourceFileName || '').toLowerCase();
      const sExam = (q.examSource || '').toLowerCase();
      return sFile.includes(kw) || sExam.includes(kw);
    });
    const allQuestionIds = [...new Set([...batchIds, ...extraQuestions.map((q) => q.id)])];

    let deletedQuestions = 0;
    if (allQuestionIds.length > 0) {
      await prisma.paperQuestion.deleteMany({ where: { questionId: { in: allQuestionIds } } }).catch(() => {});
      await prisma.questionExamMapping.deleteMany({ where: { questionId: { in: allQuestionIds } } }).catch(() => {});
      await prisma.cbtSubmission.deleteMany({ where: { questionId: { in: allQuestionIds } } }).catch(() => {});
      const delRes = await prisma.question.deleteMany({ where: { id: { in: allQuestionIds } } });
      deletedQuestions = delRes.count;
    }

    // Also delete any remaining questions from the batches
    if (batchIds.length > 0 || fileNames.length > 0) {
      deletedQuestions += await deleteQuestionsForBatches(batchIds, fileNames);
      await prisma.uploadBatch.deleteMany({ where: { id: { in: batchIds } } });
    }

    res.json({
      success: true,
      deletedBatches: batchIds.length,
      deletedQuestions,
      message: `Purged ${batchIds.length} batch(es) and ${deletedQuestions} question(s) matching "${keyword}".`,
    });
  } catch (err) {
    console.error('Failed to purge batches by keyword:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const { runAIBackgroundAudit } = require('../lib/autoQCAuditor');
const { distributeQuestionToExams, distributeAllExistingQuestions } = require('../lib/multiExamSync');
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

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +2 to account for 1-indexing and header row
    const { ok, errors, data } = validateRow(rows[i], rowNum);

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
 * GET /api/upload/batches — recent upload history (audit trail)
 */
router.get('/batches', async (req, res) => {
  const batches = await prisma.uploadBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(batches.map((b) => ({
    ...b,
    errors: b.errors ? JSON.parse(b.errors) : [],
  })));
});


/**
 * DELETE /api/upload/batches/:id
 * Removes an upload batch log from the history.
 */
router.delete('/batches/:id', async (req, res) => {
  try {
    await prisma.uploadBatch.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: 'Batch not found' });
  }
});

module.exports = router;

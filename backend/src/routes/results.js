// backend/src/routes/results.js
// Authenticated routes for Exam Results, Scorecards, PDF Downloads, and WhatsApp Parent Notifications.

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../db');

// Setup upload folder for student passport photos
const STUDENT_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'students');
fs.mkdirSync(STUDENT_UPLOAD_DIR, { recursive: true });

const studentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STUDENT_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `student-${uniqueSuffix}${cleanExt}`);
  },
});

const studentPhotoUpload = multer({
  storage: studentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files (JPG, PNG, WebP) are allowed.'));
    }
    cb(null, true);
  },
});
const {
  evaluateStudentResult,
  assignCohortRanks,
  generateResultToken,
} = require('../lib/resultEngine');
const { buildStudentPerformancePdf } = require('../lib/studentReportPdf');
const { buildBatchPerformancePdf } = require('../lib/batchReportPdf');
const {
  sendResultWhatsAppNotification,
  compileWhatsAppMessage,
  maskPhoneNumber,
  normalizePhoneNumber,
  DEFAULT_COST_PER_MESSAGE_INR,
} = require('../lib/whatsappResultService');

/**
 * Helper to fetch ordered questions for a paper with Subject and Chapter metadata.
 */
async function getPaperOrderedQuestions(paperId) {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          question: {
            include: {
              chapter: {
                include: {
                  subject: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!paper) return null;

  return paper.questions.map((pq, idx) => ({
    ...pq.question,
    order: pq.order || idx + 1,
    subjectName: pq.question.chapter?.subject?.name || null,
    chapterName: pq.question.chapter?.name || null,
  }));
}

/**
 * POST /api/results/generate-from-cbt/:cbtTestId
 * Approves and generates official ExamResult records from all submissions of a CBT test.
 */
router.post('/generate-from-cbt/:cbtTestId', async (req, res) => {
  try {
    const { cbtTestId } = req.params;
    const instituteId = req.user.role === 'ADMIN' ? req.body.instituteId : req.user.instituteId;

    const test = await prisma.cbtTest.findUnique({
      where: { id: cbtTestId },
      include: {
        paper: {
          include: { institute: true },
        },
        submissions: {
          where: { isVerifiedStudent: true }, // Only verified students
        },
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'CBT Test not found' });
    }

    if (req.user.role !== 'ADMIN' && test.instituteId && test.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized: Test belongs to another institute' });
    }

    const targetInstituteId = test.instituteId || instituteId || test.paper?.instituteId;
    if (!targetInstituteId) {
      return res.status(400).json({ error: 'No associated institute found for this test' });
    }

    const questions = await getPaperOrderedQuestions(test.paperId);
    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: 'Paper has no questions to evaluate' });
    }

    const submissions = test.submissions;
    if (submissions.length === 0) {
      return res.status(400).json({ error: 'No student submissions found to generate results' });
    }

    // 1. Evaluate individual submissions and link with StudentProfile roster
    const evaluatedList = await Promise.all(submissions.map(async (sub) => {
      let answers = {};
      try {
        answers = sub.answersJson ? JSON.parse(sub.answersJson) : {};
      } catch {
        answers = {};
      }

      const evalData = evaluateStudentResult(questions, answers, {
        positiveMarks: test.positiveMarks,
        negativeMarks: test.negativeMarks,
      });

      const normRoll = String(sub.rollNumber).trim().toUpperCase();

      // Look up student profile from enrolled roster
      const profile = await prisma.studentProfile.findUnique({
        where: {
          instituteId_rollNumber: {
            instituteId: targetInstituteId,
            rollNumber: normRoll,
          },
        },
      });

      const rawPhone = sub.studentPhone || profile?.parentPhone || null;
      const parentPhone = rawPhone ? normalizePhoneNumber(rawPhone) : null;

      return {
        submissionId: sub.id,
        studentName: sub.studentName || profile?.fullName,
        rollNumber: normRoll,
        batchName: sub.section || profile?.batchName || 'General',
        section: sub.section || profile?.section,
        parentPhone,
        studentProfileId: profile?.id || null,
        evalData,
        marksObtained: evalData.marksObtained,
        accuracyPercentage: evalData.accuracyPercentage,
        negativeMarksDeducted: evalData.negativeMarksDeducted,
      };
    }));

    // 2. Assign cohort ranks with tie-breaking rules
    const rankedCohort = assignCohortRanks(evaluatedList, test.examName);

    // 3. Persist ExamResult and breakdown records
    const createdResultIds = [];

    for (const item of rankedCohort) {
      const { evalData } = item;

      // Check if result already exists for this test and roll number
      const existing = await prisma.examResult.findFirst({
        where: {
          instituteId: targetInstituteId,
          paperId: test.paperId,
          rollNumber: item.rollNumber,
        },
      });

      // Ensure student profile exists in roster
      let studentProfileId = item.studentProfileId;
      try {
        const prof = await prisma.studentProfile.upsert({
          where: {
            instituteId_rollNumber: {
              instituteId: targetInstituteId,
              rollNumber: item.rollNumber,
            },
          },
          update: {
            fullName: item.studentName || undefined,
            parentPhone: item.parentPhone || undefined,
            batchName: item.batchName !== 'General' ? item.batchName : undefined,
          },
          create: {
            instituteId: targetInstituteId,
            rollNumber: item.rollNumber,
            fullName: item.studentName,
            batchName: item.batchName || 'General',
            section: item.section || null,
            parentPhone: item.parentPhone || '',
          },
        });
        studentProfileId = prof.id;
      } catch (err) {
        console.warn('Could not auto-upsert StudentProfile in CBT evaluation:', err.message);
      }

      let resultRecord;
      if (existing) {
        // Update existing result
        resultRecord = await prisma.examResult.update({
          where: { id: existing.id },
          data: {
            cbtTestId: test.id,
            studentProfileId,
            studentName: item.studentName,
            batchName: item.batchName,
            section: item.section,
            parentPhone: item.parentPhone || existing.parentPhone,
            totalQuestions: evalData.totalQuestions,
            attemptedQuestions: evalData.attemptedQuestions,
            correctAnswers: evalData.correctAnswers,
            incorrectAnswers: evalData.incorrectAnswers,
            unattemptedQuestions: evalData.unattemptedQuestions,
            maxMarks: evalData.maxMarks,
            marksObtained: evalData.marksObtained,
            negativeMarksDeducted: evalData.negativeMarksDeducted,
            percentage: evalData.percentage,
            accuracyPercentage: evalData.accuracyPercentage,
            rank: item.rank,
            totalStudents: item.totalStudents,
            academicInsight: evalData.academicInsight,
            status: 'PUBLISHED',
          },
        });

        // Clean old breakups to refresh
        await prisma.examSubjectResult.deleteMany({ where: { resultId: resultRecord.id } });
        await prisma.examChapterResult.deleteMany({ where: { resultId: resultRecord.id } });
      } else {
        // Create new result
        resultRecord = await prisma.examResult.create({
          data: {
            instituteId: targetInstituteId,
            paperId: test.paperId,
            cbtTestId: test.id,
            studentProfileId,
            studentName: item.studentName,
            rollNumber: item.rollNumber,
            batchName: item.batchName,
            section: item.section,
            parentPhone: item.parentPhone,
            examName: test.title || test.examName,
            examType: 'CBT',
            totalQuestions: evalData.totalQuestions,
            attemptedQuestions: evalData.attemptedQuestions,
            correctAnswers: evalData.correctAnswers,
            incorrectAnswers: evalData.incorrectAnswers,
            unattemptedQuestions: evalData.unattemptedQuestions,
            maxMarks: evalData.maxMarks,
            marksObtained: evalData.marksObtained,
            negativeMarksDeducted: evalData.negativeMarksDeducted,
            percentage: evalData.percentage,
            accuracyPercentage: evalData.accuracyPercentage,
            rank: item.rank,
            totalStudents: item.totalStudents,
            academicInsight: evalData.academicInsight,
            status: 'PUBLISHED',
          },
        });
      }

      // Ensure access token exists
      const existingToken = await prisma.resultAccessToken.findFirst({
        where: { resultId: resultRecord.id, isRevoked: false },
      });
      if (!existingToken) {
        await prisma.resultAccessToken.create({
          data: {
            resultId: resultRecord.id,
            token: generateResultToken(),
          },
        });
      }

      // Insert subject breakups
      if (evalData.subjectResults?.length > 0) {
        await prisma.examSubjectResult.createMany({
          data: evalData.subjectResults.map((s) => ({
            resultId: resultRecord.id,
            subjectName: s.subjectName,
            totalQuestions: s.totalQuestions,
            attemptedQuestions: s.attemptedQuestions,
            correctCount: s.correctCount,
            incorrectCount: s.incorrectCount,
            unattemptedCount: s.unattemptedCount,
            maxMarks: s.maxMarks,
            marksObtained: s.marksObtained,
            accuracyPercentage: s.accuracyPercentage,
            percentage: s.percentage,
          })),
        });
      }

      // Insert chapter breakups
      if (evalData.chapterResults?.length > 0) {
        await prisma.examChapterResult.createMany({
          data: evalData.chapterResults.map((c) => ({
            resultId: resultRecord.id,
            chapterName: c.chapterName,
            totalQuestions: c.totalQuestions,
            attemptedQuestions: c.attemptedQuestions,
            correctCount: c.correctCount,
            incorrectCount: c.incorrectCount,
            accuracyPercentage: c.accuracyPercentage,
            status: c.status,
          })),
        });
      }

      createdResultIds.push(resultRecord.id);
    }

    res.json({
      ok: true,
      message: `Successfully evaluated and generated ${rankedCohort.length} student results`,
      totalStudents: rankedCohort.length,
      topScore: rankedCohort[0]?.marksObtained || 0,
      paperId: test.paperId,
      cbtTestId: test.id,
    });
  } catch (err) {
    console.error('Failed to generate results from CBT:', err);
    res.status(500).json({ error: 'Failed to generate results: ' + err.message });
  }
});

/**
 * POST /api/results/offline-upload
 * Creates ExamResult records from an offline OMR / Excel / CSV marksheet.
 */
router.post('/offline-upload', async (req, res) => {
  try {
    const { paperId, examName, examDate, records = [], positiveMarks = 4.0, negativeMarks = 1.0 } = req.body;
    const instituteId = req.user.role === 'ADMIN' ? req.body.instituteId : req.user.instituteId;

    if (!paperId) {
      return res.status(400).json({ error: 'paperId is required' });
    }

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: { institute: true },
    });

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    const targetInstituteId = paper.instituteId || instituteId;

    if (!records || records.length === 0) {
      return res.status(400).json({ error: 'No student records provided' });
    }

    const questions = await getPaperOrderedQuestions(paperId);
    const posMark = Number(positiveMarks) || 4.0;
    const negMark = Number(negativeMarks) || 1.0;
    const totalQCount = questions?.length || 0;
    const computedMaxMarks = totalQCount * posMark;

    // Process each student record
    const processedList = records.map((r) => {
      const rollNumber = String(r.rollNumber || r.roll || '').trim().toUpperCase();
      const studentName = String(r.studentName || r.name || 'Student').trim();
      const batchName = String(r.batchName || r.batch || r.section || 'General').trim();
      const parentPhone = r.parentPhone || r.phone || null;

      // Case A: Full responses provided as { [qId or qOrder]: answer }
      if (r.answers && questions && questions.length > 0) {
        const evalData = evaluateStudentResult(questions, r.answers, {
          positiveMarks: posMark,
          negativeMarks: negMark,
        });

        return {
          studentName,
          rollNumber,
          batchName,
          parentPhone,
          evalData,
          marksObtained: evalData.marksObtained,
          accuracyPercentage: evalData.accuracyPercentage,
          negativeMarksDeducted: evalData.negativeMarksDeducted,
        };
      }

      // Case B: Direct score and breakdown numbers provided in Excel
      const marksObtained = parseFloat(r.marksObtained != null ? r.marksObtained : r.score) || 0.0;
      const maxMarks = parseFloat(r.maxMarks) || computedMaxMarks || 100.0;
      const correctAnswers = parseInt(r.correctAnswers || r.correct, 10) || 0;
      const incorrectAnswers = parseInt(r.incorrectAnswers || r.wrong, 10) || 0;
      const unattemptedQuestions = parseInt(r.unattemptedQuestions || r.unattempted, 10) || 0;
      const attemptedQuestions = correctAnswers + incorrectAnswers;

      const accuracyPercentage = attemptedQuestions > 0
        ? Math.round((correctAnswers / attemptedQuestions) * 1000) / 10
        : (parseFloat(r.accuracyPercentage) || 0.0);

      const percentage = maxMarks > 0
        ? Math.round((marksObtained / maxMarks) * 1000) / 10
        : 0.0;

      const negativeMarksDeducted = Math.round(incorrectAnswers * negMark * 100) / 100;

      const academicInsight = r.academicInsight || (
        percentage >= 75
          ? `Excellent performance (${percentage}%). Maintain consistency.`
          : percentage >= 50
          ? `Solid progress (${percentage}%). Focus on eliminating negative marks to reach 75%.`
          : `Foundational revision needed. Score is ${percentage}%. Practice Level-1 DPPs.`
      );

      return {
        studentName,
        rollNumber,
        batchName,
        parentPhone,
        evalData: {
          totalQuestions: totalQCount || (attemptedQuestions + unattemptedQuestions),
          attemptedQuestions,
          correctAnswers,
          incorrectAnswers,
          unattemptedQuestions,
          maxMarks,
          marksObtained,
          negativeMarksDeducted,
          percentage,
          accuracyPercentage,
          academicInsight,
          subjectResults: r.subjectResults || [],
          chapterResults: r.chapterResults || [],
        },
        marksObtained,
        accuracyPercentage,
        negativeMarksDeducted,
      };
    });

    // Rank cohort
    const rankedCohort = assignCohortRanks(processedList, examName || paper.examName);

    // Save records
    for (const item of rankedCohort) {
      const { evalData } = item;

      const existing = await prisma.examResult.findFirst({
        where: {
          instituteId: targetInstituteId,
          paperId,
          rollNumber: item.rollNumber,
        },
      });

      let resultRecord;
      if (existing) {
        resultRecord = await prisma.examResult.update({
          where: { id: existing.id },
          data: {
            studentName: item.studentName,
            batchName: item.batchName,
            parentPhone: item.parentPhone,
            examName: examName || paper.title,
            examType: 'OFFLINE_OMR',
            totalQuestions: evalData.totalQuestions,
            attemptedQuestions: evalData.attemptedQuestions,
            correctAnswers: evalData.correctAnswers,
            incorrectAnswers: evalData.incorrectAnswers,
            unattemptedQuestions: evalData.unattemptedQuestions,
            maxMarks: evalData.maxMarks,
            marksObtained: evalData.marksObtained,
            negativeMarksDeducted: evalData.negativeMarksDeducted,
            percentage: evalData.percentage,
            accuracyPercentage: evalData.accuracyPercentage,
            rank: item.rank,
            totalStudents: item.totalStudents,
            academicInsight: evalData.academicInsight,
            status: 'PUBLISHED',
          },
        });

        await prisma.examSubjectResult.deleteMany({ where: { resultId: resultRecord.id } });
        await prisma.examChapterResult.deleteMany({ where: { resultId: resultRecord.id } });
      } else {
        resultRecord = await prisma.examResult.create({
          data: {
            instituteId: targetInstituteId,
            paperId,
            studentName: item.studentName,
            rollNumber: item.rollNumber,
            batchName: item.batchName,
            parentPhone: item.parentPhone,
            examName: examName || paper.title,
            examType: 'OFFLINE_OMR',
            examDate: examDate ? new Date(examDate) : new Date(),
            totalQuestions: evalData.totalQuestions,
            attemptedQuestions: evalData.attemptedQuestions,
            correctAnswers: evalData.correctAnswers,
            incorrectAnswers: evalData.incorrectAnswers,
            unattemptedQuestions: evalData.unattemptedQuestions,
            maxMarks: evalData.maxMarks,
            marksObtained: evalData.marksObtained,
            negativeMarksDeducted: evalData.negativeMarksDeducted,
            percentage: evalData.percentage,
            accuracyPercentage: evalData.accuracyPercentage,
            rank: item.rank,
            totalStudents: item.totalStudents,
            academicInsight: evalData.academicInsight,
            status: 'PUBLISHED',
          },
        });
      }

      // Ensure access token
      const existingToken = await prisma.resultAccessToken.findFirst({
        where: { resultId: resultRecord.id, isRevoked: false },
      });
      if (!existingToken) {
        await prisma.resultAccessToken.create({
          data: {
            resultId: resultRecord.id,
            token: generateResultToken(),
          },
        });
      }

      // Save subject breakups if available
      if (evalData.subjectResults?.length > 0) {
        await prisma.examSubjectResult.createMany({
          data: evalData.subjectResults.map((s) => ({
            resultId: resultRecord.id,
            subjectName: s.subjectName || 'General',
            totalQuestions: s.totalQuestions || 0,
            attemptedQuestions: s.attemptedQuestions || 0,
            correctCount: s.correctCount || 0,
            incorrectCount: s.incorrectCount || 0,
            unattemptedCount: s.unattemptedCount || 0,
            maxMarks: s.maxMarks || 0,
            marksObtained: s.marksObtained || 0,
            accuracyPercentage: s.accuracyPercentage || 0,
            percentage: s.percentage || 0,
          })),
        });
      }

      // Save chapter breakups if available
      if (evalData.chapterResults?.length > 0) {
        await prisma.examChapterResult.createMany({
          data: evalData.chapterResults.map((c) => ({
            resultId: resultRecord.id,
            chapterName: c.chapterName,
            totalQuestions: c.totalQuestions,
            attemptedQuestions: c.attemptedQuestions,
            correctCount: c.correctCount,
            incorrectCount: c.incorrectCount,
            accuracyPercentage: c.accuracyPercentage,
            status: c.status || 'AVERAGE',
          })),
        });
      }
    }

    res.json({
      ok: true,
      message: `Successfully processed and published ${rankedCohort.length} offline student results`,
      totalStudents: rankedCohort.length,
      topScore: rankedCohort[0]?.marksObtained || 0,
      paperId,
    });
  } catch (err) {
    console.error('Failed to upload offline results:', err);
    res.status(500).json({ error: 'Failed to process offline results: ' + err.message });
  }
});

/**
 * GET /api/results/paper/:paperId
 * Lists all generated student results for an examination paper.
 */
router.get('/paper/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;
    const { batch, search } = req.query;

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: { institute: true },
    });

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    if (req.user.role !== 'ADMIN' && paper.instituteId && paper.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized: Paper belongs to another institute' });
    }

    const where = { paperId };
    if (batch) where.batchName = String(batch);
    if (search) {
      where.OR = [
        { studentName: { contains: String(search) } },
        { rollNumber: { contains: String(search) } },
      ];
    }

    const results = await prisma.examResult.findMany({
      where,
      orderBy: [{ rank: 'asc' }, { studentName: 'asc' }],
      include: {
        accessTokens: { where: { isRevoked: false }, take: 1 },
        whatsappLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    // Class / Batch aggregates
    const totalStudents = results.length;
    const totalScore = results.reduce((acc, r) => acc + r.marksObtained, 0);
    const averageScore = totalStudents > 0 ? Math.round((totalScore / totalStudents) * 10) / 10 : 0;
    const topScore = totalStudents > 0 ? results[0].marksObtained : 0;
    const passThreshold = paper.questions?.length ? (paper.questions.length * 4.0 * 0.4) : 40.0;
    const passedCount = results.filter((r) => r.marksObtained >= passThreshold).length;
    const passPercentage = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 1000) / 10 : 0;

    // Mask phone numbers in response for privacy
    const sanitizedResults = results.map((r) => ({
      ...r,
      parentPhoneMasked: maskPhoneNumber(r.parentPhone),
      publicToken: r.accessTokens[0]?.token || null,
      latestWhatsAppStatus: r.whatsappLogs[0]?.status || 'NOT_SENT',
    }));

    res.json({
      paper: {
        id: paper.id,
        title: paper.title,
        examName: paper.examName,
        instituteName: paper.instituteName || paper.institute?.name,
      },
      stats: {
        totalStudents,
        averageScore,
        topScore,
        passPercentage,
      },
      results: sanitizedResults,
    });
  } catch (err) {
    console.error('Failed to list paper results:', err);
    res.status(500).json({ error: 'Failed to list results: ' + err.message });
  }
});

/**
 * GET /api/results/student/:resultId
 * Returns full details of a student's result including subject and chapter breakdowns.
 */
router.get('/student/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;

    const result = await prisma.examResult.findUnique({
      where: { id: resultId },
      include: {
        institute: true,
        subjectResults: true,
        chapterResults: true,
        accessTokens: { where: { isRevoked: false }, take: 1 },
        whatsappLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (req.user.role !== 'ADMIN' && result.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      ...result,
      parentPhoneMasked: maskPhoneNumber(result.parentPhone),
      publicToken: result.accessTokens[0]?.token || null,
    });
  } catch (err) {
    console.error('Failed to fetch student result:', err);
    res.status(500).json({ error: 'Failed to fetch result: ' + err.message });
  }
});

/**
 * GET /api/results/:resultId/pdf
 * Generates and streams the publication-grade A4 Performance Report PDF.
 */
router.get('/:resultId/pdf', async (req, res) => {
  try {
    const { resultId } = req.params;

    const result = await prisma.examResult.findUnique({
      where: { id: resultId },
      include: {
        institute: true,
        subjectResults: true,
        chapterResults: true,
        accessTokens: { where: { isRevoked: false }, take: 1 },
      },
    });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (req.user.role !== 'ADMIN' && result.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Ensure access token exists for the verification QR code
    let token = result.accessTokens[0]?.token;
    if (!token) {
      const newToken = generateResultToken();
      const tokenRec = await prisma.resultAccessToken.create({
        data: { resultId: result.id, token: newToken },
      });
      token = tokenRec.token;
    }

    const host = req.get('host') || 'localhost:5173';
    const protocol = req.protocol || 'http';
    const publicUrl = `${protocol}://${host}/r/${token}`;

    const pdfBuffer = await buildStudentPerformancePdf({
      result,
      institute: result.institute || {},
      publicReportUrl: publicUrl,
    });

    const safeFilename = `${result.rollNumber}_${result.studentName.replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Failed to render PDF report:', err);
    res.status(500).json({ error: 'Failed to render PDF: ' + err.message });
  }
});

/**
 * GET /api/results/:resultId/whatsapp-preview
 * Previews the compiled WhatsApp notification message and estimated cost.
 */
router.get('/:resultId/whatsapp-preview', async (req, res) => {
  try {
    const { resultId } = req.params;

    const result = await prisma.examResult.findUnique({
      where: { id: resultId },
      include: {
        institute: true,
        accessTokens: { where: { isRevoked: false }, take: 1 },
      },
    });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (req.user.role !== 'ADMIN' && result.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const host = req.get('host') || 'localhost:5173';
    const protocol = req.protocol || 'http';
    const token = result.accessTokens[0]?.token || 'SAMPLE_TOKEN';
    const reportUrl = `${protocol}://${host}/r/${token}`;

    const previewMessage = compileWhatsAppMessage({
      collegeName: result.institute?.name || 'Academic Institute',
      student: {
        studentName: result.studentName,
        rollNumber: result.rollNumber,
        batchName: result.batchName,
        section: result.section,
      },
      exam: {
        examName: result.examName,
        examDate: result.examDate,
        marksObtained: result.marksObtained,
        maxMarks: result.maxMarks,
        percentage: result.percentage,
        accuracyPercentage: result.accuracyPercentage,
        rank: result.rank,
        totalStudents: result.totalStudents,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        unattemptedQuestions: result.unattemptedQuestions,
        academicInsight: result.academicInsight,
      },
      reportUrl,
    });

    res.json({
      recipientPhone: result.parentPhone,
      recipientPhoneMasked: maskPhoneNumber(result.parentPhone),
      previewMessage,
      estimatedCostRupees: DEFAULT_COST_PER_MESSAGE_INR,
      reportUrl,
    });
  } catch (err) {
    console.error('Failed to preview WhatsApp message:', err);
    res.status(500).json({ error: 'Failed to preview message: ' + err.message });
  }
});

/**
 * POST /api/results/:resultId/whatsapp-send
 * Dispatches WhatsApp notification for an individual student.
 */
router.post('/:resultId/whatsapp-send', async (req, res) => {
  try {
    const { resultId } = req.params;
    const { forceRetry = false } = req.body;

    const result = await prisma.examResult.findUnique({
      where: { id: resultId },
    });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (req.user.role !== 'ADMIN' && result.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!result.parentPhone) {
      return res.status(400).json({ error: 'No parent phone number registered for this student' });
    }

    const host = req.get('host') || 'localhost:5173';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const dispatch = await sendResultWhatsAppNotification({
      instituteId: result.instituteId,
      resultId: result.id,
      recipientPhone: result.parentPhone,
      forceRetry: Boolean(forceRetry),
      baseUrl,
    });

    res.json(dispatch);
  } catch (err) {
    console.error('Failed to send WhatsApp notification:', err);
    res.status(500).json({ error: 'WhatsApp dispatch failed: ' + err.message });
  }
});

/**
 * PATCH /api/results/:resultId/parent-phone
 * Updates parent phone number for an ExamResult, and synchronizes with StudentProfile.
 */
router.patch('/:resultId/parent-phone', async (req, res) => {
  try {
    const { resultId } = req.params;
    const { parentPhone } = req.body;
    if (!parentPhone || !String(parentPhone).trim()) {
      return res.status(400).json({ error: 'Parent phone number is required' });
    }

    const normPhone = normalizePhoneNumber(parentPhone);
    if (!normPhone) {
      return res.status(400).json({ error: 'Invalid phone number format. Please provide a valid 10-digit mobile number.' });
    }

    const result = await prisma.examResult.findUnique({
      where: { id: resultId },
    });
    if (!result) {
      return res.status(404).json({ error: 'Exam result not found' });
    }

    // Tenant authorization check
    if (req.user.role !== 'ADMIN' && result.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized to modify this result' });
    }

    const updated = await prisma.examResult.update({
      where: { id: resultId },
      data: { parentPhone: normPhone },
    });

    // Also sync to StudentProfile
    await prisma.studentProfile.upsert({
      where: {
        instituteId_rollNumber: {
          instituteId: result.instituteId,
          rollNumber: result.rollNumber,
        },
      },
      update: {
        parentPhone: normPhone,
      },
      create: {
        instituteId: result.instituteId,
        rollNumber: result.rollNumber,
        fullName: result.studentName,
        batchName: result.batchName || 'General',
        section: result.section || null,
        parentPhone: normPhone,
      },
    });

    res.json({
      ok: true,
      resultId: updated.id,
      parentPhone: updated.parentPhone,
      parentPhoneMasked: maskPhoneNumber(updated.parentPhone),
    });
  } catch (err) {
    console.error('Failed to update parent phone:', err);
    res.status(500).json({ error: 'Failed to update phone: ' + err.message });
  }
});

/**
 * POST /api/results/paper/:paperId/batch-whatsapp-send
 * Dispatches WhatsApp notifications in bulk to all approved students in an examination.
 */
router.post('/paper/:paperId/batch-whatsapp-send', async (req, res) => {
  try {
    const { paperId } = req.params;
    const { batchName, forceRetry = false } = req.body;

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    if (req.user.role !== 'ADMIN' && paper.instituteId && paper.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const where = { paperId };
    if (batchName) where.batchName = String(batchName);

    const results = await prisma.examResult.findMany({
      where,
    });

    if (results.length === 0) {
      return res.status(400).json({ error: 'No results found to notify' });
    }

    const host = req.get('host') || 'localhost:5173';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    let sentCount = 0;
    let skippedAlreadySent = 0;
    let skippedNoPhone = 0;
    let failedCount = 0;

    for (const r of results) {
      if (!r.parentPhone) {
        skippedNoPhone++;
        continue;
      }

      try {
        const dispatch = await sendResultWhatsAppNotification({
          instituteId: r.instituteId,
          resultId: r.id,
          recipientPhone: r.parentPhone,
          forceRetry: Boolean(forceRetry),
          baseUrl,
        });

        if (dispatch.alreadySent) {
          skippedAlreadySent++;
        } else if (dispatch.ok) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        console.error(`Error notifying student ${r.rollNumber}:`, err.message);
        failedCount++;
      }
    }

    const totalCost = Math.round(sentCount * DEFAULT_COST_PER_MESSAGE_INR * 100) / 100;

    res.json({
      ok: true,
      totalCandidates: results.length,
      sentCount,
      skippedAlreadySent,
      skippedNoPhone,
      failedCount,
      totalCostRupees: totalCost,
    });
  } catch (err) {
    console.error('Failed to batch send WhatsApp notifications:', err);
    res.status(500).json({ error: 'Batch dispatch failed: ' + err.message });
  }
});

/**
 * GET /api/results/whatsapp-ledger
 * Returns the institute's WhatsApp usage history, wallet balance, and message logs.
 */
router.get('/whatsapp/ledger', async (req, res) => {
  try {
    const instituteId = req.user.role === 'ADMIN' ? req.query.instituteId : req.user.instituteId;

    if (!instituteId) {
      return res.status(400).json({ error: 'Institute ID required' });
    }

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: {
        id: true,
        name: true,
        whatsAppWalletBalance: true,
      },
    });

    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const ledger = await prisma.whatsAppUsageLedger.findMany({
      where: { instituteId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const recentLogs = await prisma.whatsAppMessageLog.findMany({
      where: { instituteId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        result: {
          select: { studentName: true, rollNumber: true, examName: true },
        },
      },
    });

    const sanitizedLogs = recentLogs.map((l) => ({
      ...l,
      recipientPhoneMasked: maskPhoneNumber(l.recipientPhone),
    }));

    res.json({
      institute,
      walletBalance: institute.whatsAppWalletBalance,
      ledger,
      recentLogs: sanitizedLogs,
    });
  } catch (err) {
    console.error('Failed to fetch WhatsApp ledger:', err);
    res.status(500).json({ error: 'Failed to fetch ledger: ' + err.message });
  }
});

/**
 * POST /api/results/whatsapp/wallet-recharge
 * Adds credits/rupees to the institute's WhatsApp messaging balance.
 */
router.post('/whatsapp/wallet-recharge', async (req, res) => {
  try {
    const { amountRupees } = req.body;
    const instituteId = req.user.role === 'ADMIN' ? req.body.instituteId : req.user.instituteId;

    const amount = parseFloat(amountRupees);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount in rupees is required' });
    }

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
    });

    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const currentBal = institute.whatsAppWalletBalance || 0.0;
    const newBal = Math.round((currentBal + amount) * 100) / 100;

    await prisma.$transaction([
      prisma.whatsAppUsageLedger.create({
        data: {
          instituteId,
          amountRupees: amount,
          balanceAfter: newBal,
          messageCount: 0,
          description: `WhatsApp Wallet Recharge (+₹${amount})`,
        },
      }),
      prisma.institute.update({
        where: { id: instituteId },
        data: { whatsAppWalletBalance: newBal },
      }),
    ]);

    res.json({
      ok: true,
      amountAdded: amount,
      newBalance: newBal,
    });
  } catch (err) {
    console.error('Failed to recharge WhatsApp wallet:', err);
    res.status(500).json({ error: 'Recharge failed: ' + err.message });
  }
});

/**
 * GET /api/results/analytics/students-list
 * Lists unique students who have taken exams in this institute.
 */
router.get('/analytics/students-list', async (req, res) => {
  try {
    const instituteId = req.user.role === 'ADMIN' ? req.query.instituteId : req.user.instituteId;
    if (!instituteId) {
      return res.status(400).json({ error: 'Institute ID required' });
    }

    const allResults = await prisma.examResult.findMany({
      where: { instituteId },
      orderBy: { examDate: 'desc' },
      select: {
        rollNumber: true,
        studentName: true,
        batchName: true,
        section: true,
        parentPhone: true,
        marksObtained: true,
        maxMarks: true,
        percentage: true,
        accuracyPercentage: true,
        rank: true,
        examDate: true,
      },
    });

    const studentMap = {};
    allResults.forEach((r) => {
      const roll = r.rollNumber;
      if (!studentMap[roll]) {
        studentMap[roll] = {
          rollNumber: roll,
          studentName: r.studentName || roll,
          batchName: r.batchName || 'General',
          section: r.section || '',
          parentPhoneMasked: maskPhoneNumber(r.parentPhone),
          totalExams: 0,
          totalPercentage: 0,
          latestExamDate: r.examDate,
          latestScore: r.marksObtained,
          latestPercentage: r.percentage,
          latestRank: r.rank,
        };
      }
      studentMap[roll].totalExams++;
      studentMap[roll].totalPercentage += (r.percentage || 0);
    });

    const students = Object.values(studentMap).map((s) => ({
      ...s,
      averagePercentage: Math.round((s.totalPercentage / (s.totalExams || 1)) * 10) / 10,
    }));

    students.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));

    res.json({ students });
  } catch (err) {
    console.error('Failed to list students for analytics:', err);
    res.status(500).json({ error: 'Failed to fetch student list' });
  }
});

/**
 * GET /api/results/analytics/student/:rollNumber
 * Returns multi-exam progression history, percentage-point deltas, subject trends, and weak chapters.
 */
router.get('/analytics/student/:rollNumber', async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const instituteId = req.user.role === 'ADMIN' ? req.query.instituteId : req.user.instituteId;
    if (!instituteId) {
      return res.status(400).json({ error: 'Institute ID required' });
    }

    const normRoll = String(rollNumber).trim().toUpperCase();

    const exams = await prisma.examResult.findMany({
      where: {
        instituteId,
        rollNumber: normRoll,
      },
      orderBy: { examDate: 'asc' },
      include: {
        subjectResults: true,
        chapterResults: true,
        accessTokens: { where: { isRevoked: false }, take: 1 },
      },
    });

    if (exams.length === 0) {
      return res.status(404).json({ error: `No exam records found for student ${normRoll}` });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: {
        instituteId_rollNumber: {
          instituteId,
          rollNumber: normRoll,
        },
      },
    });

    const studentInfo = {
      studentName: profile?.fullName || exams[exams.length - 1].studentName,
      rollNumber: normRoll,
      batchName: profile?.batchName || exams[exams.length - 1].batchName,
      section: profile?.section || exams[exams.length - 1].section,
      classYear: profile?.classYear || null,
      courseTarget: profile?.courseTarget || null,
      admissionNumber: profile?.admissionNumber || null,
      gender: profile?.gender || null,
      nativePlace: profile?.nativePlace || null,
      district: profile?.district || null,
      state: profile?.state || null,
      hostelStatus: profile?.hostelStatus || null,
      parentName: profile?.parentName || null,
      parentRelation: profile?.parentRelation || null,
      parentOccupation: profile?.parentOccupation || null,
      parentPhone: profile?.parentPhone || exams[exams.length - 1].parentPhone,
      parentPhoneMasked: maskPhoneNumber(profile?.parentPhone || exams[exams.length - 1].parentPhone),
      studentPhone: profile?.studentPhone || null,
      address: profile?.address || null,
      photoUrl: profile?.photoUrl || null,
      totalExamsTaken: exams.length,
    };

    const timeline = exams.map((ex, idx) => {
      let percentagePointsDelta = 0;
      let accuracyPointsDelta = 0;
      let rankDelta = 0;

      if (idx > 0) {
        const prev = exams[idx - 1];
        percentagePointsDelta = Math.round((ex.percentage - prev.percentage) * 10) / 10;
        accuracyPointsDelta = Math.round((ex.accuracyPercentage - prev.accuracyPercentage) * 10) / 10;
        rankDelta = prev.rank - ex.rank;
      }

      return {
        resultId: ex.id,
        examName: ex.examName,
        examDate: ex.examDate,
        examType: ex.examType,
        marksObtained: ex.marksObtained,
        maxMarks: ex.maxMarks,
        percentage: ex.percentage,
        accuracyPercentage: ex.accuracyPercentage,
        rank: ex.rank,
        totalStudents: ex.totalStudents,
        percentagePointsDelta,
        accuracyPointsDelta,
        rankDelta,
        publicToken: ex.accessTokens[0]?.token || null,
        academicInsight: ex.academicInsight,
      };
    });

    const totalScorePct = timeline.reduce((acc, t) => acc + t.percentage, 0);
    const totalAccPct = timeline.reduce((acc, t) => acc + t.accuracyPercentage, 0);
    const careerAveragePercentage = Math.round((totalScorePct / timeline.length) * 10) / 10;
    const careerAverageAccuracy = Math.round((totalAccPct / timeline.length) * 10) / 10;
    const bestRank = Math.min(...timeline.map((t) => t.rank));

    const subjectMap = {};
    exams.forEach((ex) => {
      (ex.subjectResults || []).forEach((sub) => {
        if (!subjectMap[sub.subjectName]) {
          subjectMap[sub.subjectName] = [];
        }
        subjectMap[sub.subjectName].push({
          examName: ex.examName,
          examDate: ex.examDate,
          score: sub.marksObtained,
          maxMarks: sub.maxMarks,
          percentage: sub.percentage,
          accuracyPercentage: sub.accuracyPercentage,
        });
      });
    });

    const chapterStats = {};
    exams.forEach((ex) => {
      (ex.chapterResults || []).forEach((chap) => {
        if (!chapterStats[chap.chapterName]) {
          chapterStats[chap.chapterName] = {
            chapterName: chap.chapterName,
            timesEncountered: 0,
            totalAttempted: 0,
            totalCorrect: 0,
          };
        }
        chapterStats[chap.chapterName].timesEncountered++;
        chapterStats[chap.chapterName].totalAttempted += chap.attemptedQuestions;
        chapterStats[chap.chapterName].totalCorrect += chap.correctCount;
      });
    });

    const chronicWeakChapters = Object.values(chapterStats)
      .map((c) => {
        const accuracy = c.totalAttempted > 0
          ? Math.round((c.totalCorrect / c.totalAttempted) * 1000) / 10
          : 0;
        return {
          ...c,
          overallAccuracy: accuracy,
          averageAccuracy: accuracy,
          occurrenceCount: c.timesEncountered,
        };
      })
      .filter((c) => {
        if (exams.length <= 1) return c.overallAccuracy < 60 && c.totalAttempted >= 1;
        return c.overallAccuracy < 60 && c.totalAttempted >= 2;
      })
      .sort((a, b) => a.overallAccuracy - b.overallAccuracy);

    const subjectPerformance = Object.entries(subjectMap).map(([subjectName, tests]) => {
      const testsAppeared = tests.length;
      const totalPct = tests.reduce((sum, t) => sum + (t.percentage || 0), 0);
      const totalAcc = tests.reduce((sum, t) => sum + (t.accuracyPercentage || 0), 0);
      const averagePercentage = Math.round((totalPct / (testsAppeared || 1)) * 10) / 10;
      const averageAccuracy = Math.round((totalAcc / (testsAppeared || 1)) * 10) / 10;
      return {
        subjectName,
        testsAppeared,
        averagePercentage,
        averageAccuracy,
      };
    });

    res.json({
      student: studentInfo,
      careerStats: {
        totalExamsTaken: exams.length,
        careerAveragePercentage: careerAveragePercentage || 0,
        careerAverageAccuracy: careerAverageAccuracy || 0,
        bestRank: isFinite(bestRank) ? bestRank : (timeline[0]?.rank || 1),
        latestRank: timeline[timeline.length - 1]?.rank || 1,
        latestPercentage: timeline[timeline.length - 1]?.percentage || 0,
        latestDelta: timeline[timeline.length - 1]?.percentagePointsDelta || 0,
      },
      timeline: timeline || [],
      subjectPerformance: subjectPerformance || [],
      subjectProgression: subjectMap || {},
      chronicWeakChapters: chronicWeakChapters || [],
    });
  } catch (err) {
    console.error('Failed to get student analytics:', err);
    res.status(500).json({ error: 'Failed to fetch student analytics: ' + err.message });
  }
});

/**
 * GET /api/results/analytics/batch/:paperId
 * Consolidated Batch Performance Report for management and principals.
 */
router.get('/analytics/batch/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: { institute: true },
    });

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    if (req.user.role !== 'ADMIN' && paper.instituteId && paper.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const results = await prisma.examResult.findMany({
      where: { paperId },
      orderBy: [{ rank: 'asc' }, { marksObtained: 'desc' }],
      include: {
        subjectResults: true,
        chapterResults: true,
      },
    });

    if (results.length === 0) {
      return res.status(404).json({ error: 'No exam results available for this paper yet' });
    }

    const totalStudents = results.length;
    const scores = results.map((r) => r.marksObtained);
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const averageScore = Math.round((totalScore / totalStudents) * 10) / 10;
    const topScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    const sortedScores = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sortedScores.length / 2);
    const medianScore = sortedScores.length % 2 !== 0
      ? sortedScores[mid]
      : Math.round(((sortedScores[mid - 1] + sortedScores[mid]) / 2) * 10) / 10;

    const maxMarks = results[0].maxMarks || 100;
    const passThreshold = maxMarks * 0.4;
    const passedCount = results.filter((r) => r.marksObtained >= passThreshold).length;
    const passPercentage = Math.round((passedCount / totalStudents) * 1000) / 10;

    const distribution = { outstanding: 0, distinction: 0, firstClass: 0, secondClass: 0, remedial: 0 };
    results.forEach((r) => {
      const p = r.percentage;
      if (p >= 90) distribution.outstanding++;
      else if (p >= 75) distribution.distinction++;
      else if (p >= 60) distribution.firstClass++;
      else if (p >= 40) distribution.secondClass++;
      else distribution.remedial++;
    });

    const subjectSums = {};
    results.forEach((r) => {
      (r.subjectResults || []).forEach((s) => {
        if (!subjectSums[s.subjectName]) {
          subjectSums[s.subjectName] = {
            subjectName: s.subjectName,
            totalMarks: 0,
            totalAccuracy: 0,
            count: 0,
            maxMarks: s.maxMarks,
          };
        }
        subjectSums[s.subjectName].totalMarks += s.marksObtained;
        subjectSums[s.subjectName].totalAccuracy += s.accuracyPercentage;
        subjectSums[s.subjectName].count++;
      });
    });

    const subjectAverages = Object.values(subjectSums).map((sub) => ({
      subjectName: sub.subjectName,
      averageMarks: Math.round((sub.totalMarks / sub.count) * 10) / 10,
      averageAccuracy: Math.round((sub.totalAccuracy / sub.count) * 10) / 10,
      maxMarks: sub.maxMarks,
    }));

    const batchMap = {};
    results.forEach((r) => {
      const bName = r.batchName || 'General';
      if (!batchMap[bName]) {
        batchMap[bName] = { batchName: bName, totalStudents: 0, totalScore: 0, passed: 0 };
      }
      batchMap[bName].totalStudents++;
      batchMap[bName].totalScore += r.marksObtained;
      if (r.marksObtained >= passThreshold) batchMap[bName].passed++;
    });

    const sectionComparison = Object.values(batchMap).map((b) => ({
      batchName: b.batchName,
      totalStudents: b.totalStudents,
      averageScore: Math.round((b.totalScore / b.totalStudents) * 10) / 10,
      passPercentage: Math.round((b.passed / b.totalStudents) * 1000) / 10,
    }));

    const top10 = results.slice(0, 10).map((r) => ({
      id: r.id,
      rank: r.rank,
      studentName: r.studentName,
      rollNumber: r.rollNumber,
      batchName: r.batchName,
      marksObtained: r.marksObtained,
      percentage: r.percentage,
      accuracyPercentage: r.accuracyPercentage,
    }));

    const bottom10 = [...results]
      .reverse()
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        rank: r.rank,
        studentName: r.studentName,
        rollNumber: r.rollNumber,
        batchName: r.batchName,
        marksObtained: r.marksObtained,
        percentage: r.percentage,
        accuracyPercentage: r.accuracyPercentage,
      }));

    res.json({
      paper: {
        id: paper.id,
        title: paper.title,
        examName: paper.examName,
        createdAt: paper.createdAt,
        instituteName: paper.instituteName || paper.institute?.name,
      },
      stats: {
        totalStudents,
        averageScore,
        medianScore,
        topScore,
        lowestScore,
        passPercentage,
        maxMarks,
      },
      distribution,
      subjectAverages,
      sectionComparison,
      top10,
      bottom10,
    });
  } catch (err) {
    console.error('Failed to get batch analytics:', err);
    res.status(500).json({ error: 'Failed to fetch batch report: ' + err.message });
  }
});

/**
 * GET /api/results/analytics/batch/:paperId/pdf
 * Streams Executive Batch Performance PDF for Management.
 */
router.get('/analytics/batch/:paperId/pdf', async (req, res) => {
  try {
    const { paperId } = req.params;

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: { institute: true },
    });

    if (!paper) {
      return res.status(404).send('Paper not found');
    }

    if (req.user.role !== 'ADMIN' && paper.instituteId && paper.instituteId !== req.user.instituteId) {
      return res.status(403).send('Unauthorized');
    }

    const results = await prisma.examResult.findMany({
      where: { paperId },
      orderBy: [{ rank: 'asc' }, { marksObtained: 'desc' }],
      include: { subjectResults: true },
    });

    if (results.length === 0) {
      return res.status(400).send('No results found for this paper');
    }

    const totalStudents = results.length;
    const scores = results.map((r) => r.marksObtained);
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const averageScore = Math.round((totalScore / totalStudents) * 10) / 10;
    const topScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const maxMarks = results[0].maxMarks || 100;
    const passThreshold = maxMarks * 0.4;
    const passedCount = results.filter((r) => r.marksObtained >= passThreshold).length;
    const passPercentage = Math.round((passedCount / totalStudents) * 1000) / 10;

    const distribution = { outstanding: 0, distinction: 0, firstClass: 0, secondClass: 0, remedial: 0 };
    results.forEach((r) => {
      const p = r.percentage;
      if (p >= 90) distribution.outstanding++;
      else if (p >= 75) distribution.distinction++;
      else if (p >= 60) distribution.firstClass++;
      else if (p >= 40) distribution.secondClass++;
      else distribution.remedial++;
    });

    const subjectSums = {};
    results.forEach((r) => {
      (r.subjectResults || []).forEach((s) => {
        if (!subjectSums[s.subjectName]) {
          subjectSums[s.subjectName] = { subjectName: s.subjectName, totalMarks: 0, totalAccuracy: 0, count: 0, maxMarks: s.maxMarks };
        }
        subjectSums[s.subjectName].totalMarks += s.marksObtained;
        subjectSums[s.subjectName].totalAccuracy += s.accuracyPercentage;
        subjectSums[s.subjectName].count++;
      });
    });

    const subjectAverages = Object.values(subjectSums).map((sub) => ({
      subjectName: sub.subjectName,
      averageMarks: Math.round((sub.totalMarks / sub.count) * 10) / 10,
      averageAccuracy: Math.round((sub.totalAccuracy / sub.count) * 10) / 10,
      maxMarks: sub.maxMarks,
    }));

    const top10 = results.slice(0, 10);
    const bottom10 = [...results].reverse().slice(0, 10);

    const pdfBuffer = await buildBatchPerformancePdf({
      paper,
      stats: { totalStudents, averageScore, topScore, lowestScore, passPercentage, maxMarks },
      distribution,
      subjectAverages,
      top10,
      bottom10,
      institute: paper.institute || {},
    });

    const safeFilename = `${paper.title.replace(/[^a-zA-Z0-9]/g, '_')}_Batch_Report.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Failed to generate batch PDF:', err);
    res.status(500).send('Failed to generate batch report PDF');
  }
});

/**
 * GET /api/results/analytics/batch/:paperId/csv
 * Exports the entire batch results spreadsheet as CSV.
 */
router.get('/analytics/batch/:paperId/csv', async (req, res) => {
  try {
    const { paperId } = req.params;

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      return res.status(404).send('Paper not found');
    }

    const results = await prisma.examResult.findMany({
      where: { paperId },
      orderBy: { rank: 'asc' },
    });

    let csv = 'Rank,Roll Number,Student Name,Batch,Section,Marks Obtained,Max Marks,Percentage,Accuracy %,Correct,Incorrect,Unattempted,Negative Marks Deducted,Parent Phone\n';

    results.forEach((r) => {
      csv += `${r.rank},"${r.rollNumber}","${r.studentName}","${r.batchName}","${r.section || ''}",${r.marksObtained},${r.maxMarks},${r.percentage},${r.accuracyPercentage},${r.correctAnswers},${r.incorrectAnswers},${r.unattemptedQuestions},${r.negativeMarksDeducted},"${r.parentPhone || ''}"\n`;
    });

    const safeFilename = `${paper.title.replace(/[^a-zA-Z0-9]/g, '_')}_Results.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Failed to export batch CSV:', err);
    res.status(500).send('Failed to export CSV');
  }
});

/**
 * GET /api/results/students/roster
 * Fetches all student profiles for this institute with examination count.
 */
router.get('/students/roster', async (req, res) => {
  try {
    const instituteId = req.user.role === 'ADMIN' ? (req.query.instituteId || req.user.instituteId) : req.user.instituteId;
    if (!instituteId) {
      return res.status(400).json({ error: 'Institute ID is required' });
    }

    const students = await prisma.studentProfile.findMany({
      where: { instituteId, isActive: true },
      orderBy: { rollNumber: 'asc' },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    res.json(students.map((s) => ({
      id: s.id,
      rollNumber: s.rollNumber,
      fullName: s.fullName,
      batchName: s.batchName,
      section: s.section,
      classYear: s.classYear,
      courseTarget: s.courseTarget,
      admissionNumber: s.admissionNumber,
      gender: s.gender,
      nativePlace: s.nativePlace,
      district: s.district,
      state: s.state,
      hostelStatus: s.hostelStatus,
      parentName: s.parentName,
      parentRelation: s.parentRelation,
      parentOccupation: s.parentOccupation,
      parentPhone: s.parentPhone,
      parentPhoneMasked: maskPhoneNumber(s.parentPhone),
      parentEmail: s.parentEmail,
      studentPhone: s.studentPhone,
      address: s.address,
      examCount: s._count.results,
      createdAt: s.createdAt,
    })));
  } catch (err) {
    console.error('Failed to fetch student roster:', err);
    res.status(500).json({ error: 'Failed to fetch student roster: ' + err.message });
  }
});

/**
 * POST /api/results/students/upload-photo
 * Uploads a student passport photograph.
 */
router.post('/students/upload-photo', (req, res) => {
  studentPhotoUpload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded. Attach image under field "photo".' });
    }
    const photoUrl = `/uploads/students/${req.file.filename}`;
    res.json({ ok: true, photoUrl, filename: req.file.filename });
  });
});

/**
 * POST /api/results/students/roster
 * Adds or updates a single student profile in the college roster.
 */
router.post('/students/roster', async (req, res) => {
  try {
    const instituteId = req.user.role === 'ADMIN' ? (req.body.instituteId || req.user.instituteId) : req.user.instituteId;
    if (!instituteId) {
      return res.status(400).json({ error: 'Institute ID is required' });
    }

    const {
      rollNumber,
      fullName,
      photoUrl,
      batchName,
      section,
      classYear,
      courseTarget,
      admissionNumber,
      gender,
      nativePlace,
      district,
      state,
      hostelStatus,
      parentName,
      parentPhone,
      parentRelation,
      parentOccupation,
      parentEmail,
      studentPhone,
      address,
    } = req.body;

    if (!rollNumber || !String(rollNumber).trim()) {
      return res.status(400).json({ error: 'Roll number is required' });
    }
    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ error: 'Student full name is required' });
    }

    const normRoll = String(rollNumber).trim().toUpperCase();
    const rawPhone = parentPhone ? String(parentPhone).trim() : '';
    const normPhone = rawPhone ? normalizePhoneNumber(rawPhone) : '';

    const studentData = {
      fullName: String(fullName).trim(),
      photoUrl: photoUrl ? String(photoUrl).trim() : null,
      batchName: batchName ? String(batchName).trim() : 'General',
      section: section ? String(section).trim() : null,
      classYear: classYear ? String(classYear).trim() : null,
      courseTarget: courseTarget ? String(courseTarget).trim() : null,
      admissionNumber: admissionNumber ? String(admissionNumber).trim() : null,
      gender: gender ? String(gender).trim() : null,
      nativePlace: nativePlace ? String(nativePlace).trim() : null,
      district: district ? String(district).trim() : null,
      state: state ? String(state).trim() : null,
      hostelStatus: hostelStatus ? String(hostelStatus).trim() : null,
      parentName: parentName ? String(parentName).trim() : null,
      parentPhone: normPhone || '',
      parentRelation: parentRelation ? String(parentRelation).trim() : null,
      parentOccupation: parentOccupation ? String(parentOccupation).trim() : null,
      parentEmail: parentEmail ? String(parentEmail).trim() : null,
      studentPhone: studentPhone ? String(studentPhone).trim() : null,
      address: address ? String(address).trim() : null,
      isActive: true,
    };

    const student = await prisma.studentProfile.upsert({
      where: {
        instituteId_rollNumber: {
          instituteId,
          rollNumber: normRoll,
        },
      },
      update: studentData,
      create: {
        instituteId,
        rollNumber: normRoll,
        ...studentData,
      },
    });

    // Backfill phone to existing ExamResults for this student
    if (normPhone) {
      await prisma.examResult.updateMany({
        where: {
          instituteId,
          rollNumber: normRoll,
          OR: [{ parentPhone: null }, { parentPhone: '' }],
        },
        data: {
          parentPhone: normPhone,
          studentProfileId: student.id,
        },
      });
    }

    res.json({ ok: true, student });
  } catch (err) {
    console.error('Failed to save student profile:', err);
    res.status(500).json({ error: 'Failed to save student: ' + err.message });
  }
});

/**
 * POST /api/results/students/roster/bulk
 * Bulk imports student roster (from CSV or rows).
 */
router.post('/students/roster/bulk', async (req, res) => {
  try {
    const instituteId = req.user.role === 'ADMIN' ? (req.body.instituteId || req.user.instituteId) : req.user.instituteId;
    if (!instituteId) {
      return res.status(400).json({ error: 'Institute ID is required' });
    }

    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Students array is required' });
    }

    let importedCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (!s.rollNumber || !s.fullName) {
        errors.push(`Row ${i + 1}: Missing Roll Number or Full Name`);
        continue;
      }

      const normRoll = String(s.rollNumber).trim().toUpperCase();
      const rawPhone = s.parentPhone ? String(s.parentPhone).trim() : '';
      const normPhone = rawPhone ? normalizePhoneNumber(rawPhone) : '';

      try {
        const existing = await prisma.studentProfile.findUnique({
          where: {
            instituteId_rollNumber: {
              instituteId,
              rollNumber: normRoll,
            },
          },
        });

        const profile = await prisma.studentProfile.upsert({
          where: {
            instituteId_rollNumber: {
              instituteId,
              rollNumber: normRoll,
            },
          },
          update: {
            fullName: String(s.fullName).trim(),
            photoUrl: s.photoUrl ? String(s.photoUrl).trim() : existing?.photoUrl,
            batchName: s.batchName ? String(s.batchName).trim() : (existing?.batchName || 'General'),
            section: s.section ? String(s.section).trim() : existing?.section,
            classYear: s.classYear ? String(s.classYear).trim() : existing?.classYear,
            courseTarget: s.courseTarget ? String(s.courseTarget).trim() : existing?.courseTarget,
            nativePlace: s.nativePlace ? String(s.nativePlace).trim() : existing?.nativePlace,
            district: s.district ? String(s.district).trim() : existing?.district,
            state: s.state ? String(s.state).trim() : existing?.state,
            hostelStatus: s.hostelStatus ? String(s.hostelStatus).trim() : existing?.hostelStatus,
            gender: s.gender ? String(s.gender).trim() : existing?.gender,
            parentName: s.parentName ? String(s.parentName).trim() : existing?.parentName,
            parentPhone: normPhone || existing?.parentPhone || '',
            parentRelation: s.parentRelation ? String(s.parentRelation).trim() : existing?.parentRelation,
            parentOccupation: s.parentOccupation ? String(s.parentOccupation).trim() : existing?.parentOccupation,
            parentEmail: s.parentEmail ? String(s.parentEmail).trim() : existing?.parentEmail,
            studentPhone: s.studentPhone ? String(s.studentPhone).trim() : existing?.studentPhone,
            address: s.address ? String(s.address).trim() : existing?.address,
            isActive: true,
          },
          create: {
            instituteId,
            rollNumber: normRoll,
            fullName: String(s.fullName).trim(),
            photoUrl: s.photoUrl ? String(s.photoUrl).trim() : null,
            batchName: s.batchName ? String(s.batchName).trim() : 'General',
            section: s.section ? String(s.section).trim() : null,
            classYear: s.classYear ? String(s.classYear).trim() : null,
            courseTarget: s.courseTarget ? String(s.courseTarget).trim() : null,
            nativePlace: s.nativePlace ? String(s.nativePlace).trim() : null,
            district: s.district ? String(s.district).trim() : null,
            state: s.state ? String(s.state).trim() : null,
            hostelStatus: s.hostelStatus ? String(s.hostelStatus).trim() : null,
            gender: s.gender ? String(s.gender).trim() : null,
            parentName: s.parentName ? String(s.parentName).trim() : null,
            parentPhone: normPhone || '',
            parentRelation: s.parentRelation ? String(s.parentRelation).trim() : null,
            parentOccupation: s.parentOccupation ? String(s.parentOccupation).trim() : null,
            parentEmail: s.parentEmail ? String(s.parentEmail).trim() : null,
            studentPhone: s.studentPhone ? String(s.studentPhone).trim() : null,
            address: s.address ? String(s.address).trim() : null,
          },
        });

        if (existing) {
          updatedCount++;
        } else {
          importedCount++;
        }

        // Backfill phone to past results if missing
        if (normPhone) {
          await prisma.examResult.updateMany({
            where: {
              instituteId,
              rollNumber: normRoll,
              OR: [{ parentPhone: null }, { parentPhone: '' }],
            },
            data: {
              parentPhone: normPhone,
              studentProfileId: profile.id,
            },
          });
        }
      } catch (err) {
        errors.push(`Row ${i + 1} (${normRoll}): ${err.message}`);
      }
    }

    res.json({
      ok: true,
      importedCount,
      updatedCount,
      totalProcessed: students.length,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error('Failed to bulk import students:', err);
    res.status(500).json({ error: 'Bulk import failed: ' + err.message });
  }
});

/**
 * DELETE /api/results/students/roster/:id
 * Deactivates or removes a student from roster.
 */
router.delete('/students/roster/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await prisma.studentProfile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role !== 'ADMIN' && profile.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.studentProfile.delete({ where: { id } });
    res.json({ ok: true, message: 'Student removed from roster' });
  } catch (err) {
    console.error('Failed to delete student:', err);
    res.status(500).json({ error: 'Failed to delete student: ' + err.message });
  }
});

/**
 * POST /api/results/generate-remedial-paper
 * Automatically composes a tailored Remedial DPP or Batch Assignment
 * targeting specific weak chapters from recent examination diagnostic analytics.
 */
router.post('/generate-remedial-paper', async (req, res) => {
  try {
    const instituteId = req.user.role === 'ADMIN' ? (req.body.instituteId || req.user.instituteId) : req.user.instituteId;
    if (!instituteId) {
      return res.status(400).json({ error: 'Institute ID is required' });
    }

    const institute = await prisma.institute.findUnique({ where: { id: instituteId } });
    const {
      targetType = 'STUDENT', // 'STUDENT' | 'BATCH'
      studentName,
      rollNumber,
      paperId,
      chapterNames = [],
      questionCount = 15,
      difficulty = 'ALL',
      customTitle,
    } = req.body;

    const count = Math.min(Math.max(parseInt(questionCount, 10) || 15, 5), 45);

    let targetChapters = Array.isArray(chapterNames) ? chapterNames.filter(Boolean) : [];

    // If chapterNames not provided, auto-discover weak chapters
    if (targetChapters.length === 0) {
      if (targetType === 'STUDENT' && rollNumber) {
        const normRoll = String(rollNumber).trim().toUpperCase();
        const weakResults = await prisma.examChapterResult.findMany({
          where: {
            result: {
              instituteId,
              rollNumber: normRoll,
            },
            accuracyPercentage: { lt: 60 },
          },
          orderBy: { accuracyPercentage: 'asc' },
          take: 4,
        });
        targetChapters = Array.from(new Set(weakResults.map((w) => w.chapterName)));
      } else if (paperId) {
        const weakBatchResults = await prisma.examChapterResult.groupBy({
          by: ['chapterName'],
          where: {
            result: {
              paperId,
              instituteId,
            },
          },
          _avg: { accuracyPercentage: true },
          orderBy: { _avg: { accuracyPercentage: 'asc' } },
          take: 4,
        });
        targetChapters = weakBatchResults.map((w) => w.chapterName);
      }
    }

    // Fallback: If still empty, grab chapters from the source paper or student's latest exam
    if (targetChapters.length === 0) {
      if (paperId) {
        const paperChapters = await prisma.paperQuestion.findMany({
          where: { paperId },
          include: { question: { include: { chapter: true } } },
          take: 3,
        });
        targetChapters = Array.from(new Set(paperChapters.map((pq) => pq.question?.chapter?.name).filter(Boolean)));
      }
    }

    if (targetChapters.length === 0) {
      return res.status(400).json({
        error: 'No weak chapters identified to target. Please select at least one chapter manually.',
      });
    }

    // Resolve chapter IDs in database
    const dbChapters = await prisma.chapter.findMany({
      where: {
        name: { in: targetChapters },
      },
      include: {
        subject: true,
      },
    });

    const chapterIds = dbChapters.map((c) => c.id);
    if (chapterIds.length === 0) {
      return res.status(400).json({
        error: `Could not find questions matching chapters: ${targetChapters.join(', ')}`,
      });
    }

    // Fetch pool of active questions in these chapters
    const whereQuestions = {
      chapterId: { in: chapterIds },
      isActive: true,
    };
    if (difficulty && difficulty !== 'ALL') {
      whereQuestions.difficulty = difficulty;
    }

    let availableQuestions = await prisma.question.findMany({
      where: whereQuestions,
      select: { id: true, chapterId: true, difficulty: true },
    });

    // If filtered by difficulty yielded too few questions, loosen difficulty filter
    if (availableQuestions.length < count) {
      availableQuestions = await prisma.question.findMany({
        where: {
          chapterId: { in: chapterIds },
          isActive: true,
        },
        select: { id: true, chapterId: true, difficulty: true },
      });
    }

    if (availableQuestions.length === 0) {
      return res.status(400).json({
        error: `No active questions found in question bank for chapters: ${targetChapters.join(', ')}.`,
      });
    }

    // Fisher-Yates shuffle
    const shuffled = [...availableQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedQuestions = shuffled.slice(0, count);

    // Determine title
    let title = customTitle;
    if (!title) {
      if (targetType === 'STUDENT') {
        const studentLabel = studentName || rollNumber || 'Student';
        title = `Remedial DPP — ${studentLabel} — Focus: ${targetChapters.slice(0, 2).join(' & ')}`;
      } else {
        title = `Batch Remedial Practice — Focus: ${targetChapters.slice(0, 2).join(' & ')}`;
      }
    }

    // Determine exam format
    const sourcePaper = paperId ? await prisma.paper.findUnique({ where: { id: paperId } }) : null;
    const examName = sourcePaper?.examName || 'NEET';

    // Create the Paper
    const newPaper = await prisma.paper.create({
      data: {
        title,
        instituteName: institute?.name || null,
        instituteId,
        examName,
        paperType: 'DPP',
        config: JSON.stringify({
          isRemedial: true,
          targetType,
          studentName,
          rollNumber,
          chapters: targetChapters,
          sourcePaperId: paperId || null,
        }),
        includeSolutions: true,
        questions: {
          create: selectedQuestions.map((q, idx) => ({
            questionId: q.id,
            order: idx + 1,
          })),
        },
      },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    res.json({
      ok: true,
      paperId: newPaper.id,
      title: newPaper.title,
      questionCount: newPaper._count.questions,
      chaptersTargeted: targetChapters,
      previewUrl: `/papers/${newPaper.id}`,
      message: `Successfully generated ${newPaper._count.questions}-question remedial paper targeting ${targetChapters.join(', ')}!`,
    });
  } catch (err) {
    console.error('Failed to generate remedial paper:', err);
    res.status(500).json({ error: 'Failed to generate remedial paper: ' + err.message });
  }
});

/**
 * GET /api/results/analytics/student/:rollNumber/csv
 * Exports student longitudinal examination progress report as CSV spreadsheet.
 */
router.get('/analytics/student/:rollNumber/csv', async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const normRoll = String(rollNumber).trim().toUpperCase();
    const instituteId = req.user.role === 'ADMIN' ? (req.query.instituteId || req.user.instituteId) : req.user.instituteId;

    const exams = await prisma.examResult.findMany({
      where: {
        instituteId,
        rollNumber: normRoll,
      },
      orderBy: { examDate: 'asc' },
    });

    if (exams.length === 0) {
      return res.status(404).send(`No exam records found for student ${normRoll}`);
    }

    let csv = 'Test #,Exam Name,Date,Type,Rank,Total Students,Marks Obtained,Max Marks,Percentage,Accuracy %,Delta (Pts),Correct,Wrong,Unattempted\n';

    exams.forEach((ex, idx) => {
      let delta = 0;
      if (idx > 0) {
        delta = Math.round((ex.percentage - exams[idx - 1].percentage) * 10) / 10;
      }
      const dateStr = ex.examDate ? new Date(ex.examDate).toLocaleDateString('en-IN') : '';
      csv += `${idx + 1},"${ex.examName}","${dateStr}","${ex.examType}",${ex.rank},${ex.totalStudents},${ex.marksObtained},${ex.maxMarks},${ex.percentage},${ex.accuracyPercentage},${delta},${ex.correctAnswers},${ex.incorrectAnswers},${ex.unattemptedQuestions}\n`;
    });

    const safeFilename = `${normRoll}_Academic_Progress_Report.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Failed to export student CSV:', err);
    res.status(500).send('Failed to export CSV: ' + err.message);
  }
});

/**
 * GET /api/results/students/roster/export-csv
 * Exports the complete enrolled student roster with WhatsApp numbers as CSV.
 */
router.get('/students/roster/export-csv', async (req, res) => {
  try {
    const instituteId = req.user.role === 'ADMIN' ? (req.query.instituteId || req.user.instituteId) : req.user.instituteId;
    if (!instituteId) return res.status(400).send('Institute ID required');

    const students = await prisma.studentProfile.findMany({
      where: { instituteId, isActive: true },
      orderBy: { rollNumber: 'asc' },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    let csv = 'Roll Number,Student Name,Class / Year,Target Course,Batch,Section,Native Place,District,State,Hostel Status,Gender,Parent WhatsApp Mobile,Parent Name,Relation,Occupation,Student Mobile,Parent Email,Address,Exams Taken,Enrolled Date\n';

    students.forEach((s) => {
      const enrolled = s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '';
      csv += `"${s.rollNumber}","${s.fullName}","${s.classYear || ''}","${s.courseTarget || ''}","${s.batchName}","${s.section || ''}","${s.nativePlace || ''}","${s.district || ''}","${s.state || ''}","${s.hostelStatus || ''}","${s.gender || ''}","${s.parentPhone || ''}","${s.parentName || ''}","${s.parentRelation || ''}","${s.parentOccupation || ''}","${s.studentPhone || ''}","${s.parentEmail || ''}","${s.address || ''}",${s._count.results},"${enrolled}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Students_Roster_Directory.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Failed to export roster CSV:', err);
    res.status(500).send('Failed to export CSV');
  }
});

module.exports = router;

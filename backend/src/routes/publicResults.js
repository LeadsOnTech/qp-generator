// backend/src/routes/publicResults.js
// Public routes for Parents and Students to access verified scorecards and PDFs via secure cryptographic tokens.
// No login required — protected by 32-character unguessable token (rep_<32hex>).

const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { buildStudentPerformancePdf } = require('../lib/studentReportPdf');
const { maskPhoneNumber } = require('../lib/whatsappResultService');

/**
 * GET /api/public/results/:token
 * Fetches verified student scorecard details for web viewer.
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 10) {
      return res.status(400).json({ error: 'Invalid report access token' });
    }

    const tokenRecord = await prisma.resultAccessToken.findUnique({
      where: { token },
      include: {
        result: {
          include: {
            institute: {
              select: {
                id: true,
                name: true,
                logoFilename: true,
                tagline: true,
                address: true,
                phone: true,
              },
            },
            subjectResults: true,
            chapterResults: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.isRevoked) {
      return res.status(404).json({ error: 'This examination report link is invalid or has expired.' });
    }

    // Check optional expiry
    if (tokenRecord.expiresAt && new Date() > new Date(tokenRecord.expiresAt)) {
      return res.status(410).json({ error: 'This examination report link has expired.' });
    }

    // Track views asynchronously
    const now = new Date();
    prisma.resultAccessToken.update({
      where: { id: tokenRecord.id },
      data: {
        viewsCount: { increment: 1 },
        firstViewedAt: tokenRecord.firstViewedAt || now,
        lastViewedAt: now,
      },
    }).catch((err) => console.warn('Failed to update token view count:', err.message));

    const r = tokenRecord.result;

    res.json({
      ok: true,
      report: {
        id: r.id,
        studentName: r.studentName,
        rollNumber: r.rollNumber,
        batchName: r.batchName,
        section: r.section,
        parentPhoneMasked: maskPhoneNumber(r.parentPhone),
        examName: r.examName,
        examType: r.examType,
        examDate: r.examDate,
        totalQuestions: r.totalQuestions,
        attemptedQuestions: r.attemptedQuestions,
        correctAnswers: r.correctAnswers,
        incorrectAnswers: r.incorrectAnswers,
        unattemptedQuestions: r.unattemptedQuestions,
        maxMarks: r.maxMarks,
        marksObtained: r.marksObtained,
        negativeMarksDeducted: r.negativeMarksDeducted,
        percentage: r.percentage,
        accuracyPercentage: r.accuracyPercentage,
        rank: r.rank,
        totalStudents: r.totalStudents,
        academicInsight: r.academicInsight,
        institute: r.institute,
        subjectResults: r.subjectResults,
        chapterResults: r.chapterResults,
      },
    });
  } catch (err) {
    console.error('Failed to load public result:', err);
    res.status(500).json({ error: 'Failed to load report' });
  }
});

/**
 * GET /api/public/results/:token/pdf
 * Downloads official A4 performance PDF report via public token.
 */
router.get('/:token/pdf', async (req, res) => {
  try {
    const { token } = req.params;

    const tokenRecord = await prisma.resultAccessToken.findUnique({
      where: { token },
      include: {
        result: {
          include: {
            institute: true,
            subjectResults: true,
            chapterResults: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.isRevoked) {
      return res.status(404).send('This report link is invalid or has expired.');
    }

    const result = tokenRecord.result;
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
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Failed to download public PDF report:', err);
    res.status(500).send('Failed to generate PDF report');
  }
});

module.exports = router;

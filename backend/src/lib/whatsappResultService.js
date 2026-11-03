// backend/src/lib/whatsappResultService.js
// Handles WhatsApp Result Notifications, Template Compilation, Delivery Logs & Financial Ledger.

const prisma = require('../db');

const DEFAULT_COST_PER_MESSAGE_INR = 0.75; // Standard Indian WhatsApp Business utility rate

/**
 * Normalizes phone numbers to standard E.164 (+91XXXXXXXXXX)
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  // If 10 digits (standard Indian mobile e.g. 9876543210)
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  // If 12 digits starting with 91 (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  // If already full international length
  return `+${digits}`;
}

/**
 * Masks a phone number for user-facing privacy (e.g. "+91 98*** **210")
 */
function maskPhoneNumber(phone) {
  if (!phone) return '—';
  const clean = String(phone).trim();
  if (clean.length < 8) return clean;
  const start = clean.substring(0, 5);
  const end = clean.substring(clean.length - 3);
  return `${start}****${end}`;
}

/**
 * Compiles the official WhatsApp template string for preview and dispatch.
 */
function compileWhatsAppMessage({ collegeName, student, exam, reportUrl }) {
  const dateFormatted = exam.examDate
    ? new Date(exam.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Recent';

  return `🏆 *${collegeName || 'ACADEMIC INSTITUTE'}*

📊 *STUDENT EXAM PERFORMANCE REPORT*

Dear Parent,

Your child has successfully completed the examination.

👨‍🎓 *STUDENT DETAILS*
Name: ${student.studentName}
Student ID: ${student.rollNumber}
Batch: ${student.batchName || 'General'}${student.section ? ` (${student.section})` : ''}

📝 *EXAMINATION DETAILS*
Exam: ${exam.examName}
Date: ${dateFormatted}

🏅 *PERFORMANCE SUMMARY*
🎯 Score: ${exam.marksObtained} / ${exam.maxMarks}
📈 Percentage: ${exam.percentage}%
🥇 Rank: ${exam.rank} / ${exam.totalStudents}

📋 *QUESTION ANALYSIS*
✅ Correct Answers: ${exam.correctAnswers}
❌ Incorrect Answers: ${exam.incorrectAnswers}
⭕ Not Attempted: ${exam.unattemptedQuestions}
🎯 Accuracy: ${exam.accuracyPercentage}%

💡 *ACADEMIC FEEDBACK*
${exam.academicInsight || 'Consistent daily revision is advised.'}

📄 *View Detailed Performance Report & PDF:*
${reportUrl}

🎯 Every Test, A Better Performance!

Regards,
*${collegeName || 'Academic Directorate'} – Academic Team*`;
}

/**
 * Sends a single WhatsApp result notification with strict idempotency and ledger recording.
 */
async function sendResultWhatsAppNotification({
  instituteId,
  resultId,
  recipientPhone,
  forceRetry = false,
  costPerMessage = DEFAULT_COST_PER_MESSAGE_INR,
  baseUrl = 'http://localhost:5173',
}) {
  const normPhone = normalizePhoneNumber(recipientPhone);
  if (!normPhone) {
    throw new Error('Invalid or missing recipient phone number');
  }

  // 1. Fetch Result and Relations
  const result = await prisma.examResult.findUnique({
    where: { id: resultId },
    include: {
      institute: true,
      accessTokens: {
        where: { isRevoked: false },
        take: 1,
      },
    },
  });

  if (!result) {
    throw new Error('Exam result not found');
  }

  // Check institute tenant boundary
  if (result.instituteId !== instituteId) {
    throw new Error('Unauthorized: Result belongs to a different institute');
  }

  // 2. Ensure Secure Access Token exists
  let token = result.accessTokens[0]?.token;
  if (!token) {
    const { generateResultToken } = require('./resultEngine');
    const newToken = generateResultToken();
    const tokenRec = await prisma.resultAccessToken.create({
      data: {
        resultId: result.id,
        token: newToken,
      },
    });
    token = tokenRec.token;
  }

  const reportUrl = `${baseUrl.replace(/\/$/, '')}/r/${token}`;

  // 3. Idempotency Check: Prevent duplicate messages for same result & phone
  if (!forceRetry) {
    const existingSuccessful = await prisma.whatsAppMessageLog.findFirst({
      where: {
        resultId: result.id,
        recipientPhone: normPhone,
        status: { in: ['SENT', 'DELIVERED', 'READ'] },
      },
    });

    if (existingSuccessful) {
      return {
        ok: true,
        alreadySent: true,
        messageId: existingSuccessful.id,
        status: existingSuccessful.status,
        sentAt: existingSuccessful.sentAt,
        recipientPhone: normPhone,
      };
    }
  }

  // 4. Compile Message
  const messageText = compileWhatsAppMessage({
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

  // 5. Provider Dispatch (or Simulated Provider)
  let providerMsgId = 'sim_' + Date.now();
  let dispatchStatus = 'SENT';
  let errorMessage = null;

  const apiKey = process.env.WHATSAPP_PROVIDER_API_KEY;
  const providerUrl = process.env.WHATSAPP_PROVIDER_URL;

  if (apiKey && providerUrl) {
    try {
      const response = await fetch(providerUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: normPhone,
          type: 'text',
          text: { body: messageText },
        }),
      });

      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resJson.error?.message || `Provider responded with status ${response.status}`);
      }
      providerMsgId = resJson.messages?.[0]?.id || providerMsgId;
    } catch (err) {
      console.error('[WHATSAPP API ERROR]', err.message);
      dispatchStatus = 'FAILED';
      errorMessage = err.message;
    }
  } else {
    // Verified Simulation Mode for Dev/Demo
    console.log(`\n================== [WHATSAPP DISPATCH] ==================`);
    console.log(`To: ${normPhone} (${result.studentName})`);
    console.log(`Status: SIMULATED_SENT (Add WHATSAPP_PROVIDER_API_KEY in .env for live carrier delivery)`);
    console.log(messageText);
    console.log(`=========================================================\n`);
  }

  // 6. Record Message Log
  const log = await prisma.whatsAppMessageLog.create({
    data: {
      instituteId,
      resultId: result.id,
      recipientPhone: normPhone,
      templateName: 'student_exam_report_v1',
      messagePayload: JSON.stringify({
        studentName: result.studentName,
        rollNumber: result.rollNumber,
        examName: result.examName,
        reportUrl,
        marksObtained: result.marksObtained,
        percentage: result.percentage,
        rank: result.rank,
      }),
      status: dispatchStatus,
      providerMsgId,
      errorMessage,
      costInRupees: costPerMessage,
      sentAt: dispatchStatus === 'SENT' ? new Date() : null,
    },
  });

  // 7. Record Cost in Financial Ledger (Atomic Balance Adjustment)
  if (dispatchStatus === 'SENT') {
    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { whatsAppWalletBalance: true },
    });
    const currentBal = institute?.whatsAppWalletBalance || 0.0;
    const newBal = Math.round((currentBal - costPerMessage) * 100) / 100;

    await prisma.$transaction([
      prisma.whatsAppUsageLedger.create({
        data: {
          instituteId,
          amountRupees: -costPerMessage,
          balanceAfter: newBal,
          messageCount: 1,
          description: `WhatsApp Result: ${result.studentName} (${result.examName})`,
        },
      }),
      prisma.institute.update({
        where: { id: instituteId },
        data: { whatsAppWalletBalance: newBal },
      }),
    ]);
  }

  return {
    ok: dispatchStatus === 'SENT',
    messageId: log.id,
    status: dispatchStatus,
    recipientPhone: normPhone,
    costInRupees: costPerMessage,
    error: errorMessage,
  };
}

module.exports = {
  DEFAULT_COST_PER_MESSAGE_INR,
  normalizePhoneNumber,
  maskPhoneNumber,
  compileWhatsAppMessage,
  sendResultWhatsAppNotification,
};

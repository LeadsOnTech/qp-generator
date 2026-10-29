const prisma = require('../db');

// Group of exams that share the common state entrance syllabus
const COMMON_CET_EXAMS = [
  {
    name: 'EAPCET',
    patternSubjects: [{ name: 'Mathematics', count: 80 }, { name: 'Physics', count: 40 }, { name: 'Chemistry', count: 40 }],
    patternDifficultyMix: { easy: 30, medium: 50, hard: 20 },
    patternPaperType: 'MODEL_PAPER',
  },
  {
    name: 'TG EAPCET',
    patternSubjects: [{ name: 'Mathematics', count: 80 }, { name: 'Physics', count: 40 }, { name: 'Chemistry', count: 40 }],
    patternDifficultyMix: { easy: 30, medium: 50, hard: 20 },
    patternPaperType: 'MODEL_PAPER',
  },
  {
    name: 'KCET',
    patternSubjects: [{ name: 'Mathematics', count: 60 }, { name: 'Physics', count: 60 }, { name: 'Chemistry', count: 60 }],
    patternDifficultyMix: { easy: 40, medium: 50, hard: 10 },
    patternPaperType: 'MODEL_PAPER',
  },
];

const STARTER_CET_SYLLABUS = {
  Physics: [
    'Physical World',
    'Units and Measurements',
    'Motion in a Straight Line',
    'Motion in a Plane',
    'Laws of Motion',
    'Work, Energy and Power',
    'Alternating Current',
  ],
  Chemistry: [
    'Atomic Structure',
    'Chemical Bonding and Molecular Structure',
    'Haloalkanes and Haloarenes',
    'Thermodynamics',
  ],
  Mathematics: [
    'Straight Lines',
    'Planes',
    'Matrices and Determinants',
  ],
};

/**
 * Ensures all three state CET exams exist with proper patterns and syllabus.
 */
async function ensureCommonExamsExist() {
  for (const item of COMMON_CET_EXAMS) {
    const exam = await prisma.exam.upsert({
      where: { name: item.name },
      update: {
        patternSubjects: JSON.stringify(item.patternSubjects),
        patternDifficultyMix: JSON.stringify(item.patternDifficultyMix),
        patternPaperType: item.patternPaperType,
      },
      create: {
        name: item.name,
        patternSubjects: JSON.stringify(item.patternSubjects),
        patternDifficultyMix: JSON.stringify(item.patternDifficultyMix),
        patternPaperType: item.patternPaperType,
      },
    });

    for (const [subjectName, chapters] of Object.entries(STARTER_CET_SYLLABUS)) {
      const subject = await prisma.subject.upsert({
        where: { name_examId: { name: subjectName, examId: exam.id } },
        update: {},
        create: { name: subjectName, examId: exam.id },
      });

      for (const chapterName of chapters) {
        await prisma.chapter.upsert({
          where: { name_subjectId: { name: chapterName, subjectId: subject.id } },
          update: {},
          create: { name: chapterName, subjectId: subject.id },
        });
      }
    }
  }
}

/**
 * Distributes a single question to all eligible entrance exams.
 */
async function distributeQuestionToExams(questionId, originExamName) {
  const normOrigin = (originExamName || '').toUpperCase().trim();
  const isCommonCet = normOrigin.includes('EAPCET') || normOrigin.includes('EAMCET') || normOrigin.includes('KCET');

  if (!isCommonCet) {
    const originExam = await prisma.exam.findFirst({ where: { name: originExamName } });
    if (originExam) {
      await prisma.questionExamMapping.upsert({
        where: { questionId_examId: { questionId, examId: originExam.id } },
        update: {},
        create: { questionId, examId: originExam.id },
      });
    }
    return;
  }

  // Ensure destination exams exist
  await ensureCommonExamsExist();

  // Find all CET exams in database
  const cetExams = await prisma.exam.findMany({
    where: {
      name: { in: ['EAPCET', 'AP EAPCET', 'TG EAPCET', 'TS EAMCET', 'KCET'] },
    },
  });

  for (const exam of cetExams) {
    await prisma.questionExamMapping.upsert({
      where: { questionId_examId: { questionId, examId: exam.id } },
      update: {},
      create: { questionId, examId: exam.id },
    });
  }
}

/**
 * Backfills / distributes all existing questions in the question bank.
 */
async function distributeAllExistingQuestions() {
  await ensureCommonExamsExist();

  const questions = await prisma.question.findMany({
    where: { isActive: true },
    include: {
      chapter: { include: { subject: { include: { exam: true } } } },
    },
  });

  let distributed = 0;
  for (const q of questions) {
    const examName = q.chapter?.subject?.exam?.name;
    if (examName) {
      await distributeQuestionToExams(q.id, examName);
      distributed++;
    }
  }

  return distributed;
}

module.exports = {
  ensureCommonExamsExist,
  distributeQuestionToExams,
  distributeAllExistingQuestions,
  COMMON_CET_EXAMS,
};

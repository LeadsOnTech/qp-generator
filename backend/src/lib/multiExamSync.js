const prisma = require('../db');

// Configured blueprints for State CET exams
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

// AP EAPCET and TG EAPCET follow 100% Intermediate syllabus (including Physical World)
const EAPCET_STARTER_SYLLABUS = {
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

// KCET strictly OMITS "Physical World" and rationalized NCERT chapters
const KCET_STARTER_SYLLABUS = {
  Physics: [
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

// Chapters specifically excluded from KCET / Karnataka PUC syllabus
const KCET_EXCLUDED_CHAPTERS = [
  'Physical World',
  'States of Matter',
  'Hydrogen',
  'Solid State',
  'Surface Chemistry',
  's-Block Elements',
  'General Principles and Processes of Isolation of Elements',
  'Polymers',
  'Chemistry in Everyday Life',
  'Mathematical Reasoning',
];

/**
 * Ensures all three state CET exams exist with exam-specific syllabus.
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

    const isKcet = item.name === 'KCET';
    const syllabus = isKcet ? KCET_STARTER_SYLLABUS : EAPCET_STARTER_SYLLABUS;

    for (const [subjectName, chapters] of Object.entries(syllabus)) {
      const subject = await prisma.subject.upsert({
        where: { name_examId: { name: subjectName, examId: exam.id } },
        update: {},
        create: { name: subjectName, examId: exam.id },
      });

      for (const chapterName of chapters) {
        await prisma.chapter.upsert({
          where: { name_subjectId: { name: chapterName, subjectId: subject.id } },
          update: { syllabusStatus: 'ACTIVE' },
          create: { name: chapterName, subjectId: subject.id, syllabusStatus: 'ACTIVE' },
        });
      }
    }

    // Clean up any excluded chapters from KCET
    if (isKcet) {
      for (const excludedChapterName of KCET_EXCLUDED_CHAPTERS) {
        const excludedChapter = await prisma.chapter.findFirst({
          where: {
            name: excludedChapterName,
            subject: { examId: exam.id },
          },
          include: { _count: { select: { questions: true } } },
        });

        if (excludedChapter) {
          if (excludedChapter._count.questions === 0) {
            // Delete unused excluded chapter so it completely vanishes from KCET
            await prisma.chapter.delete({ where: { id: excludedChapter.id } }).catch(() => {});
          } else {
            // Mark REMOVED so paper generator and tree exclude it
            await prisma.chapter.update({
              where: { id: excludedChapter.id },
              data: {
                syllabusStatus: 'REMOVED',
                statusNote: 'Not in KCET official syllabus',
              },
            }).catch(() => {});
          }
        }
      }
    }
  }
}

/**
 * Distributes a single question ONLY to exams where its chapter exists and is ACTIVE.
 */
async function distributeQuestionToExams(questionId, originExamName) {
  const normOrigin = (originExamName || '').toUpperCase().trim();
  const isCommonCet = normOrigin.includes('EAPCET') || normOrigin.includes('EAMCET') || normOrigin.includes('KCET');

  const q = await prisma.question.findUnique({
    where: { id: questionId },
    include: { chapter: { include: { subject: true } } },
  });

  if (!q || !q.chapter) return;

  const chapterName = q.chapter.name;
  const subjectName = q.chapter.subject.name;

  if (!isCommonCet) {
    const originExam = await prisma.exam.findFirst({ where: { name: originExamName } });
    if (originExam) {
      await prisma.questionExamMapping.upsert({
        where: { questionId_examId: { questionId, examId: originExam.id } },
        update: { isActive: true },
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
    // Check if this exam has this chapter as ACTIVE in its syllabus
    const targetChapter = await prisma.chapter.findFirst({
      where: {
        name: chapterName,
        subject: { name: subjectName, examId: exam.id },
        syllabusStatus: 'ACTIVE',
      },
    });

    if (!targetChapter) {
      // Chapter DOES NOT exist in this exam's syllabus (e.g. Physical World in KCET)
      // Remove any mapping so it never shows up in this exam
      await prisma.questionExamMapping.deleteMany({
        where: { questionId, examId: exam.id },
      });
    } else {
      // Chapter exists and is ACTIVE in this exam -> map it
      await prisma.questionExamMapping.upsert({
        where: { questionId_examId: { questionId, examId: exam.id } },
        update: { isActive: true },
        create: { questionId, examId: exam.id },
      });
    }
  }
}

/**
 * Backfills / redistributes all existing questions in the bank strictly by syllabus.
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
  KCET_EXCLUDED_CHAPTERS,
};

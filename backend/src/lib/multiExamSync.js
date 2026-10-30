const prisma = require('../db');

// Configured blueprints for State CET exams
const COMMON_CET_EXAMS = [
  {
    name: 'AP EAPCET',
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
const EAPCET_FULL_SYLLABUS = {
  Physics: [
    'Physical World',
    'Units and Measurements',
    'Motion in a Straight Line',
    'Motion in a Plane',
    'Laws of Motion',
    'Work, Energy and Power',
    'System of Particles and Rotational Motion',
    'Oscillations',
    'Gravitation',
    'Mechanical Properties of Solids',
    'Mechanical Properties of Fluids',
    'Thermal Properties of Matter',
    'Thermodynamics',
    'Kinetic Theory of Gases',
    'Waves',
    'Ray Optics and Optical Instruments',
    'Wave Optics',
    'Electric Charges and Fields',
    'Electrostatic Potential and Capacitance',
    'Current Electricity',
    'Moving Charges and Magnetism',
    'Magnetism and Matter',
    'Electromagnetic Induction',
    'Alternating Current',
    'Electromagnetic Waves',
    'Dual Nature of Radiation and Matter',
    'Atoms',
    'Nuclei',
    'Semiconductor Electronics',
    'Communication Systems',
  ],
  Chemistry: [
    'Atomic Structure',
    'Classification of Elements and Periodicity in Properties',
    'Chemical Bonding and Molecular Structure',
    'States of Matter: Gases and Liquids',
    'Stoichiometry',
    'Thermodynamics',
    'Chemical Equilibrium and Acids-Bases',
    'Hydrogen and its Compounds',
    'The s-Block Elements',
    'The p-Block Elements - Group 13 & 14',
    'Environmental Chemistry',
    'Organic Chemistry: Some Basic Principles and Techniques',
    'Hydrocarbons',
    'The Solid State',
    'Solutions',
    'Electrochemistry and Chemical Kinetics',
    'Surface Chemistry',
    'General Principles of Metallurgy',
    'The p-Block Elements - Group 15, 16, 17, 18',
    'd- and f-Block Elements and Coordination Compounds',
    'Polymers',
    'Biomolecules',
    'Chemistry in Everyday Life',
    'Haloalkanes and Haloarenes',
    'Organic Compounds Containing Oxygen (Alcohols, Phenols, Ethers)',
    'Aldehydes, Ketones and Carboxylic Acids',
    'Organic Compounds Containing Nitrogen (Amines)',
  ],
  Mathematics: [
    'Functions',
    'Mathematical Induction',
    'Matrices and Determinants',
    'Complex Numbers',
    'De Moivre’s Theorem',
    'Quadratic Expressions',
    'Theory of Equations',
    'Permutations and Combinations',
    'Binomial Theorem',
    'Partial Fractions',
    'Trigonometric Ratios up to Transformations',
    'Trigonometric Equations',
    'Inverse Trigonometric Functions',
    'Hyperbolic Functions',
    'Properties of Triangles',
    'Addition of Vectors',
    'Product of Vectors',
    'Measures of Dispersion',
    'Probability',
    'Random Variables and Probability Distributions',
    'Locus and Transformation of Axes',
    'Straight Lines',
    'Pair of Straight Lines',
    'Circles',
    'System of Circles',
    'Parabola',
    'Ellipse',
    'Hyperbola',
    'Three-Dimensional Coordinates, Direction Cosines and Ratios',
    'Planes',
    'Limits and Continuity',
    'Differentiation',
    'Applications of Derivatives',
    'Integration',
    'Definite Integrals and Area',
    'Differential Equations',
  ],
};

// KCET strictly OMITS "Physical World" and rationalized NCERT chapters
const KCET_FULL_SYLLABUS = {
  Physics: [
    'Units and Measurements',
    'Motion in a Straight Line',
    'Motion in a Plane',
    'Laws of Motion',
    'Work, Energy and Power',
    'System of Particles and Rotational Motion',
    'Gravitation',
    'Mechanical Properties of Solids',
    'Mechanical Properties of Fluids',
    'Thermal Properties of Matter',
    'Thermodynamics',
    'Kinetic Theory of Gases',
    'Oscillations',
    'Waves',
    'Electric Charges and Fields',
    'Electrostatic Potential and Capacitance',
    'Current Electricity',
    'Moving Charges and Magnetism',
    'Magnetism and Matter',
    'Electromagnetic Induction',
    'Alternating Current',
    'Electromagnetic Waves',
    'Ray Optics and Optical Instruments',
    'Wave Optics',
    'Dual Nature of Radiation and Matter',
    'Atoms',
    'Nuclei',
    'Semiconductor Electronics',
  ],
  Chemistry: [
    'Some Basic Concepts of Chemistry',
    'Structure of Atom',
    'Classification of Elements and Periodicity in Properties',
    'Chemical Bonding and Molecular Structure',
    'Chemical Thermodynamics',
    'Equilibrium',
    'Redox Reactions',
    'Organic Chemistry: Some Basic Principles and Techniques',
    'Hydrocarbons',
    'Solutions',
    'Electrochemistry',
    'Chemical Kinetics',
    'The d- and f-Block Elements',
    'Coordination Compounds',
    'Haloalkanes and Haloarenes',
    'Alcohols, Phenols and Ethers',
    'Aldehydes, Ketones and Carboxylic Acids',
    'Amines',
    'Biomolecules',
  ],
  Mathematics: [
    'Sets, Relations and Functions',
    'Trigonometric Functions',
    'Inverse Trigonometric Functions',
    'Complex Numbers and Quadratic Equations',
    'Linear Inequalities',
    'Permutations and Combinations',
    'Binomial Theorem',
    'Sequences and Series',
    'Straight Lines',
    'Conic Sections (Circles, Parabola, Ellipse, Hyperbola)',
    'Introduction to Three-Dimensional Geometry',
    'Limits and Derivatives',
    'Continuity and Differentiability',
    'Applications of Derivatives',
    'Integrals',
    'Applications of the Integrals',
    'Differential Equations',
    'Vector Algebra',
    'Three-Dimensional Geometry',
    'Matrices and Determinants',
    'Probability',
    'Statistics',
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
  // 1. Rename / migrate any legacy 'EAPCET' exam to 'AP EAPCET'
  const legacyEapcet = await prisma.exam.findFirst({ where: { name: 'EAPCET' } });
  if (legacyEapcet) {
    const existingAp = await prisma.exam.findFirst({ where: { name: 'AP EAPCET' } });
    if (!existingAp) {
      await prisma.exam.update({
        where: { id: legacyEapcet.id },
        data: { name: 'AP EAPCET' },
      });
      await prisma.paper.updateMany({
        where: { examName: 'EAPCET' },
        data: { examName: 'AP EAPCET' },
      });
    } else {
      // Re-assign legacy subjects/chapters/questions to AP EAPCET
      const legacySubjects = await prisma.subject.findMany({
        where: { examId: legacyEapcet.id },
        include: { chapters: true },
      });
      for (const legSub of legacySubjects) {
        let targetSub = await prisma.subject.findUnique({
          where: { name_examId: { name: legSub.name, examId: existingAp.id } },
        });
        if (!targetSub) {
          targetSub = await prisma.subject.create({
            data: { name: legSub.name, examId: existingAp.id },
          });
        }
        for (const legCh of legSub.chapters) {
          let targetCh = await prisma.chapter.findUnique({
            where: { name_subjectId: { name: legCh.name, subjectId: targetSub.id } },
          });
          if (!targetCh) {
            targetCh = await prisma.chapter.create({
              data: {
                name: legCh.name,
                subjectId: targetSub.id,
                syllabusStatus: legCh.syllabusStatus,
                statusNote: legCh.statusNote,
                statusYear: legCh.statusYear,
              },
            });
          }
          await prisma.question.updateMany({
            where: { chapterId: legCh.id },
            data: { chapterId: targetCh.id },
          });
          await prisma.topic.updateMany({
            where: { chapterId: legCh.id },
            data: { chapterId: targetCh.id },
          });
          await prisma.chapter.delete({ where: { id: legCh.id } }).catch(() => {});
        }
        await prisma.subject.delete({ where: { id: legSub.id } }).catch(() => {});
      }
      await prisma.paper.updateMany({
        where: { examName: 'EAPCET' },
        data: { examName: 'AP EAPCET' },
      });
      await prisma.exam.delete({ where: { id: legacyEapcet.id } }).catch(() => {});
    }
  }

  // 2. Rename / migrate any legacy 'TS EAMCET' exam to 'TG EAPCET'
  const legacyTs = await prisma.exam.findFirst({ where: { name: 'TS EAMCET' } });
  if (legacyTs) {
    const existingTg = await prisma.exam.findFirst({ where: { name: 'TG EAPCET' } });
    if (!existingTg) {
      await prisma.exam.update({
        where: { id: legacyTs.id },
        data: { name: 'TG EAPCET' },
      });
      await prisma.paper.updateMany({
        where: { examName: 'TS EAMCET' },
        data: { examName: 'TG EAPCET' },
      });
    }
  }

  // 3. Purge redundant legacy 'EAMCET' exam completely
  const legacyEamcet = await prisma.exam.findFirst({ where: { name: 'EAMCET' } });
  if (legacyEamcet) {
    await prisma.questionExamMapping.deleteMany({ where: { examId: legacyEamcet.id } }).catch(() => {});

    const eamcetSubjects = await prisma.subject.findMany({
      where: { examId: legacyEamcet.id },
      include: { chapters: true },
    });

    const tgExam = await prisma.exam.findFirst({ where: { name: 'TG EAPCET' } });
    for (const sub of eamcetSubjects) {
      const targetSub = tgExam ? await prisma.subject.findUnique({
        where: { name_examId: { name: sub.name, examId: tgExam.id } },
      }) : null;

      for (const ch of sub.chapters) {
        const targetCh = targetSub ? await prisma.chapter.findUnique({
          where: { name_subjectId: { name: ch.name, subjectId: targetSub.id } },
        }) : null;

        if (targetCh) {
          await prisma.question.updateMany({
            where: { chapterId: ch.id },
            data: { chapterId: targetCh.id },
          }).catch(() => {});
          await prisma.topic.updateMany({
            where: { chapterId: ch.id },
            data: { chapterId: targetCh.id },
          }).catch(() => {});
        }
        await prisma.chapter.delete({ where: { id: ch.id } }).catch(() => {});
      }
      await prisma.subject.delete({ where: { id: sub.id } }).catch(() => {});
    }

    await prisma.paper.updateMany({
      where: { examName: 'EAMCET' },
      data: { examName: 'TG EAPCET' },
    }).catch(() => {});

    await prisma.exam.delete({ where: { id: legacyEamcet.id } }).catch(() => {});
  }

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
    const syllabus = isKcet ? KCET_FULL_SYLLABUS : EAPCET_FULL_SYLLABUS;

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
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    include: { chapter: { include: { subject: { include: { exam: true } } } } },
  });

  if (!q || !q.chapter) return;

  const rawOrigin = originExamName || q.chapter?.subject?.exam?.name || '';
  const normOrigin = rawOrigin.toUpperCase().trim();
  const isCommonCet = normOrigin.includes('EAPCET') || normOrigin.includes('EAMCET') || normOrigin.includes('KCET');

  const chapterName = q.chapter.name?.trim();
  const subjectName = q.chapter.subject.name?.trim();

  if (!isCommonCet) {
    const originExam = await prisma.exam.findFirst({ where: { name: rawOrigin } });
    if (originExam) {
      await prisma.questionExamMapping.upsert({
        where: { questionId_examId: { questionId, examId: originExam.id } },
        update: { isActive: true },
        create: { questionId, examId: originExam.id },
      });
    }
    return;
  }

  // Find all CET exams in database
  const cetExams = await prisma.exam.findMany({
    where: {
      name: { in: ['AP EAPCET', 'TG EAPCET', 'KCET'] },
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

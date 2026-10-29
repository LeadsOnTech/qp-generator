const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Starter Syllabus Master for NEET
const NEET_SYLLABUS = {
  Physics: [
    'Physical World and Measurement',
    'Kinematics',
    'Laws of Motion',
    'Work, Energy and Power',
    'Thermodynamics',
    'Optics',
    'Electrostatics',
    'Current Electricity',
  ],
  Chemistry: [
    'Some Basic Concepts of Chemistry',
    'Structure of Atom',
    'Chemical Bonding and Molecular Structure',
    'Thermodynamics',
    'Equilibrium',
    'Organic Chemistry - Basic Principles',
    'Coordination Compounds',
    'Biomolecules',
  ],
  Biology: [
    'Diversity in Living World',
    'Cell Structure and Function',
    'Plant Physiology',
    'Human Physiology',
    'Reproduction',
    'Genetics and Evolution',
    'Biology and Human Welfare',
    'Ecology and Environment',
  ],
};

// Starter Syllabus Master for EAPCET (EAMCET)
const EAPCET_SYLLABUS = {
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

async function seedExam(name, syllabus) {
  const exam = await prisma.exam.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  for (const [subjectName, chapters] of Object.entries(syllabus)) {
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

async function main() {
  await seedExam('NEET', NEET_SYLLABUS);
  await seedExam('EAPCET', EAPCET_SYLLABUS);
  console.log('Seed complete: NEET and EAPCET exams + subjects/chapters created with 0 questions.');

  // One-time default admin account — change this password immediately after first login
  const defaultEmail = 'admin@questionstudio.local';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || defaultEmail;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  let existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const legacyAdmin = await prisma.user.findUnique({ where: { email: 'admin@questionforge.local' } });
    if (legacyAdmin) {
      await prisma.user.update({
        where: { id: legacyAdmin.id },
        data: { email: adminEmail },
      });
      console.log(`Migrated legacy admin email to ${adminEmail}`);
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: { email: adminEmail, passwordHash, role: 'ADMIN' },
      });
      console.log(`Admin account created — email: ${adminEmail} / password: ${adminPassword}`);
    }
  } else {
    console.log('Admin account already exists — skipping creation.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

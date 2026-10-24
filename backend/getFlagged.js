const prisma = require('./src/db');
prisma.question.findMany({
  where: { checkStatus: 'FLAGGED' },
  select: { id: true, checkStatus: true, checkIssues: true },
  take: 3
}).then(console.log).finally(() => prisma.$disconnect());

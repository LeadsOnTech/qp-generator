const prisma = require('./src/db');
prisma.question.updateMany({
  where: { workflowState: 'IN_QC', checkStatus: 'PASSED' },
  data: { workflowState: 'BANK' }
}).then(console.log).finally(() => prisma.$disconnect());

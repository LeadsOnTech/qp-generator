const prisma = require('./src/db');
prisma.uploadBatch.findFirst().then(console.log).finally(() => prisma.$disconnect());

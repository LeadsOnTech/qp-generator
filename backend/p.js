const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.paper.findMany().then(p => console.log(p)).finally(() => process.exit());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.question.findFirst().then(q => console.log(q)).finally(() => prisma.$disconnect());

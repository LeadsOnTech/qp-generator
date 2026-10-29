const path = require('path');
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}
const { PrismaClient } = require('@prisma/client');

// Single shared Prisma instance across the app (avoids exhausting DB connections)
const prisma = new PrismaClient();

module.exports = prisma;

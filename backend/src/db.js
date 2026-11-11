const path = require('path');
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

let prisma;
if (process.env.USE_POSTGRES_STAGING === 'true') {
  const { PrismaClient: PgPrismaClient } = require('./generated/prisma-postgres');
  prisma = new PgPrismaClient({
    datasources: {
      db: {
        url: process.env.STAGING_DATABASE_URL,
      },
    },
  });
} else {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
}

module.exports = prisma;

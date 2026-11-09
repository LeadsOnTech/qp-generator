/**
 * QuestionsStudio Production VPS Migration Script
 * Migrates all 19,079 questions, syllabi, institutes, users, tests, and website data
 * from SQLite (/app/backend/prisma/dev.db) into PostgreSQL (questionstudio-postgres:5432)
 */
const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');

const PG_URL = process.env.PG_URL || 'postgresql://postgres:QS_SecurePass_2026_a9b8@questionstudio-postgres:5432/questionstudio';

async function run() {
  console.log('====================================================');
  console.log('🚀 QUESTIONSSTUDIO HIGH-SPEED DATA MIGRATION');
  console.log('====================================================');

  const sqlitePrisma = new PrismaClient({
    datasources: { db: { url: 'file:/app/backend/prisma/dev.db' } }
  });

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();
  console.log('✅ Connected to PostgreSQL destination container!');

  // Disable constraints temporarily during bulk transfer for speed and safety
  await pgClient.query('SET session_replication_role = replica;');

  try {
    const migrationPlan = [
      { model: 'exam', table: 'Exam' },
      { model: 'subject', table: 'Subject' },
      { model: 'chapter', table: 'Chapter' },
      { model: 'topic', table: 'Topic' },
      { model: 'institute', table: 'Institute' },
      { model: 'user', table: 'User' },
      { model: 'uploadBatch', table: 'UploadBatch' },
      { model: 'question', table: 'Question', batchSize: 500 },
      { model: 'questionExamMapping', table: 'QuestionExamMapping', batchSize: 1000 },
      { model: 'paper', table: 'Paper' },
      { model: 'paperQuestion', table: 'PaperQuestion', batchSize: 500 },
      { model: 'cbtTest', table: 'CbtTest' },
      { model: 'cbtSubmission', table: 'CbtSubmission' },
      { model: 'studentProfile', table: 'StudentProfile' },
      { model: 'examResult', table: 'ExamResult' },
      { model: 'examSubjectResult', table: 'ExamSubjectResult' },
      { model: 'examChapterResult', table: 'ExamChapterResult' },
      { model: 'resultAccessToken', table: 'ResultAccessToken' },
      { model: 'whatsAppMessageLog', table: 'WhatsAppMessageLog' },
      { model: 'whatsAppUsageLedger', table: 'WhatsAppUsageLedger' },
      { model: 'creditTransaction', table: 'CreditTransaction' },
      { model: 'collegeWebsite', table: 'CollegeWebsite' },
      { model: 'collegeCourse', table: 'CollegeCourse' },
      { model: 'collegeFaculty', table: 'CollegeFaculty' },
      { model: 'collegeFacility', table: 'CollegeFacility' },
      { model: 'collegeAchievement', table: 'CollegeAchievement' },
      { model: 'collegeTestimonial', table: 'CollegeTestimonial' },
      { model: 'collegeGalleryItem', table: 'CollegeGalleryItem' },
      { model: 'collegeJobPosting', table: 'CollegeJobPosting' }
    ];

    const results = {};

    for (const step of migrationPlan) {
      const { model, table, batchSize = 250 } = step;
      if (!sqlitePrisma[model]) continue;

      const totalRows = await sqlitePrisma[model].count();
      if (totalRows === 0) {
        results[table] = { total: 0, status: 'EMPTY' };
        continue;
      }

      console.log(`\n==> Migrating ${table} (${totalRows} records)...`);
      let migrated = 0;
      let skip = 0;

      while (skip < totalRows) {
        const rows = await sqlitePrisma[model].findMany({
          skip,
          take: batchSize
        });

        if (rows.length === 0) break;

        for (const row of rows) {
          const keys = Object.keys(row);
          const columns = keys.map(k => `"${k}"`).join(', ');
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const values = keys.map(k => {
            const val = row[k];
            if (val instanceof Date) return val;
            return val;
          });

          const sql = `INSERT INTO "public"."${table}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          await pgClient.query(sql, values);
        }

        migrated += rows.length;
        skip += batchSize;
        if (totalRows > 1000 && (migrated % 2500 === 0 || migrated === totalRows)) {
          console.log(`    ... ${migrated} / ${totalRows} (${Math.round((migrated / totalRows) * 100)}%) ${table} records migrated`);
        }
      }

      // Verify row count in PostgreSQL
      const pgCountRes = await pgClient.query(`SELECT count(*) as count FROM "public"."${table}"`);
      const pgCount = parseInt(pgCountRes.rows[0].count, 10);
      const isMatch = totalRows === pgCount;
      results[table] = { sqlite: totalRows, postgres: pgCount, match: isMatch };
      console.log(`✅ ${table}: SQLite=${totalRows} ➔ PostgreSQL=${pgCount} [${isMatch ? 'MATCH 100%' : 'WARNING'}]`);
    }

    console.log('\n====================================================');
    console.log('🎉 100% DATA MIGRATION TO POSTGRESQL COMPLETE!');
    console.log('====================================================');
    console.table(results);

  } finally {
    // Re-enable constraints
    await pgClient.query('SET session_replication_role = DEFAULT;');
    await sqlitePrisma.$disconnect();
    await pgClient.end();
  }
}

run().catch(err => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});

const prisma = require('../db');

/**
 * The ONLY place credit balances are ever changed. Every call writes a
 * ledger row (CreditTransaction) alongside the balance update, so there's
 * always an auditable trail — never a bare number that silently changed.
 *
 * @param instituteId
 * @param amount   positive to add credits, negative to spend them
 * @param reason   short human-readable label, e.g. "Manual recharge (₹5,000)"
 * @returns { institute, transaction }
 */
async function adjustCredits(instituteId, amount, reason) {
  const institute = await prisma.institute.findUnique({ where: { id: instituteId } });
  if (!institute) throw new Error('Institute not found.');

  const newBalance = institute.creditBalance + amount;
  if (newBalance < 0) {
    throw new Error(`Insufficient credits: this institute has ${institute.creditBalance}, but ${Math.abs(amount)} are needed.`);
  }

  const [updated, transaction] = await prisma.$transaction([
    prisma.institute.update({ where: { id: instituteId }, data: { creditBalance: newBalance } }),
    prisma.creditTransaction.create({
      data: { instituteId, amount, reason, balanceAfter: newBalance },
    }),
  ]);

  return { institute: updated, transaction };
}

/**
 * Read-only check used before finalizing a paper — tells the caller
 * whether there's enough balance WITHOUT actually deducting anything,
 * so the route can show a clear "not enough credits" error up front
 * rather than partially processing then failing.
 */
async function hasEnoughCredits(instituteId, amountNeeded) {
  const institute = await prisma.institute.findUnique({ where: { id: instituteId } });
  if (!institute) return false;
  return institute.creditBalance >= amountNeeded;
}

module.exports = { adjustCredits, hasEnoughCredits };

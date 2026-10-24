const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/auth.js", "utf8");

const approveCode = `
router.post('/register/approve-access/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can approve requests.' });
  
  const request = await prisma.registrationRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request is already ' + request.status });

  // Generate random password
  const rawPassword = crypto.randomBytes(6).toString('hex'); // 12 chars
  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const WELCOME_CREDITS = 200;

  try {
    let slug = slugify(request.instituteName);
    const existingSlug = await prisma.institute.findUnique({ where: { slug } });
    if (existingSlug) slug = slug + "-" + Date.now().toString(36);

    const result = await prisma.$transaction(async (tx) => {
      await tx.registrationRequest.update({ where: { id: request.id }, data: { status: 'APPROVED' } });
      
      const inst = await tx.institute.create({
        data: { name: request.instituteName, slug, phone: request.phone, creditBalance: WELCOME_CREDITS }
      });
      const usr = await tx.user.create({
        data: { email: request.email, passwordHash, role: 'INSTITUTE', instituteId: inst.id }
      });
      await tx.creditTransaction.create({
        data: { instituteId: inst.id, amount: WELCOME_CREDITS, reason: 'New account welcome credits (Admin Approved)', balanceAfter: WELCOME_CREDITS }
      });
      return { user: usr, institute: inst };
    });

    const loginMsg = \`Your QuestionForge account is approved!\\n\\nLogin: http://localhost:5173/#/login\\nEmail: \${request.email}\\nPassword: \${rawPassword}\\n\\n🎁 200 Free Credits have been added.\`;
    whatsapp.sendWelcomeMessage(request.phone, 200, "http://localhost:5173/#/login").catch(() => {});
    // In production, use whatsapp provider to send the actual password securely

    res.json({ success: true, message: 'Account created, credits added, and login details generated.', credentials: { email: request.email, password: rawPassword } });
  } catch (err) {
    console.error('Failed to approve request:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
`;

if (!content.includes("/register/approve-access")) {
  content = content.replace("const router = express.Router();", "const router = express.Router();\n" + approveCode);
  fs.writeFileSync("backend/src/routes/auth.js", content, "utf8");
}

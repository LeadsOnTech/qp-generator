const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/auth.js", "utf8");

const getCode = `
router.get('/register/requests', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can view requests.' });
  try {
    const requests = await prisma.registrationRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});
`;

if (!content.includes("/register/requests")) {
  content = content.replace("const router = express.Router();", "const router = express.Router();\n" + getCode);
  fs.writeFileSync("backend/src/routes/auth.js", content, "utf8");
}

const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/auth.js", "utf8");

// Remove where: { status: 'PENDING' }
content = content.replace(
  "where: { status: 'PENDING' },",
  ""
);

// Add reject endpoint
const rejectCode = `
router.post('/register/reject-access/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can reject requests.' });
  try {
    await prisma.registrationRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});
`;

if (!content.includes("/register/reject-access")) {
  content = content.replace("const router = express.Router();", "const router = express.Router();\n" + rejectCode);
}

fs.writeFileSync("backend/src/routes/auth.js", content, "utf8");

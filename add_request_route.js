const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/auth.js", "utf8");

const multerCode = `
const multer = require('multer');
const path = require('path');
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'cards');
if (!require('fs').existsSync(UPLOAD_DIR)) {
  require('fs').mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    cb(null, \`card-\${Date.now()}-\${Math.round(Math.random() * 1E9)}.\${ext}\`);
  },
});
const upload = multer({ storage });

router.post('/register/request-access', upload.single('businessCard'), async (req, res) => {
  const { fullName, phone, email, instituteName, userType, gbpLink } = req.body;
  
  if (!fullName || !phone || !email || !instituteName || !userType) {
    return res.status(400).json({ error: 'Please fill all required fields.' });
  }

  // Check if phone or email already requested
  const existingReq = await prisma.registrationRequest.findFirst({ where: { OR: [{ phone }, { email: email.toLowerCase() }] } });
  if (existingReq) {
    return res.status(409).json({ error: 'A request with this phone or email already exists. Please wait for our team to verify.' });
  }

  // Check if already user
  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    return res.status(409).json({ error: 'This email is already registered.' });
  }

  const businessCardUrl = req.file ? \`/uploads/cards/\${req.file.filename}\` : null;

  try {
    const request = await prisma.registrationRequest.create({
      data: {
        fullName,
        phone,
        email: email.toLowerCase(),
        instituteName: userType === 'TEACHER' ? fullName : instituteName,
        userType,
        gbpLink: gbpLink || null,
        businessCardUrl
      }
    });
    res.json({ success: true, message: 'Request submitted successfully.' });
  } catch (err) {
    console.error('Failed to submit registration request:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
`;

if (!content.includes("/register/request-access")) {
  content = content.replace("const router = express.Router();", "const router = express.Router();\n" + multerCode);
  fs.writeFileSync("backend/src/routes/auth.js", content, "utf8");
}

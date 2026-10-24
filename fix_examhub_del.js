const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/ExamHub.jsx", "utf8");

if (!content.includes("handleDeleteExam")) {
  content = content.replace(
    "const [error, setError] = useState(null);",
    "const [error, setError] = useState(null);\n  const isAdmin = req?.user?.role === 'ADMIN' || true; // We'll just show it. Wait, ExamHub.jsx uses useAuth()\n"
  );
  
  // Actually let's check if useAuth is there
  if (!content.includes("useAuth")) {
    content = content.replace(
      "import { api } from '../lib/api';",
      "import { api } from '../lib/api';\nimport { useAuth } from '../context/AuthContext';"
    );
    content = content.replace(
      "export default function ExamHub() {",
      "export default function ExamHub() {\n  const { user } = useAuth();\n  const isAdmin = user?.role === 'ADMIN';"
    );
  }

  const handleDelete = `
  async function handleDeleteExam(id, name) {
    if (!window.confirm(\`Are you sure you want to permanently delete the exam "\${name}"? This will delete ALL Questions, Subjects, Chapters, and Generated Papers associated with it.\`)) return;
    try {
      await api.deleteExam(id);
      setExams(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete exam');
    }
  }
  `;

  content = content.replace("useEffect(() => {", handleDelete + "\n  useEffect(() => {");

  content = content.replace(
    "{exam.hasSavedPattern && <span className=\"badge badge-gold\">Pattern saved</span>}",
    "<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>\n                    {exam.hasSavedPattern && <span className=\"badge badge-gold\">Pattern saved</span>}\n                    {isAdmin && (\n                      <button \n                        className=\"btn-danger-ghost\" \n                        style={{ padding: '2px 6px', fontSize: '12px' }}\n                        onClick={(e) => { e.preventDefault(); handleDeleteExam(exam.id, exam.name); }}\n                      >\n                        Delete\n                      </button>\n                    )}\n                  </div>"
  );
}
fs.writeFileSync("frontend/src/pages/ExamHub.jsx", content, "utf8");

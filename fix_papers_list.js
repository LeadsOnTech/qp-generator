const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/PapersList.jsx", "utf8");

// Add state
content = content.replace(
  "const [downloadingId, setDownloadingId] = useState(null);",
  "const [downloadingId, setDownloadingId] = useState(null);\n  const [deletingId, setDeletingId] = useState(null);"
);

// Add function
const funcCode = `
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this paper? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api.deletePaper(id);
      setPapers(papers.filter(p => p.id !== id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }
`;
content = content.replace("async function quickDownload", funcCode + "\n  async function quickDownload");

// Add button to table
const btnCode = `
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 13, color: 'var(--red-600)' }}
                        disabled={deletingId === p.id}
                        onClick={() => handleDelete(p.id)}
                      >
                        {deletingId === p.id ? '...' : 'Delete'}
                      </button>
                    </td>
`;
content = content.replace(/<\/button>\s*\)\}\s*<\/td>/, "</button>\n                    )}\n" + btnCode);

fs.writeFileSync("frontend/src/pages/PapersList.jsx", content, "utf8");

const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/Dashboard.jsx", "utf8");

if (!content.includes("handleDeleteBatch")) {
  const handleDelete = `
  async function handleDeleteBatch(id) {
    if (!window.confirm("Are you sure you want to remove this upload log from the list?")) return;
    try {
      await api.deleteUploadBatch(id);
      setBatches(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      alert("Failed to delete upload log");
    }
  }
  `;
  content = content.replace("useEffect(() => {", handleDelete + "\n  useEffect(() => {");
  
  content = content.replace("<tr><th>File</th><th>Rows</th><th>Success</th><th>Errors</th><th>Uploaded</th></tr>", "<tr><th>File</th><th>Rows</th><th>Success</th><th>Errors</th><th>Uploaded</th><th></th></tr>");
  
  content = content.replace(
    "<td>{new Date(b.createdAt).toLocaleString()}</td>\n                    </tr>",
    "<td>{new Date(b.createdAt).toLocaleString()}</td>\n                      <td><button className=\"btn-danger-ghost\" style={{padding: '2px 6px', fontSize: '12px'}} onClick={() => handleDeleteBatch(b.id)}>Delete</button></td>\n                    </tr>"
  );
}

fs.writeFileSync("frontend/src/pages/Dashboard.jsx", content, "utf8");

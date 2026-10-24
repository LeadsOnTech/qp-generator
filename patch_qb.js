const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

// Imports
if (!content.includes("SearchImageModal")) {
  content = content.replace("import BulkRemovePanel from '../components/BulkRemovePanel';", "import BulkRemovePanel from '../components/BulkRemovePanel';\nimport SearchImageModal from '../components/SearchImageModal';\nimport EditQuestionModal from '../components/EditQuestionModal';");
}

// States
if (!content.includes("showSearchModal")) {
  content = content.replace("const [page, setPage] = useState(1);", "const [page, setPage] = useState(1);\n  const [showSearchModal, setShowSearchModal] = useState(false);\n  const [editingQuestion, setEditingQuestion] = useState(null);");
}

// UI Button
if (!content.includes("Search by Screenshot")) {
  content = content.replace("</label>\n          <input\n            type=\"text\"", "</label>\n          <div style={{display: 'flex', gap: '8px'}}>\n            <input\n            type=\"text\"");
  
  content = content.replace("/>\n        </div>\n\n        {error &&", "/>\n            <button className=\"btn btn-secondary\" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowSearchModal(true)}>📷 Search by Screenshot</button>\n          </div>\n        </div>\n\n        {error &&");
}

// Edit Button
if (!content.includes("EditQuestionModal")) {
  content = content.replace("<button\n                          className=\"btn btn-secondary btn-sm\"\n                          onClick={() => removeQuestion(q.id)}", "<button\n                          className=\"btn btn-secondary btn-sm\"\n                          onClick={() => setEditingQuestion(q)}\n                          style={{ marginRight: 8 }}\n                        >\n                          Edit\n                        </button>\n                        <button\n                          className=\"btn btn-secondary btn-sm\"\n                          onClick={() => removeQuestion(q.id)}");
}

// Modals
if (!content.includes("<SearchImageModal")) {
  content = content.replace("</div>\n  );\n}", "  {showSearchModal && <SearchImageModal onClose={() => setShowSearchModal(false)} onSelect={(q) => { setShowSearchModal(false); setEditingQuestion(q); }} />}\n      {editingQuestion && <EditQuestionModal question={editingQuestion} onClose={() => setEditingQuestion(null)} onSave={() => { setEditingQuestion(null); load(); }} />}\n    </div>\n  );\n}");
}

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");

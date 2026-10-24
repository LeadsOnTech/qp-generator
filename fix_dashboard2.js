const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/Dashboard.jsx", "utf8");

content = content.replace(
  /\{\s*new\s+Date\(b\.createdAt\)\.toLocaleString\(\)\s*\}.*?<\/td>.*?<\/tr>/s,
  `{new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <button className="btn-danger-ghost" style={{padding: '2px 6px', fontSize: '12px'}} onClick={() => handleDeleteBatch(b.id)}>Delete</button>
                      </td>
                    </tr>`
);

fs.writeFileSync("frontend/src/pages/Dashboard.jsx", content, "utf8");

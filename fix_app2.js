const fs = require("fs");
let content = fs.readFileSync("frontend/src/App.jsx", "utf8");

content = content.replace(
  "<Route path=\"/recharge-approvals\" element={<RechargeApprovals />} />",
  "<Route path=\"/recharge-approvals\" element={<RechargeApprovals />} />\n                <Route path=\"/admin/registrations\" element={<RegistrationApprovals />} />"
);

fs.writeFileSync("frontend/src/App.jsx", content, "utf8");

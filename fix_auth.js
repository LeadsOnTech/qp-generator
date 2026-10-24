const fs = require("fs");
let content = fs.readFileSync("frontend/src/context/AuthContext.jsx", "utf8");

const newMethod = `
  async function signupWithOtp(payload) {
    const res = await api.verifyOtp(payload);
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    return res;
  }
`;

content = content.replace("async function signup(", newMethod + "\n  async function signup(");
content = content.replace("signup, logout", "signup, signupWithOtp, logout");

fs.writeFileSync("frontend/src/context/AuthContext.jsx", content, "utf8");

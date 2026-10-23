const { cmd } = require("./_db");
const U = require("./_user");

const FAIL = { error: "Wrong username or password." };

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = req.body || {};
    let id = String(body.id || "").trim().toLowerCase();
    const password = typeof body.password === "string" ? body.password.slice(0, 100) : "";
    if (!id || !password) return res.status(400).json({ error: "Enter your username and password." });
    if ((await U.limited(cmd, "rl:login:ip:" + U.ip(req), 30, 900)) || (await U.limited(cmd, "rl:login:id:" + id.slice(0, 60), 10, 900)))
      return res.status(429).json({ error: "Too many tries. Please wait 15 minutes." });

    let username = id;
    if (id.indexOf("@") > -1) {
      const e = U.normEmail(id);
      username = e ? await cmd(["GET", "email:" + e.key]) : null;
    }
    let user = null;
    try { user = username ? JSON.parse(await cmd(["GET", "user:" + username])) : null; } catch (e) {}
    if (!user) { await U.hash(password, "0000000000000000"); return res.status(401).json(FAIL); } // same time as a real check
    if (!(await U.verify(password, user.salt, user.hash))) return res.status(401).json(FAIL);

    if (await cmd(["GET", "ban:" + user.id])) return res.status(403).json({ error: "This account is blocked." });
    const session = await U.newSession(cmd, user);
    return res.status(200).json({ session, user: { username: user.username, email: user.email } });
  } catch (e) {
    return res.status(500).json({ error: "Server error." });
  }
};

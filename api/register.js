const { cmd } = require("./_db");
const U = require("./_user");
const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = req.body || {};
    const email = U.normEmail(body.email);
    const username = String(body.username || "").trim().toLowerCase();
    const password = body.password;
    if (!email) return res.status(400).json({ error: "Enter a valid Gmail address (name@gmail.com)." });
    if (!U.validUser(username)) return res.status(400).json({ error: "Username must be 3-20 letters, numbers or _ ." });
    if (!U.validPass(password)) return res.status(400).json({ error: "Password must be at least 6 characters." });
    if (await U.limited(cmd, "rl:reg:" + U.ip(req), 10, 3600)) return res.status(429).json({ error: "Too many sign-ups. Try again later." });

    const pw = await U.hash(password);
    const user = { id: "acc-" + crypto.randomBytes(6).toString("hex"), username, email: email.shown, salt: pw.salt, hash: pw.hash, ts: Date.now() };

    // SET ... NX claims the name only if nobody has it yet, so two people cannot take the same one
    if (!(await cmd(["SET", "user:" + username, JSON.stringify(user), "NX"])))
      return res.status(409).json({ error: "This username is already taken." });
    if (!(await cmd(["SET", "email:" + email.key, username, "NX"]))) {
      await cmd(["DEL", "user:" + username]);
      return res.status(409).json({ error: "This Gmail is already registered. Please login." });
    }
    await cmd(["ZADD", "users", user.ts, username]);
    // referral: the friend who shared the link gets extra sites (counted from the refs list)
    try {
      const ref = String(body.ref || "").trim().toLowerCase();
      if (ref && ref !== username && U.validUser(ref)) {
        const r = JSON.parse(await cmd(["GET", "user:" + ref]));
        if (r && r.id) {
          await cmd(["SET", "refby:" + user.id, ref]);
          await cmd(["ZADD", "refs:" + r.id, user.ts, username]);
          await cmd(["ZINCRBY", "refcount", 1, ref]);
          await cmd(["ZADD", "reflog", user.ts, ref + ">" + username]);
        }
      }
    } catch (e) {}
    const session = await U.newSession(cmd, user);
    return res.status(200).json({ session, user: { username, email: user.email } });
  } catch (e) {
    return res.status(500).json({ error: "Server error. Check your Upstash environment variables." });
  }
};

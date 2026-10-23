const { cmd } = require("./_db");
const { validOwner, resolve } = require("./_plans");
const { auth } = require("./_user");
const crypto = require("crypto");

const MAX_BYTES = 900 * 1024; // Upstash free plan request limit is 1 MB
const RESERVED = ["api", "admin", "s", "www", "dashboard"];
const slug = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = req.body || {};
    const a = await auth(cmd, req);
    if (!a) return res.status(401).json({ error: "Please log in first.", code: "auth" });
    const owner = a.o;

    const html = typeof body.html === "string" ? body.html : "";
    if (!html.trim()) return res.status(400).json({ error: "File is empty." });
    if (Buffer.byteLength(html) > MAX_BYTES)
      return res.status(413).json({ error: "File is too large. Maximum is 900 KB." });

    let name = slug(body.name);
    const auto = !name;
    if (auto) {
      for (let i = 0; i < 5; i++) {
        name = crypto.randomBytes(3).toString("hex");
        if (!(await cmd(["GET", "tok:" + name]))) break;
      }
    }
    if (RESERVED.includes(name)) return res.status(400).json({ error: "That name is reserved. Choose another." });

    const existing = await cmd(["GET", "tok:" + name]);
    let token;
    if (existing) {
      // updating a site that already exists: needs the secret token, no limit check
      if (body.token !== existing)
        return res.status(403).json({ error: "That name is already taken. Choose another name." });
      token = existing;
    } else {
      // new site: check the plan limit
      const cur = await resolve(cmd, owner);
      const plan = cur.plan;
      const used = Number(await cmd(["SCARD", "owner:" + owner])) || 0;
      if (used >= cur.limit) {
        return res.status(402).json({
          code: "limit",
          error: "You have used all " + cur.limit + " sites on the " + plan.label + " plan. " +
            (cur.expired ? "Your paid plan has ended. Renew to add more sites." : "Upgrade to host more."),
        });
      }
      token = crypto.randomUUID();
      await cmd(["SET", "tok:" + name, token]);
      await cmd(["SET", "own:" + name, owner]);
      await cmd(["SADD", "owner:" + owner, name]);
    }
    await cmd(["SET", "site:" + name, html]);
    return res.status(200).json({ name, token });
  } catch (e) {
    return res.status(500).json({ error: "Server error. Check your Upstash environment variables." });
  }
};

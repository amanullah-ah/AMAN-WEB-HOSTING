// Admin only: see a user's sites, delete any site, ban or unban a user.
// A banned user cannot log in, and their existing sessions stop working.
const { cmd } = require("./_db");
const { isAdmin } = require("./_auth");
const cors = require("./_cors");

const parse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
const cleanName = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9-]/g, "");

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    if (!process.env.ADMIN_SECRET)
      return res.status(500).json({ error: "Add ADMIN_SECRET in Vercel Environment Variables, then redeploy." });
    const body = req.body || {};
    if (!isAdmin(body.secret)) return res.status(403).json({ error: "Wrong secret." });
    const action = String(body.action || "");

    if (action === "delsite") {
      const name = cleanName(body.name);
      if (!name) return res.status(400).json({ error: "Missing site name." });
      const owner = await cmd(["GET", "own:" + name]);
      await cmd(["DEL", "site:" + name]);
      await cmd(["DEL", "tok:" + name]);
      await cmd(["DEL", "views:" + name]);
      await cmd(["DEL", "own:" + name]);
      if (owner) await cmd(["SREM", "owner:" + owner, name]);
      return res.status(200).json({ ok: true });
    }

    const username = String(body.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: "Bad username." });
    const user = parse(await cmd(["GET", "user:" + username]));
    if (!user || !user.id) return res.status(404).json({ error: "User not found." });

    if (action === "sites") {
      const names = ((await cmd(["SMEMBERS", "owner:" + user.id])) || []).slice(0, 200).sort();
      let views = [];
      if (names.length) views = (await cmd(["MGET", ...names.map((n) => "views:" + n)])) || [];
      return res.status(200).json({ sites: names.map((n, i) => ({ name: n, views: Number(views[i]) || 0 })) });
    }

    if (action === "ban") {
      await cmd(["SET", "ban:" + user.id, "1"]);
      return res.status(200).json({ banned: true });
    }

    if (action === "unban") {
      await cmd(["DEL", "ban:" + user.id]);
      return res.status(200).json({ banned: false });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    return res.status(500).json({ error: "Server error." });
  }
};

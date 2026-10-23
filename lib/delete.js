const { cmd } = require("./_db");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = req.body || {};
    const name = String(body.name || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!name) return res.status(400).json({ error: "Missing site name." });

    const tok = await cmd(["GET", "tok:" + name]);
    if (!tok) return res.status(404).json({ error: "Site not found." });
    if (body.token !== tok) return res.status(403).json({ error: "You can't delete this site from this browser." });

    const owner = await cmd(["GET", "own:" + name]);
    await cmd(["DEL", "site:" + name]);
    await cmd(["DEL", "tok:" + name]);
    await cmd(["DEL", "views:" + name]);
    await cmd(["DEL", "own:" + name]);
    if (owner) await cmd(["SREM", "owner:" + owner, name]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Server error. Check your Upstash environment variables." });
  }
};

// Shows a payment screenshot, only with the secret link that belongs to that order.
const { cmd } = require("./_db");

module.exports = async (req, res) => {
  try {
    const id = String(req.query.id || ""), t = String(req.query.t || "");
    if (!/^[A-F0-9]{6}$/.test(id) || !/^[a-f0-9]{16}$/.test(t)) return res.status(404).send("Not found.");
    const meta = JSON.parse((await cmd(["GET", "order:" + id])) || "null");
    if (!meta || meta.tok !== t) return res.status(404).send("Not found.");
    const shot = await cmd(["GET", "shot:" + id]);
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(shot || "");
    if (!m) return res.status(404).send("Not found.");
    res.setHeader("Content-Type", m[1]);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(Buffer.from(m[2], "base64"));
  } catch (e) {
    return res.status(500).send("Server error.");
  }
};

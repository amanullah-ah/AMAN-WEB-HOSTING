const { cmd } = require("./_db");

module.exports = async (req, res) => {
  try {
    const m = /^Bearer ([a-f0-9]{64})$/.exec(String(req.headers.authorization || ""));
    if (m) await cmd(["DEL", "sess:" + m[1]]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
};

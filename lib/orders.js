// Admin only: list orders, view screenshot, approve, reject, remove.
const { cmd } = require("./_db");
const { grant } = require("./_plans");
const { isAdmin } = require("./_auth");

const idOk = (s) => typeof s === "string" && /^[A-F0-9]{6}$/.test(s);
const parse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };

const cors = require("./_cors");

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    if (!process.env.ADMIN_SECRET)
      return res.status(500).json({ error: "Add ADMIN_SECRET in Vercel Environment Variables, then redeploy." });
    const body = req.body || {};
    if (!isAdmin(body.secret)) return res.status(403).json({ error: "Wrong secret." });

    const action = String(body.action || "list");

    if (action === "list") {
      const ids = (await cmd(["ZREVRANGE", "orders", 0, 59])) || [];
      if (!ids.length) return res.status(200).json({ orders: [] });
      const vals = await cmd(["MGET", ...ids.map((i) => "order:" + i)]);
      const orders = vals.map(parse).filter(Boolean);
      return res.status(200).json({ orders });
    }

    if (!idOk(body.id)) return res.status(400).json({ error: "Bad order id." });
    const id = body.id;
    const meta = parse(await cmd(["GET", "order:" + id]));
    if (!meta) return res.status(404).json({ error: "Order not found." });

    if (action === "shot") {
      const shot = await cmd(["GET", "shot:" + id]);
      if (!shot) return res.status(404).json({ error: "Screenshot not found." });
      return res.status(200).json({ shot });
    }

    if (action === "approve") {
      if (meta.status === "approved") return res.status(400).json({ error: "Already approved." });
      // lock so a double tap cannot add the plan twice
      const lock = await cmd(["SET", "lock:" + id, "1", "NX", "EX", 30]);
      if (!lock) return res.status(409).json({ error: "Please wait a moment." });
      const g = await grant(cmd, meta.owner, meta.plan);
      meta.status = "approved"; meta.at = Date.now(); meta.exp = g.exp;
      await cmd(["SET", "order:" + id, JSON.stringify(meta)]);
      return res.status(200).json({ order: meta });
    }

    if (action === "reject") {
      if (meta.status === "approved") return res.status(400).json({ error: "Already approved." });
      meta.status = "rejected"; meta.at = Date.now();
      await cmd(["SET", "order:" + id, JSON.stringify(meta)]);
      return res.status(200).json({ order: meta });
    }

    if (action === "remove") {
      await cmd(["DEL", "order:" + id]);
      await cmd(["DEL", "shot:" + id]);
      await cmd(["ZREM", "orders", id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    return res.status(500).json({ error: "Server error." });
  }
};

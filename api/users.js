// Admin only: list every registered user with their plan.
const { cmd } = require("./_db");
const { resolve, load } = require("./_plans");
const { isAdmin } = require("./_auth");
const cors = require("./_cors");

const PAGE = 50;

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    if (!process.env.ADMIN_SECRET)
      return res.status(500).json({ error: "Add ADMIN_SECRET in Vercel Environment Variables, then redeploy." });
    const body = req.body || {};
    if (!isAdmin(body.secret)) return res.status(403).json({ error: "Wrong secret." });

    const offset = Math.max(0, parseInt(body.offset, 10) || 0);
    const total = Number(await cmd(["ZCARD", "users"])) || 0;
    const names = (await cmd(["ZREVRANGE", "users", offset, offset + PAGE - 1])) || [];
    const plans = await load(cmd);
    const users = (await Promise.all(names.map(async (n) => {
      let u = null;
      try { u = JSON.parse(await cmd(["GET", "user:" + n])); } catch (e) {}
      if (!u) return null;
      const cur = await resolve(cmd, u.id, plans);
      const used = Number(await cmd(["SCARD", "owner:" + u.id])) || 0;
      const banned = !!(await cmd(["GET", "ban:" + u.id]));
      return { banned, username: u.username, email: u.email, ts: u.ts, plan: cur.plan.label, planId: cur.id, exp: cur.exp, expired: cur.expired, was: cur.was ? plans[cur.was].label : "", wasId: cur.was, endedAt: cur.endedAt, used, limit: cur.limit, extra: cur.extra, refs: cur.refs, bonus: cur.bonus };
    }))).filter(Boolean);
    return res.status(200).json({ total, users });
  } catch (e) {
    return res.status(500).json({ error: "Server error." });
  }
};

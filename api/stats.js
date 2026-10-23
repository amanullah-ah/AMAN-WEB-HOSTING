// GET  ?names=a,b   -> view counts of sites (public)
// POST {v}          -> counts one visit of the hosting website (public, from index.html)
// POST {secret}     -> admin only: visitors + referral numbers
const { cmd } = require("./_db");
const { isAdmin } = require("./_auth");
const U = require("./_user");
const cors = require("./_cors");

const DAY = 86400000;
const day = (t) => new Date(t + 5 * 3600000).toISOString().slice(0, 10); // Pakistan time (UTC+5)

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  try {
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "POST") {
      const body = req.body || {};
      if (body.secret !== undefined) {
        if (!process.env.ADMIN_SECRET)
          return res.status(500).json({ error: "Add ADMIN_SECRET in Vercel Environment Variables, then redeploy." });
        if (!isAdmin(body.secret)) return res.status(403).json({ error: "Wrong secret." });
        const now = Date.now();
        const days = [];
        for (let i = 0; i < 14; i++) days.push(day(now - i * DAY));
        const [total, uall, users, refTotal, vals, uniq, top, recent] = await Promise.all([
          cmd(["GET", "vis:total"]), cmd(["PFCOUNT", "vis:uall"]), cmd(["ZCARD", "users"]), cmd(["ZCARD", "reflog"]),
          cmd(["MGET", ...days.map((d) => "vis:d:" + d)]),
          Promise.all(days.map((d) => cmd(["PFCOUNT", "vis:u:" + d]))),
          cmd(["ZREVRANGE", "refcount", 0, 14, "WITHSCORES"]),
          cmd(["ZREVRANGE", "reflog", 0, 29, "WITHSCORES"]),
        ]);
        const pairs = (a) => { const o = []; for (let i = 0; i < (a || []).length; i += 2) o.push([a[i], Number(a[i + 1])]); return o; };
        return res.status(200).json({
          total: Number(total) || 0, unique: Number(uall) || 0, users: Number(users) || 0, referrals: Number(refTotal) || 0,
          days: days.map((d, i) => ({ date: d, visits: Number(vals && vals[i]) || 0, unique: Number(uniq[i]) || 0 })),
          top: pairs(top).map((x) => ({ username: x[0], count: x[1] })),
          recent: pairs(recent).map((x) => { const m = String(x[0]).split(">"); return { referrer: m[0], user: m[1], ts: x[1] }; }),
        });
      }
      // a visit
      const v = String(body.v || "").replace(/[^a-z0-9]/gi, "").slice(0, 40);
      if (!v) return res.status(200).json({ ok: true });
      if (await U.limited(cmd, "rl:vis:" + U.ip(req), 60, 3600)) return res.status(200).json({ ok: true });
      const d = day(Date.now());
      await Promise.all([
        cmd(["INCR", "vis:total"]), cmd(["INCR", "vis:d:" + d]), cmd(["EXPIRE", "vis:d:" + d, 8000000]),
        cmd(["PFADD", "vis:uall", v]), cmd(["PFADD", "vis:u:" + d, v]), cmd(["EXPIRE", "vis:u:" + d, 8000000]),
      ]);
      return res.status(200).json({ ok: true });
    }
    const names = String(req.query.names || "")
      .split(",")
      .map((n) => n.toLowerCase().replace(/[^a-z0-9-]/g, ""))
      .filter(Boolean)
      .slice(0, 50);
    if (!names.length) return res.status(200).json({ views: {} });
    const vals = await cmd(["MGET", ...names.map((n) => "views:" + n)]);
    const views = {};
    names.forEach((n, i) => { views[n] = Number(vals && vals[i]) || 0; });
    return res.status(200).json({ views });
  } catch (e) {
    return res.status(500).json({ error: "Server error." });
  }
};

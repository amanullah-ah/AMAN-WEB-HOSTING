const { cmd } = require("./_db");
const { list, resolve, REF_BONUS } = require("./_plans");
const { auth } = require("./_user");

module.exports = async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const a = await auth(cmd, req);
    if (!a) return res.status(401).json({ error: "Please log in.", code: "auth" });
    if (req.query && req.query.orders) {
      // the user's own orders (newest first) - no screenshot data, no admin fields
      let ids = (await cmd(["ZREVRANGE", "uorders:" + a.o, 0, 19])) || [];
      let vals = ids.length ? await cmd(["MGET", ...ids.map((i) => "order:" + i)]) : [];
      if (!ids.length) {
        // orders placed before this feature: look in the recent global list
        const all = (await cmd(["ZREVRANGE", "orders", 0, 199])) || [];
        const v = all.length ? await cmd(["MGET", ...all.map((i) => "order:" + i)]) : [];
        vals = v.filter((x) => { try { return JSON.parse(x).owner === a.o; } catch (e) { return false; } }).slice(0, 20);
      }
      const orders = vals.map((x) => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean)
        .map((o) => ({ id: o.id, label: o.label, price: o.price, days: o.days, status: o.status, ts: o.ts, at: o.at || 0, exp: o.exp || 0 }));
      return res.status(200).json({ orders });
    }
    const cur = await resolve(cmd, a.o);
    const used = Number(await cmd(["SCARD", "owner:" + a.o])) || 0;
    let email = "", joined = 0;
    try { const u = JSON.parse(await cmd(["GET", "user:" + a.u])); email = u.email; joined = Number(u.ts) || 0; } catch (e) {}
    return res.status(200).json({
      user: { username: a.u, email, joined },
      plan: cur.id,
      label: cur.plan.label,
      limit: cur.limit,
      extra: cur.extra,
      bonus: cur.bonus,
      refs: cur.refs,
      refPer: REF_BONUS,
      exp: cur.exp,
      expired: cur.expired,
      used,
      plans: list(cur.plans),
    });
  } catch (e) {
    return res.status(500).json({ error: "Server error." });
  }
};

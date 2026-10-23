// GET: public list of plans.  POST (admin only): change price, days, sites and badge of the plans.
const { cmd } = require("./_db");
const { load, saveConfig, list } = require("./_plans");
const { isAdmin } = require("./_auth");
const cors = require("./_cors");

const num = (v) => (/^\d{1,7}$/.test(String(v).trim()) ? parseInt(v, 10) : NaN);

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  try {
    if (req.method === "POST") {
      if (!process.env.ADMIN_SECRET)
        return res.status(500).json({ error: "Add ADMIN_SECRET in Vercel Environment Variables, then redeploy." });
      const body = req.body || {};
      if (!isAdmin(body.secret)) return res.status(403).json({ error: "Wrong secret." });
      const cur = await load(cmd);
      const patch = {};
      const inc = body.plans && typeof body.plans === "object" ? body.plans : {};
      for (const id of Object.keys(inc)) {
        if (!cur[id]) continue;
        const v = inc[id] || {}, p = {};
        if (v.limit !== undefined) {
          const n = num(v.limit);
          if (!(n >= 1 && n <= 100000)) return res.status(400).json({ error: cur[id].label + ": sites must be a number from 1 to 100000." });
          p.limit = n;
        }
        if (id !== "free") {
          if (v.days !== undefined) {
            const n = num(v.days);
            if (!(n >= 1 && n <= 3650)) return res.status(400).json({ error: cur[id].label + ": days must be a number from 1 to 3650." });
            p.days = n;
          }
          if (v.price !== undefined) {
            let pr = String(v.price).trim().slice(0, 20);
            if (/^\d+$/.test(pr)) pr = "Rs " + pr; // 800 -> Rs 800
            p.price = pr;
          }
          if (v.tag !== undefined) p.tag = String(v.tag).trim().slice(0, 20);
        }
        patch[id] = p;
      }
      await saveConfig(cmd, patch);
      return res.status(200).json({ plans: list(await load(cmd)) });
    }
    res.setHeader("Cache-Control", "public, s-maxage=10");
    return res.status(200).json({ plans: list(await load(cmd)) });
  } catch (e) {
    return res.status(500).json({ error: "Server error." });
  }
};

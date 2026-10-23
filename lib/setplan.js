// Admin only: give a plan, remove a paid plan, add/remove days, set an end date, or give extra sites.
// "grant" uses the same grant() as order approval, so days are added after a running plan.
const { cmd } = require("./_db");
const { load, grant, resolve, DAY } = require("./_plans");
const { isAdmin } = require("./_auth");
const cors = require("./_cors");

// Same shape the Users list uses, so the admin panel can refresh one row.
async function view(owner, plans) {
  const cur = await resolve(cmd, owner, plans);
  const used = Number(await cmd(["SCARD", "owner:" + owner])) || 0;
  return {
    plan: cur.plan.label, planId: cur.id, exp: cur.exp, expired: cur.expired,
    was: cur.was ? plans[cur.was].label : "", wasId: cur.was, endedAt: cur.endedAt,
    used, limit: cur.limit, extra: cur.extra, refs: cur.refs, bonus: cur.bonus,
  };
}

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    if (!process.env.ADMIN_SECRET)
      return res.status(500).json({ error: "Add ADMIN_SECRET in Vercel Environment Variables, then redeploy." });
    const body = req.body || {};
    if (!isAdmin(body.secret)) return res.status(403).json({ error: "Wrong secret." });

    const username = String(body.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: "Bad username." });
    let user = null;
    try { user = JSON.parse(await cmd(["GET", "user:" + username])); } catch (e) {}
    if (!user || !user.id) return res.status(404).json({ error: "User not found." });

    const plans = await load(cmd);
    const action = String(body.action || "");

    if (action === "grant") {
      const planId = String(body.plan || "");
      if (!plans[planId] || planId === "free") return res.status(400).json({ error: "Choose a paid plan." });
      await grant(cmd, user.id, planId, plans);
      return res.status(200).json(await view(user.id, plans));
    }

    if (action === "revoke") {
      await cmd(["SET", "plan:" + user.id, "free"]);
      await cmd(["DEL", "exp:" + user.id]);
      return res.status(200).json(await view(user.id, plans));
    }

    if (action === "days" || action === "setexp") {
      // these change the end date of a paid plan, so the user must have had one
      const pid = await cmd(["GET", "plan:" + user.id]);
      const raw = Number(await cmd(["GET", "exp:" + user.id])) || 0;
      if (!pid || pid === "free" || !plans[pid] || !raw)
        return res.status(400).json({ error: "This user has no paid plan. Give a plan first (+ Weekly / + Monthly / + Yearly)." });
      let exp;
      if (action === "days") {
        const d = parseInt(body.days, 10);
        if (!Number.isInteger(d) || d === 0 || Math.abs(d) > 3650) return res.status(400).json({ error: "Days must be a number like 1, 2 or -1." });
        // adding days to an ended plan starts from today, so it really comes back
        const base = d > 0 && raw < Date.now() ? Date.now() : raw;
        exp = base + d * DAY;
      } else {
        exp = Number(body.exp);
        if (!Number.isFinite(exp) || exp < Date.now() - 3650 * DAY || exp > Date.now() + 3650 * DAY)
          return res.status(400).json({ error: "Choose a valid date." });
      }
      await cmd(["SET", "exp:" + user.id, String(Math.round(exp))]);
      return res.status(200).json(await view(user.id, plans));
    }

    if (action === "extra") {
      const n = parseInt(body.extra, 10);
      if (!Number.isInteger(n) || n < 0 || n > 10000) return res.status(400).json({ error: "Extra sites must be a number from 0 to 10000." });
      if (n === 0) await cmd(["DEL", "xsite:" + user.id]); else await cmd(["SET", "xsite:" + user.id, String(n)]);
      return res.status(200).json(await view(user.id, plans));
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    return res.status(500).json({ error: "Server error." });
  }
};

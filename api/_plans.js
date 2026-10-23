// Plans. The defaults below are used until you change them from the admin panel (Plans page).
// Changes made in the admin panel are saved in the database and win over these defaults.
// limit = how many sites the user can host.
// days  = how long a paid plan lasts (0 = free, never ends).
// price is just text shown in the upgrade window (leave '' to hide it).
// tag   = small badge shown next to the plan name (optional).
const DEFAULTS = {
  free:    { label: "Free",    limit: 5,   days: 0,   price: "" },
  weekly:  { label: "Weekly",  limit: 100, days: 7,   price: "Rs 400" },
  monthly: { label: "Monthly", limit: 100, days: 30,  price: "Rs 800",  tag: "Popular" },
  yearly:  { label: "Yearly",  limit: 100, days: 365, price: "Rs 1500", tag: "Best value" },
};

const DAY = 86400000;
const REF_BONUS = 5; // extra sites the referrer gets for every friend who joins with their link
const CFG_KEY = "plancfg";
const isInt = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;

// Defaults + whatever the admin saved (price, days, sites, badge).
async function load(cmd) {
  let cfg = {};
  try { cfg = JSON.parse(await cmd(["GET", CFG_KEY])) || {}; } catch (e) { cfg = {}; }
  const out = {};
  Object.keys(DEFAULTS).forEach((id) => {
    const d = DEFAULTS[id], c = cfg[id] || {};
    const p = { label: d.label, limit: isInt(c.limit, 1, 100000) ? c.limit : d.limit, days: 0, price: "" };
    if (id !== "free") {
      p.days = isInt(c.days, 1, 3650) ? c.days : d.days;
      p.price = typeof c.price === "string" ? c.price : d.price;
      const tag = typeof c.tag === "string" ? c.tag : d.tag || "";
      if (tag) p.tag = tag;
    }
    out[id] = p;
  });
  return out;
}
async function saveConfig(cmd, patch) {
  let cfg = {};
  try { cfg = JSON.parse(await cmd(["GET", CFG_KEY])) || {}; } catch (e) { cfg = {}; }
  Object.keys(patch).forEach((id) => { cfg[id] = Object.assign({}, cfg[id], patch[id]); });
  await cmd(["SET", CFG_KEY, JSON.stringify(cfg)]);
}

const list = (plans) => Object.keys(plans).map((id) => ({ id, ...plans[id] }));
const get = (plans, id) => plans[id] || plans.free;
const validOwner = (o) => typeof o === "string" && /^[a-z0-9-]{8,64}$/.test(o);

// Reads the owner's plan and checks whether it has ended.
// limit = plan sites + extra sites the admin gave + 5 sites per referred friend.
// A site keeps running after the plan ends; the owner just cannot add new sites until they renew.
async function resolve(cmd, owner, plans) {
  plans = plans || (await load(cmd));
  let id = (await cmd(["GET", "plan:" + owner])) || "free";
  if (!plans[id]) id = "free";
  let exp = Number(await cmd(["GET", "exp:" + owner])) || 0;
  let expired = false, was = "", endedAt = 0;
  if (id !== "free" && exp && Date.now() > exp) { expired = true; was = id; endedAt = exp; id = "free"; }
  if (id === "free") exp = 0;
  const extra = Math.max(0, Number(await cmd(["GET", "xsite:" + owner])) || 0);
  const refs = Number(await cmd(["ZCARD", "refs:" + owner])) || 0;
  const bonus = refs * REF_BONUS;
  const plan = plans[id];
  return { id, plan, plans, exp, expired, was, endedAt, extra, refs, bonus, limit: plan.limit + extra + bonus };
}

// Gives a paid plan to an owner. If a plan is still running, the new days are added after the current end date.
async function grant(cmd, owner, planId, plans) {
  plans = plans || (await load(cmd));
  const cur = await resolve(cmd, owner, plans);
  const active = cur.id !== "free" && cur.exp > Date.now();
  const start = active ? cur.exp : Date.now();
  const exp = start + plans[planId].days * DAY;
  const keep = active && plans[cur.id].days >= plans[planId].days ? cur.id : planId;
  await cmd(["SET", "plan:" + owner, keep]);
  await cmd(["SET", "exp:" + owner, String(exp)]);
  return { plan: keep, label: plans[keep].label, exp };
}

// Turns 0300 1234567 / +92 300 1234567 into 923001234567 (digits only, for wa.me links).
function normPhone(s) {
  let d = String(s || "").replace(/\D/g, "");
  if (d.indexOf("00") === 0) d = d.slice(2);
  if (d.charAt(0) === "0") d = "92" + d.slice(1);
  return d;
}

module.exports = { DEFAULTS, DAY, REF_BONUS, load, saveConfig, list, get, validOwner, resolve, grant, normPhone };

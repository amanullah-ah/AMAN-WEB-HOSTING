// A user sends a payment order: plan + WhatsApp number + payment screenshot.
// It is saved so you can approve it from the admin panel.
const { cmd } = require("./_db");
const { load, validOwner, normPhone } = require("./_plans");
const { auth } = require("./_user");
const crypto = require("crypto");

const MAX_SHOT = 650 * 1024; // decoded image size; Upstash free plan request limit is 1 MB

function imageOk(buf) {
  const h = buf.subarray(0, 12);
  const jpg = h[0] === 0xff && h[1] === 0xd8;
  const png = h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47;
  const webp = h.toString("ascii", 0, 4) === "RIFF" && h.toString("ascii", 8, 12) === "WEBP";
  return jpg || png || webp;
}

// Uploads the image to ImgBB (needs IMGBB_API_KEY). Returns the link, or "" if not set up / failed.
async function imgbb(base64) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) return "";
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch("https://api.imgbb.com/1/upload?key=" + encodeURIComponent(key), {
      method: "POST",
      body: new URLSearchParams({ image: base64 }),
      signal: ctl.signal,
    });
    clearTimeout(t);
    const d = await r.json();
    return d && d.success && d.data && d.data.url ? String(d.data.url) : "";
  } catch (e) { return ""; }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = req.body || {};
    const a = await auth(cmd, req);
    if (!a) return res.status(401).json({ error: "Please log in first.", code: "auth" });
    const owner = a.o;

    const planId = String(body.plan || "");
    const PLANS = await load(cmd);
    if (!PLANS[planId] || planId === "free") return res.status(400).json({ error: "Choose a paid plan." });

    const whatsapp = normPhone(body.whatsapp);
    if (!/^\d{11,15}$/.test(whatsapp)) return res.status(400).json({ error: "Enter a valid WhatsApp number." });

    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.shot || ""));
    if (!m) return res.status(400).json({ error: "Add your payment screenshot." });
    const buf = Buffer.from(m[2], "base64");
    if (!buf.length || buf.length > MAX_SHOT) return res.status(413).json({ error: "Screenshot is too large." });
    if (!imageOk(buf)) return res.status(400).json({ error: "That file is not a valid image." });

    // simple spam guard: 5 orders per hour per browser
    const n = Number(await cmd(["INCR", "rl:order:" + owner])) || 1;
    if (n === 1) await cmd(["EXPIRE", "rl:order:" + owner, 3600]);
    if (n > 5) return res.status(429).json({ error: "Too many orders. Please try again later." });

    const plan = PLANS[planId];
    const id = crypto.randomBytes(3).toString("hex").toUpperCase();
    const ts = Date.now();
    const tok = crypto.randomBytes(8).toString("hex");
    let link = await imgbb(m[2]);
    // fallback: private link on your own site (only works for people who have the secret link)
    if (!link) link = "https://" + (req.headers["x-forwarded-host"] || req.headers.host) + "/api/shot?id=" + id + "&t=" + tok;
    let email = "";
    try { email = JSON.parse(await cmd(["GET", "user:" + a.u])).email; } catch (e) {}
    const meta = { id, owner, username: a.u, email, plan: planId, label: plan.label, price: plan.price, days: plan.days, whatsapp, ts, status: "pending", tok, link };
    await cmd(["SET", "shot:" + id, m[0]]);
    await cmd(["SET", "order:" + id, JSON.stringify(meta)]);
    await cmd(["ZADD", "orders", ts, id]);
    await cmd(["ZADD", "uorders:" + owner, ts, id]);
    return res.status(200).json({ ok: true, id, link, label: plan.label, price: plan.price, days: plan.days });
  } catch (e) {
    return res.status(500).json({ error: "Server error. Check your Upstash environment variables." });
  }
};

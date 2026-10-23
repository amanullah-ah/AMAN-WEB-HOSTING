// Accounts: Gmail + username + password. Passwords are stored as scrypt hashes, never as plain text.
const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);

const SESSION_SECONDS = 30 * 24 * 3600;

// Gmail ignores dots and +tags, so a.b+x@gmail.com and ab@gmail.com are the same inbox.
function normEmail(e) {
  e = String(e || "").trim().toLowerCase();
  if (e.length > 60) return null;
  const m = /^([a-z0-9._+-]+)@gmail\.com$/.exec(e);
  if (!m) return null;
  const local = m[1].split("+")[0].replace(/\./g, "");
  if (local.length < 6) return null;
  return { shown: e, key: local + "@gmail.com" };
}
const validUser = (u) => typeof u === "string" && /^[a-z0-9_]{3,20}$/.test(u);
const validPass = (p) => typeof p === "string" && p.length >= 6 && p.length <= 100;

async function hash(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const h = await scrypt(pw, salt, 64);
  return { salt, hash: h.toString("hex") };
}
async function verify(pw, salt, hashHex) {
  const h = await scrypt(pw, salt, 64);
  const b = Buffer.from(hashHex, "hex");
  return b.length === h.length && crypto.timingSafeEqual(h, b);
}

async function newSession(cmd, user) {
  const t = crypto.randomBytes(32).toString("hex");
  await cmd(["SET", "sess:" + t, JSON.stringify({ o: user.id, u: user.username }), "EX", SESSION_SECONDS]);
  return t;
}
// Reads the logged-in user from the "Authorization: Bearer <session>" header. Returns { o: ownerId, u: username } or null.
async function auth(cmd, req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(String((req.headers && req.headers.authorization) || ""));
  if (!m) return null;
  const v = await cmd(["GET", "sess:" + m[1]]);
  let s = null;
  try { s = v ? JSON.parse(v) : null; } catch (e) { return null; }
  if (s && (await cmd(["GET", "ban:" + s.o]))) return null; // banned by admin
  return s;
}
const ip = (req) => String((req.headers && req.headers["x-forwarded-for"]) || "x").split(",")[0].trim().slice(0, 45);

// Counts hits in a time window. Returns true when the limit is passed.
async function limited(cmd, key, max, seconds) {
  const n = Number(await cmd(["INCR", key])) || 1;
  if (n === 1) await cmd(["EXPIRE", key, seconds]);
  return n > max;
}

module.exports = { normEmail, validUser, validPass, hash, verify, newSession, auth, ip, limited };

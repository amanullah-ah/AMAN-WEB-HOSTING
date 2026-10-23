const crypto = require("crypto");

function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const isAdmin = (secret) => !!process.env.ADMIN_SECRET && same(secret || "", process.env.ADMIN_SECRET);

module.exports = { same, isAdmin };

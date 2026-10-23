// Lets the local admin file (opened from your phone/computer) talk to this site.
// Every admin action still needs your ADMIN_SECRET.
module.exports = function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
};

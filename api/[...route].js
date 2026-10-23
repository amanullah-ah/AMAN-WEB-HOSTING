// ONE serverless function for the whole API.
// Vercel Hobby allows max 12 functions per deployment, so every handler now lives in /lib
// and this single file sends each /api/<name> request to the right handler.
// (Static require() on purpose: Vercel only bundles files it can see.)
const HANDLERS = {
  "delete":   require("../lib/delete"),
  "deploy":   require("../lib/deploy"),
  "login":    require("../lib/login"),
  "logout":   require("../lib/logout"),
  "manage":   require("../lib/manage"),
  "me":       require("../lib/me"),
  "order":    require("../lib/order"),
  "orders":   require("../lib/orders"),
  "plans":    require("../lib/plans"),
  "register": require("../lib/register"),
  "s":        require("../lib/s"),
  "setplan":  require("../lib/setplan"),
  "shot":     require("../lib/shot"),
  "stats":    require("../lib/stats"),
  "users":    require("../lib/users"),
};

module.exports = async (req, res) => {
  let route = req.query && req.query.route;
  if (Array.isArray(route)) route = route.join("/");
  if (!route) {
    try { route = new URL(req.url, "http://x").pathname.replace(/^\/api\/?/, ""); } catch (e) { route = ""; }
  }
  route = String(route).replace(/^\/+|\/+$/g, "");
  const handler = Object.prototype.hasOwnProperty.call(HANDLERS, route) ? HANDLERS[route] : null;
  if (!handler) { res.status(404).json({ error: "Not found" }); return; }
  return handler(req, res);
};

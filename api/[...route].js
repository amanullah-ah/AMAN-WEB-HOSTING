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
  let path = "";
  try { path = new URL(req.url, "http://x").pathname; } catch (e) {}

  const m = path.match(/^\/s\/([^\/]+)/);
  if (m) {
    route = "s";
    if (!req.query) req.query = {};
    if (!req.query.name) { try { req.query.name = decodeURIComponent(m[1]); } catch (e) { req.query.name = m[1]; } }
  }

  if (!route) route = path.replace(/^\/api\/?/, "");
  route = String(route).replace(/^\/+|\/+$/g, "");
  const handler = Object.prototype.hasOwnProperty.call(HANDLERS, route) ? HANDLERS[route] : null;
  if (!handler) { res.status(404).json({ error: "Not found" }); return; }
  return handler(req, res);
};

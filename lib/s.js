const { cmd } = require("./_db");

const NOT_FOUND = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Site not found</title>
<link rel="icon" type="image/png" href="https://ik.imagekit.io/amanphoto/aman-favicon.png?updatedAt=1792410434567">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#080a12;color:#eef0f7;font-family:system-ui,-apple-system,sans-serif;text-align:center}
.box{max-width:380px}
.n{font-size:4.5rem;font-weight:900;margin:0;background:linear-gradient(90deg,#7c6bff,#35d0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
p{color:#a0a7bd;line-height:1.55}
a{display:inline-block;margin-top:10px;padding:13px 22px;border-radius:14px;background:#ffa21a;color:#1b1100;font-weight:700;text-decoration:none}
</style></head><body><div class="box"><h1 class="n">404</h1>
<p>This site does not exist, or it was deleted by its owner.</p>
<a href="/">Host your own site</a></div></body></html>`;

module.exports = async (req, res) => {
  const name = String(req.query.name || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  try {
    const html = name ? await cmd(["GET", "site:" + name]) : null;
    if (!html) {
      res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(NOT_FOUND);
    }
    if (!req.query.nv) {
      try { await cmd(["INCR", "views:" + name]); } catch (e) {}
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // sandbox = the page runs in its own isolated origin, so it cannot steal logins from this site
    res.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).send("Server error.");
  }
};

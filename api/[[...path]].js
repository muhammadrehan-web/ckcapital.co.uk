const { handleApi } = require("../lib/api");

module.exports = async function (req, res) {
  try {
    const current = new URL(req.url || "/", "http://localhost");
    if (!current.pathname.startsWith("/api/")) {
      req.url = "/api" + (current.pathname.startsWith("/") ? current.pathname : "/" + current.pathname) + current.search;
    }
    const handled = await handleApi(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.end("Not found");
    }
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false }));
  }
};

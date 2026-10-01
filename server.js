const fs = require("fs");
const http = require("http");
const path = require("path");
const { handleApi, setup } = require("./lib/api");

const bundledPages = [
  path.join(__dirname, "index.html"),
  path.join(__dirname, "about.html"),
  path.join(__dirname, "affiliate.html"),
  path.join(__dirname, "faq.html"),
  path.join(__dirname, "forgot.html"),
  path.join(__dirname, "signin.html"),
  path.join(__dirname, "signup.html"),
  path.join(__dirname, "portal.html")
];
void bundledPages;

function projectRoot() {
  const candidates = [process.cwd(), __dirname, path.join(__dirname, "..")];
  for (let i = 0; i < candidates.length; i++) {
    if (fs.existsSync(path.join(candidates[i], "index.html")) && fs.existsSync(path.join(candidates[i], "css", "styles.css"))) {
      return candidates[i];
    }
  }
  for (let i = 0; i < candidates.length; i++) {
    if (fs.existsSync(path.join(candidates[i], "index.html"))) return candidates[i];
  }
  return __dirname;
}

const root = projectRoot();
const port = 3018;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json"
};

function staticFile(urlPath) {
  const pathname = decodeURIComponent(urlPath.split("?")[0]);
  const rel = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const candidates = [
    path.join(root, rel),
    path.join(root, rel + ".html"),
    path.join(root, rel, "index.html")
  ];
  for (let i = 0; i < candidates.length; i++) {
    const file = candidates[i];
    if (!file.startsWith(root)) continue;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, "http://localhost");
  try {
    if (await handleApi(req, res)) return;
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }
  const file = staticFile(url.pathname === "/" ? "/index.html" : url.pathname);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
});

setup().then(function () {
  server.listen(port, "127.0.0.1", function () {
    console.log("CK Capital is running at http://localhost:" + port + "/");
  });
}).catch(function (error) {
  console.error("Database connection failed");
  console.error(error.message);
  process.exit(1);
});

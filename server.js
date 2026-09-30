const fs = require("fs");
const http = require("http");
const path = require("path");
const { Pool } = require("pg");

const root = __dirname;
const port = 3018;

function loadEnv() {
  const file = path.join(root, ".env");
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(function (line) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  });
}

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on("data", function (chunk) { chunks.push(chunk); });
    req.on("end", function () {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const profileColumns = ["nickname", "first_name", "last_name", "country_code", "contact", "email", "country", "city"];

async function setup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id integer PRIMARY KEY DEFAULT 1,
      nickname text NOT NULL DEFAULT '',
      first_name text NOT NULL DEFAULT '',
      last_name text NOT NULL DEFAULT '',
      country_code text NOT NULL DEFAULT '',
      contact text NOT NULL DEFAULT '',
      email text NOT NULL DEFAULT '',
      country text NOT NULL DEFAULT '',
      city text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT profiles_single CHECK (id = 1)
    )
  `);
  await pool.query("INSERT INTO profiles (id) VALUES (1) ON CONFLICT (id) DO NOTHING");
}

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/api/health" && req.method === "GET") {
      const result = await pool.query("SELECT current_database() AS database");
      sendJson(res, 200, { ok: true, database: result.rows[0].database });
      return;
    }
    if (url.pathname === "/api/profile" && req.method === "GET") {
      const result = await pool.query("SELECT nickname, first_name, last_name, country_code, contact, email, country, city FROM profiles WHERE id = 1");
      sendJson(res, 200, { profile: result.rows[0] || {} });
      return;
    }
    if (url.pathname === "/api/profile" && req.method === "POST") {
      const body = await readBody(req);
      const values = profileColumns.map(function (column) { return String(body[column] || ""); });
      await pool.query(
        "UPDATE profiles SET nickname = $1, first_name = $2, last_name = $3, country_code = $4, contact = $5, email = $6, country = $7, city = $8, updated_at = now() WHERE id = 1",
        values
      );
      sendJson(res, 200, { ok: true });
      return;
    }
  } catch (error) {
    sendJson(res, 500, { ok: false });
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

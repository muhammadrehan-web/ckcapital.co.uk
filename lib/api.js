const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { Pool } = require("pg");
const { sendWelcomeEmail } = require("./mail");

const scrypt = promisify(crypto.scrypt);

function loadEnv() {
  const file = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(function (line) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  });
}

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1
});

const PLANS = {
  standard: "Standard",
  middle: "Middleweight",
  light: "Lightweight",
  onestep: "1 Step Standard",
  instant: "Instant Funding"
};
const LIST_PRICES = {
  "5K": 64,
  "10K": 193.33,
  "25K": 228,
  "50K": 360.8,
  "100K": 763.33,
  "200K": 2115,
  "300K": 3281.67
};
const INSTANT_LIST = {
  "5K": 160,
  "10K": 260,
  "25K": 463.33,
  "50K": 915,
  "100K": 1830,
  "200K": 3660
};

function moneyAmount(amount) {
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
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

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return salt + ":" + key.toString("hex");
}

async function verifyPassword(password, stored) {
  const parts = String(stored || "").split(":");
  if (parts.length !== 2) return false;
  const key = await scrypt(password, parts[0], 64);
  const previous = Buffer.from(parts[1], "hex");
  if (key.length !== previous.length) return false;
  return crypto.timingSafeEqual(key, previous);
}

function cookies(req) {
  const out = {};
  String(req.headers.cookie || "").split(";").forEach(function (part) {
    const index = part.indexOf("=");
    if (index < 1) return;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  });
  return out;
}

function cookieFlags(req) {
  const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return "; HttpOnly; Path=/; SameSite=Lax" + secure;
}

function sessionCookie(token, req) {
  return "ck_session=" + encodeURIComponent(token) + cookieFlags(req) + "; Max-Age=1209600";
}

async function currentUser(req) {
  const token = cookies(req).ck_session;
  if (!token) return null;
  const result = await pool.query(
    "SELECT u.id, u.first_name, u.last_name, u.nickname, u.country_code, u.contact, u.email, u.country, u.city FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires_at > now()",
    [token]
  );
  return result.rows[0] || null;
}

let ready = null;
function setup() {
  if (!ready) {
    ready = (async function () {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          first_name text NOT NULL,
          last_name text NOT NULL,
          nickname text NOT NULL DEFAULT '',
          country_code text NOT NULL DEFAULT '',
          contact text NOT NULL DEFAULT '',
          email text NOT NULL UNIQUE,
          country text NOT NULL DEFAULT '',
          city text NOT NULL DEFAULT '',
          password_hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          token text PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at timestamptz NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email text NOT NULL,
          buyer_name text NOT NULL,
          plan_id text NOT NULL,
          plan_name text NOT NULL,
          account_size text NOT NULL,
          platform text NOT NULL,
          price text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash text NOT NULL UNIQUE,
          expires_at timestamptz NOT NULL,
          used_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
    })().catch(function (error) {
      ready = null;
      throw error;
    });
  }
  return ready;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function startSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + interval '14 days')",
    [token, user.id]
  );
  return token;
}

async function handleApi(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith("/api/")) return false;
  await setup();
  if (url.pathname === "/api/health" && req.method === "GET") {
    const result = await pool.query("SELECT current_database() AS database");
    sendJson(res, 200, { ok: true, database: result.rows[0].database });
    return true;
  }
  if (url.pathname === "/api/signup" && req.method === "POST") {
    const body = await readBody(req);
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const nickName = String(body.nickName || "").trim();
    const code = String(body.code || "").trim();
    const contact = String(body.contact || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const confirmEmail = String(body.confirmEmail || "").trim().toLowerCase();
    const country = String(body.country || "").trim();
    const city = String(body.city || "").trim();
    const password = String(body.password || "");
    if (!firstName || !lastName || !nickName || !code || !contact || !email || !confirmEmail || !country || !city || !password || !body.robot) {
      sendJson(res, 400, { error: "Fill every field before signing up." });
      return true;
    }
    if (!isEmail(email) || email !== confirmEmail) {
      sendJson(res, 400, { error: "Email addresses do not match." });
      return true;
    }
    if (password.length < 6) {
      sendJson(res, 400, { error: "Password must be at least 6 characters." });
      return true;
    }
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length) {
      sendJson(res, 409, { error: "This email is already registered." });
      return true;
    }
    const passwordHash = await hashPassword(password);
    const inserted = await pool.query(
      "INSERT INTO users (first_name, last_name, nickname, country_code, contact, email, country, city, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, first_name, last_name, email",
      [firstName, lastName, nickName, code, contact, email, country, city, passwordHash]
    );
    const token = await startSession(inserted.rows[0]);
    res.setHeader("Set-Cookie", sessionCookie(token, req));
    let emailSent = false;
    try {
      const mail = await sendWelcomeEmail({ name: firstName, email: inserted.rows[0].email });
      emailSent = mail.sent;
    } catch (error) {
      console.error("Welcome email failed");
    }
    sendJson(res, 200, { ok: true, email: inserted.rows[0].email, emailSent: emailSent });
    return true;
  }
  if (url.pathname === "/api/login" && req.method === "POST") {
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const found = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
    const user = found.rows[0];
    if (!user) {
      sendJson(res, 401, { error: "This email is not registered." });
      return true;
    }
    if (!(await verifyPassword(password, user.password_hash))) {
      sendJson(res, 401, { error: "The password does not match this account." });
      return true;
    }
    const token = await startSession(user);
    res.setHeader("Set-Cookie", sessionCookie(token, req));
      sendJson(res, 200, { ok: true, email: user.email });
      return true;
    }
    if (url.pathname === "/api/forgot" && req.method === "POST") {
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      if (!isEmail(email)) {
        sendJson(res, 400, { error: "Enter a valid email." });
        return true;
      }
      const found = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (!found.rows[0]) {
        sendJson(res, 401, { error: "This email is not registered." });
        return true;
      }
      const token = crypto.randomBytes(32).toString("hex");
      await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL", [found.rows[0].id]);
      await pool.query(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
        [found.rows[0].id, hashToken(token)]
      );
      sendJson(res, 200, { ok: true, token: token });
      return true;
    }
    if (url.pathname === "/api/reset" && req.method === "POST") {
      const body = await readBody(req);
      const token = String(body.token || "");
      const password = String(body.password || "");
      const confirm = String(body.confirm || "");
      if (password.length < 6) {
        sendJson(res, 400, { error: "Password must be at least 6 characters." });
        return true;
      }
      if (password !== confirm) {
        sendJson(res, 400, { error: "Passwords do not match." });
        return true;
      }
      const rows = await pool.query(
        "SELECT id, user_id FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() LIMIT 1",
        [hashToken(token)]
      );
      if (!rows.rows[0]) {
        sendJson(res, 400, { error: "This reset has expired. Enter your email again." });
        return true;
      }
      const passwordHash = await hashPassword(password);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, rows.rows[0].user_id]);
      await pool.query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [rows.rows[0].id]);
      await pool.query("DELETE FROM sessions WHERE user_id = $1", [rows.rows[0].user_id]);
      sendJson(res, 200, { ok: true });
      return true;
    }
    if (url.pathname === "/api/logout" && req.method === "POST") {
    const token = cookies(req).ck_session;
    if (token) await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
    res.setHeader("Set-Cookie", "ck_session=; HttpOnly; Path=/; Max-Age=0" + (req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""));
    sendJson(res, 200, { ok: true });
    return true;
  }
  if (url.pathname === "/api/me" && req.method === "GET") {
    const user = await currentUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Sign in is required." });
      return true;
    }
    sendJson(res, 200, { user: { email: user.email, firstName: user.first_name, lastName: user.last_name } });
    return true;
  }
  if (url.pathname === "/api/profile" && req.method === "GET") {
    const user = await currentUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Sign in is required." });
      return true;
    }
    sendJson(res, 200, { profile: user });
    return true;
  }
  if (url.pathname === "/api/profile" && req.method === "POST") {
    const user = await currentUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Sign in is required." });
      return true;
    }
    const body = await readBody(req);
    const email = String(body.email || user.email).trim().toLowerCase();
    if (!isEmail(email)) {
      sendJson(res, 400, { error: "Enter a valid email." });
      return true;
    }
    const taken = await pool.query("SELECT id FROM users WHERE email = $1 AND id <> $2", [email, user.id]);
    if (taken.rows.length) {
      sendJson(res, 409, { error: "This email is already registered." });
      return true;
    }
    await pool.query(
      "UPDATE users SET nickname = $1, first_name = $2, last_name = $3, country_code = $4, contact = $5, email = $6, country = $7, city = $8 WHERE id = $9",
      [String(body.nickname || ""), String(body.first_name || ""), String(body.last_name || ""), String(body.country_code || ""), String(body.contact || ""), email, String(body.country || ""), String(body.city || ""), user.id]
    );
    sendJson(res, 200, { ok: true });
    return true;
  }
  if (url.pathname === "/api/password" && req.method === "POST") {
    const user = await currentUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Sign in is required." });
      return true;
    }
    const body = await readBody(req);
    const current = String(body.current_password || "");
    const next = String(body.new_password || "");
    const verify = String(body.verifyPassword || "");
    if (!current || !next || !verify) {
      sendJson(res, 400, { error: "Fill every password field." });
      return true;
    }
    if (next.length < 6) {
      sendJson(res, 400, { error: "Password must be at least 6 characters." });
      return true;
    }
    if (next !== verify) {
      sendJson(res, 400, { error: "Passwords do not match." });
      return true;
    }
    const row = await pool.query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
    if (!row.rows[0] || !(await verifyPassword(current, row.rows[0].password_hash))) {
      sendJson(res, 401, { error: "The current password does not match." });
      return true;
    }
    const passwordHash = await hashPassword(next);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, user.id]);
    sendJson(res, 200, { ok: true });
    return true;
  }
  if (url.pathname === "/api/orders" && req.method === "GET") {
    const user = await currentUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Sign in is required." });
      return true;
    }
    const result = await pool.query(
      "SELECT id, plan_name, account_size, platform, price, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id]
    );
    sendJson(res, 200, { orders: result.rows });
    return true;
  }
  if (url.pathname === "/api/orders" && req.method === "POST") {
    const user = await currentUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Sign in is required." });
      return true;
    }
    const body = await readBody(req);
    const planId = String(body.planId || "");
    const size = String(body.size || "");
    const platform = String(body.platform || "");
    const method = String(body.method || "card");
    const base = planId === "instant" ? INSTANT_LIST[size] : LIST_PRICES[size];
    if (!PLANS[planId] || base == null || (platform !== "mt5" && platform !== "tradelocker") || (method !== "card" && method !== "crypto" && method !== "paymid")) {
      sendJson(res, 400, { error: "That challenge was not found." });
      return true;
    }
    const price = moneyAmount(method === "crypto" ? Math.round(base * 95) / 100 : base);
    const buyer = (user.first_name + " " + user.last_name).trim();
    const inserted = await pool.query(
      "INSERT INTO orders (user_id, email, buyer_name, plan_id, plan_name, account_size, platform, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, plan_name, account_size, platform, price",
      [user.id, user.email, buyer, planId, PLANS[planId], size, platform, price]
    );
    sendJson(res, 200, { order: inserted.rows[0] });
    return true;
  }
  sendJson(res, 404, { error: "Not found" });
  return true;
}

module.exports = { handleApi, setup };

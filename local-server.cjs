const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT_DIR = process.cwd();

function loadEnvFile(filename) {
  const fullPath = path.join(ROOT_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 1) {
      return;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

function sendText(res, statusCode, text) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}

function resolveStaticPath(requestPath) {
  let pathname = requestPath;
  if (pathname === "/") {
    pathname = "/login.html";
  }

  const hasExtension = path.extname(pathname) !== "";
  const candidatePaths = hasExtension
    ? [pathname]
    : [
        `${pathname}.html`,
        pathname
      ];

  for (const candidate of candidatePaths) {
    const diskPath = path.normalize(path.join(ROOT_DIR, candidate.replace(/^\//, "")));
    if (!diskPath.startsWith(ROOT_DIR)) {
      return null;
    }

    try {
      const stat = fs.statSync(diskPath);
      if (stat.isFile()) {
        return diskPath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getApiHandler(pathname) {
  if (pathname === "/api/generate-memo") {
    return require("./api/generate-memo");
  }
  if (pathname === "/api/admin-users") {
    return require("./api/admin-users");
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    let pathname = url.pathname;
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      pathname = url.pathname;
    }

    if (pathname.startsWith("/api/")) {
      const handler = getApiHandler(pathname);
      if (!handler) {
        return sendText(res, 404, "Unknown API route.");
      }
      await handler(req, res);
      return;
    }

    const filePath = resolveStaticPath(pathname);
    if (!filePath) {
      return sendText(res, 404, "Not found.");
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", getMimeType(filePath));
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Local server error", error);
    sendText(res, 500, "Server error.");
  }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => {
  console.log(`Local server ready on http://127.0.0.1:${port}`);
});

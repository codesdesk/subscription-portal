import { copyFile, writeFile } from "node:fs/promises";

const hostingerServer = `import http from "node:http";
import { existsSync } from "node:fs";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

const staticTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendStatic(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = normalize(decodeURIComponent(url.pathname)).replace(/^\\.\\.(\\/|$)/, "");
  const filePath = join(process.cwd(), "client", pathname);
  if (!existsSync(filePath)) return false;

  const contentType = staticTypes[extname(filePath)] || "application/octet-stream";
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": pathname.includes("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  });
  createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;

  if (pathname === "/healthz") {
    send(res, 200, "ok");
    return;
  }

  if (pathname.startsWith("/assets/") && sendStatic(req, res)) {
    return;
  }

  if (pathname === "/") {
    send(res, 200, \`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Invoice Subscription Portal</title>
      </head>
      <body style="font-family: system-ui, sans-serif; padding: 32px;">
        <h1>Invoice Subscription Portal</h1>
        <p>App server is running.</p>
      </body>
    </html>
  \`, "text/html; charset=utf-8");
    return;
  }

  send(res, 404, "Not found");
});

server.listen(port, host, () => {
  console.log(\`Invoice Subscription Portal listening on \${host}:\${port}\`);
});
`;

await writeFile("build/app.js", hostingerServer);
await copyFile("package.json", "build/package.json");

console.log("Prepared Hostinger build/app.js entrypoint");

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".cjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

const notFound = (res) => {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
};

const parseRange = (rangeHeader, size) => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const startRaw = match[1];
  const endRaw = match[2];

  let start = startRaw ? Number(startRaw) : NaN;
  let end = endRaw ? Number(endRaw) : NaN;

  if (Number.isNaN(start)) {
    const suffixLength = Number(endRaw);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else if (Number.isNaN(end)) {
    end = size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || end < start || start >= size) return null;

  end = Math.min(end, size - 1);
  return { start, end };
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${host}:${port}`);
    let reqPath = decodeURIComponent(url.pathname);

    if (reqPath === "/") {
      reqPath = "/examples/demo.html";
    }

    const safePath = path.normalize(reqPath).replace(/^([.][.][/\\])+/, "");
    const filePath = path.resolve(rootDir, `.${safePath}`);

    if (!filePath.startsWith(rootDir)) {
      notFound(res);
      return;
    }

    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      notFound(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] ?? "application/octet-stream";
    const totalSize = fileStat.size;
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const range = parseRange(rangeHeader, totalSize);
      if (!range) {
        res.writeHead(416, {
          "Content-Range": `bytes */${totalSize}`,
        });
        res.end();
        return;
      }

      const chunkSize = range.end - range.start + 1;
      res.writeHead(206, {
        "Content-Type": contentType,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${range.start}-${range.end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      });

      createReadStream(filePath, { start: range.start, end: range.end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": String(totalSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
    });
    createReadStream(filePath).pipe(res);
  } catch {
    notFound(res);
  }
});

server.listen(port, host, () => {
  console.log(`Demo server running at http://${host}:${port}`);
  console.log("Open /examples/demo.html");
});

server.on("error", (error) => {
  if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Use another port, e.g. PORT=4174 npm run demo`);
    process.exit(1);
  }

  throw error;
});

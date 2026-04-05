import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

const DATA_FILE = path.resolve("tracker-data.json");

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("请求体太大了。"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("请求不是合法的 JSON。"));
      }
    });

    req.on("error", reject);
  });
}

function dataStorageMiddleware(req, res, next) {
  if (req.url !== "/api/data") return next();

  if (req.method === "GET") {
    try {
      const raw = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, "utf-8") : "null";
      return sendJson(res, 200, { value: JSON.parse(raw) });
    } catch {
      return sendJson(res, 200, { value: null });
    }
  }

  if (req.method === "PUT") {
    return readJson(req)
      .then((body) => {
        fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2), "utf-8");
        return sendJson(res, 200, { ok: true });
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
  }

  return sendJson(res, 405, { error: "只支持 GET/PUT。" });
}

function serverPlugins() {
  return {
    name: "local-server-plugins",
    configureServer(server) {
      server.middlewares.use(dataStorageMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(dataStorageMiddleware);
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [serverPlugins()],
});

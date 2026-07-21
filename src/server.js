import Fastify from "fastify";
import { config } from "./config.js";
import { parseDouyinLink } from "./parseVideo.js";
import { pool } from "./browserPool.js";
import * as cache from "./cache.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// 从任意文本中提取抖音分享短链
function extractDouyinUrl(text) {
  if (!text) return null;
  const m = text.match(/https?:\/\/v\.douyin\.com\/[a-zA-Z0-9_-]+\/?/);
  return m ? m[0].replace(/\/+$/, "") : null;
}

function getRaw(query, body) {
  return body?.url || body?.text || query?.url || query?.text || "";
}

function validate(url) {
  return url && (url.includes("douyin.com") || url.includes("iesdouyin.com"));
}

// GET /api/parse?url=... 或 ?text=...
app.get("/api/parse", async (req, reply) => {
  const raw = getRaw(req.query, {});
  if (!raw) {
    return reply.status(400).send({ status: false, error: "missing url or text parameter" });
  }

  const url = raw.includes("douyin.com") ? extractDouyinUrl(raw) || raw : raw;
  if (!validate(url)) {
    return reply.status(400).send({ status: false, error: "only douyin links are supported" });
  }

  try {
    return await parseDouyinLink(url);
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ status: false, error: "internal server error" });
  }
});

// POST /api/parse  body: { url, text } 或 form-urlencoded 或 ?url= / ?text=
app.post("/api/parse", async (req, reply) => {
  const raw = getRaw(req.query, req.body || {});
  if (!raw) {
    return reply.status(400).send({ status: false, error: "missing url or text parameter" });
  }

  const url = raw.includes("douyin.com") ? extractDouyinUrl(raw) || raw : raw;
  if (!validate(url)) {
    return reply.status(400).send({ status: false, error: "only douyin links are supported" });
  }

  try {
    return await parseDouyinLink(url);
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ status: false, error: "internal server error" });
  }
});

// GET /health
app.get("/health", async () => {
  return {
    status: "ok",
    uptime: process.uptime(),
    browserPool: pool.stats,
    cacheSize: cache.size(),
  };
});

async function start() {
  try {
    await app.listen({ port: config.server.port, host: config.server.host });
    app.log.info(`server started: http://${config.server.host}:${config.server.port}`);
    app.log.info(`browser pool: max ${config.browser.maxInstances} instances`);
    app.log.info(`cache TTL: ${config.cache.ttl / 1000}s`);
  } catch (err) {
    app.log.fatal(err, "server failed to start");
    process.exit(1);
  }
}

const shutdown = async () => {
  app.log.info("shutting down...");
  await app.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start();

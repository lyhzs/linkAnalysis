import 'dotenv/config';

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  },

  browser: {
    maxInstances: parseInt(process.env.BROWSER_MAX || '3', 10),
    maxPagesPerInstance: parseInt(process.env.BROWSER_PAGES || '5', 10),
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
    executablePath: process.env.CHROMIUM_PATH || undefined,
  },

  navigation: {
    timeout: parseInt(process.env.NAV_TIMEOUT || '30000', 10),
    waitUntil: 'networkidle0',
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600000', 10),
    maxSize: parseInt(process.env.CACHE_MAX || '500', 10),
  },

  rateLimit: {
    maxPerMinute: parseInt(process.env.RATE_LIMIT || '15', 10),
  },

  proxy: process.env.PROXY_URL || null,
};

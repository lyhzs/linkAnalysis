import puppeteer from "puppeteer";
import { config } from "./config.js";

class BrowserPool {
  constructor() {
    this.max = config.browser.maxInstances;
    this.browsers = [];
    this.waiting = [];
  }

  async acquire() {
    let browser = this.browsers.find((b) => b.available);
    if (browser) {
      browser.available = false;
      return { browser, isNew: false };
    }
    if (this.browsers.length < this.max) {
      browser = await this._launch();
      browser.available = false;
      this.browsers.push(browser);
      return { browser, isNew: true };
    }
    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(instance) {
    instance.available = true;
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      instance.available = false;
      resolve({ browser: instance, isNew: false });
    }
  }

  async _launch() {
    const opts = {
      headless: config.browser.headless ? "new" : false,
      args: config.browser.args,
    };
    if (config.browser.executablePath) {
      opts.executablePath = config.browser.executablePath;
    }
    return await puppeteer.launch(opts);
  }

  async recycle(browser) {
    try { await browser.close(); } catch (_) {}
    const idx = this.browsers.indexOf(browser);
    if (idx !== -1) this.browsers.splice(idx, 1);
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      const nb = await this._launch();
      nb.available = false;
      this.browsers.push(nb);
      resolve({ browser: nb, isNew: true });
    }
  }

  get stats() {
    return {
      total: this.browsers.length,
      available: this.browsers.filter((b) => b.available).length,
      pending: this.waiting.length,
    };
  }
}

export const pool = new BrowserPool();

import { LRUCache } from "lru-cache";
import { config } from "./config.js";

const cache = new LRUCache({
  max: config.cache.maxSize,
  ttl: config.cache.ttl,
  updateAgeOnGet: true,
  allowStale: false,
});

export function get(key) { return cache.get(key); }
export function set(key, value) { cache.set(key, value); }
export function has(key) { return cache.has(key); }
export function del(key) { cache.delete(key); }
export function clear() { cache.clear(); }
export function size() { return cache.size; }

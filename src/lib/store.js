// Storage on Cloudflare KV (binding RADAR_KV). Falls back to memory when no
// KV is bound, so tests and a first deploy without KV still work.

import { DEFAULT_SOURCES } from "../sources.js";

const mem = new Map();

function kv(env) {
  if (env?.RADAR_KV) return env.RADAR_KV;
  return {
    get: async (k) => (mem.has(k) ? mem.get(k) : null),
    put: async (k, v) => void mem.set(k, v),
    delete: async (k) => void mem.delete(k),
  };
}

export async function getJson(env, key, fallback = null) {
  const raw = await kv(env).get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function putJson(env, key, value, opts) {
  await kv(env).put(key, JSON.stringify(value), opts);
}

export async function getString(env, key) {
  return kv(env).get(key);
}

export async function putString(env, key, value) {
  await kv(env).put(key, value);
}

// The live watchlist = defaults, then whatever the user changed (stored in KV).
export async function getSources(env) {
  const custom = await getJson(env, "watchlist", null);
  return custom ? { ...DEFAULT_SOURCES, ...custom } : structuredClone(DEFAULT_SOURCES);
}

export async function saveSources(env, sources) {
  await putJson(env, "watchlist", sources);
}

export function resetMemoryStore() {
  mem.clear();
}

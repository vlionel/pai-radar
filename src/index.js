// Cloudflare Worker entry point.
//   POST /mcp/<RADAR_KEY>   MCP endpoint (add this URL as a custom connector)
//   GET  /                  short status page
//   cron (daily)            keeps the Meta token fresh

import { handleMcp, SERVER_INFO } from "./mcp.js";
import { getString, putString } from "./lib/store.js";
import { fetchJson } from "./lib/http.js";
import { graphBase } from "./tools/social.js";

function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function authorized(request, env) {
  const key = env.RADAR_KEY;
  if (!key || key.length < 24) return { ok: false, status: 500, msg: "RADAR_KEY is missing or shorter than 24 characters. Set it as a secret before using the connector." };
  const url = new URL(request.url);
  const fromPath = url.pathname.split("/")[2] || "";
  const auth = request.headers.get("authorization") || "";
  const fromHeader = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return sameSecret(fromPath, key) || sameSecret(fromHeader, key) ? { ok: true } : { ok: false, status: 404, msg: "Not found" };
}

// Long-lived Meta user tokens last about 60 days. With META_APP_ID and
// META_APP_SECRET set, the daily cron swaps the token for a fresh one when
// fewer than 10 days are left. System User tokens never expire and skip this.
export async function refreshMetaToken(env, deps = {}) {
  if (!env.META_APP_ID || !env.META_APP_SECRET) return { skipped: "no app credentials" };
  const current = (await getString(env, "meta_token")) || env.META_ACCESS_TOKEN;
  if (!current) return { skipped: "no token" };
  const expires = await getString(env, "meta_token_expires");
  if (expires && new Date(expires) - Date.now() > 10 * 86400 * 1000) return { skipped: "still valid", expires };
  const ctx = { env, fetch: deps.fetch };
  const r = await fetchJson(`${graphBase(env)}/oauth/access_token?grant_type=fb_exchange_token&client_id=${env.META_APP_ID}&client_secret=${encodeURIComponent(env.META_APP_SECRET)}&fb_exchange_token=${encodeURIComponent(current)}`, ctx, { label: "meta refresh" });
  if (!r.ok || !r.data.access_token) return { error: r.error || "no token in response" };
  await putString(env, "meta_token", r.data.access_token);
  const exp = r.data.expires_in ? new Date(Date.now() + r.data.expires_in * 1000).toISOString() : "";
  if (exp) await putString(env, "meta_token_expires", exp);
  return { refreshed: true, expires: exp || "unknown" };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(`${SERVER_INFO.title} ${SERVER_INFO.version} is running.\nAdd https://${url.host}/mcp/<your RADAR_KEY> as a custom connector in Claude.\n`, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      const a = authorized(request, env);
      if (!a.ok) return new Response(a.msg, { status: a.status });
      return handleMcp(request, env);
    }
    return new Response("Not found", { status: 404 });
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refreshMetaToken(env).then((r) => console.log("meta token", JSON.stringify(r))));
  },
};

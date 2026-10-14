import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseFeed } from "../src/lib/feed.js";
import { fold, matchesAny } from "../src/lib/text.js";
import { handleMcp } from "../src/mcp.js";
import worker, { authorized, refreshMetaToken } from "../src/index.js";
import { resetMemoryStore, putString } from "../src/lib/store.js";
import { ATOM, IG, PAGE, RDF, RSS, YT, mockFetch } from "./fixtures.js";

const KEY = "k".repeat(32);
const baseEnv = () => ({ RADAR_KEY: KEY, SUBREQUEST_LIMIT: "45" });

async function call(env, name, args = {}, fetchImpl) {
  const req = new Request("https://radar.test/mcp/" + KEY, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }) });
  const res = await handleMcp(req, env, { fetch: fetchImpl });
  const j = await res.json();
  return j.result.structuredContent ?? j.result;
}

beforeEach(() => resetMemoryStore());

test("parses RSS with CDATA and entities", () => {
  const f = parseFeed(RSS);
  assert.equal(f.title, "Olhar Digital");
  assert.equal(f.items[0].title, "Meta lança Muse Wonder, novo modelo de IA");
  assert.match(f.items[0].summary, /anunciou o Muse Wonder…/);
  assert.deepEqual(f.items[0].categories, ["IA"]);
  assert.ok(f.items[0].published);
});

test("parses Atom alternate link, double-escaped title, term category", () => {
  const f = parseFeed(ATOM);
  assert.equal(f.items[0].url, "https://lab.example/x");
  assert.equal(f.items[0].title, "Introducing Model X & friends");
  assert.deepEqual(f.items[0].categories, ["Research"]);
});

test("parses RDF with dc:date", () => {
  const f = parseFeed(RDF);
  assert.equal(f.items[0].title, "KI-Modell veröffentlicht");
  assert.ok(f.items[0].published);
});

test("accent-insensitive keyword match", () => {
  assert.equal(fold("Inteligência"), "inteligencia");
  assert.ok(matchesAny("Nova inteligência artificial", ["inteligencia"]));
  assert.ok(!matchesAny("nada", ["muse"]));
});

test("auth: rejects missing/short key and wrong key, accepts path and bearer", () => {
  assert.equal(authorized(new Request("https://x/mcp/abc"), {}).status, 500);
  assert.equal(authorized(new Request("https://x/mcp/" + "z".repeat(32)), baseEnv()).status, 404);
  assert.ok(authorized(new Request("https://x/mcp/" + KEY), baseEnv()).ok);
  assert.ok(authorized(new Request("https://x/mcp", { headers: { authorization: "Bearer " + KEY } }), baseEnv()).ok);
});

test("worker returns 404 for wrong key and serves MCP for right key", async () => {
  const bad = await worker.fetch(new Request("https://x/mcp/" + "z".repeat(32), { method: "POST", body: "{}" }), baseEnv());
  assert.equal(bad.status, 404);
  const ok = await worker.fetch(new Request("https://x/mcp/" + KEY, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: "ping" }) }), baseEnv());
  assert.deepEqual(await ok.json(), { jsonrpc: "2.0", id: 7, result: {} });
});

test("MCP initialize, notification and tools/list", async () => {
  const init = await handleMcp(new Request("https://x/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }) }), baseEnv());
  const j = await init.json();
  assert.equal(j.result.protocolVersion, "2025-06-18");
  assert.equal(j.result.serverInfo.name, "pai-radar");
  const note = await handleMcp(new Request("https://x/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) }), baseEnv());
  assert.equal(note.status, 202);
  const list = await (await handleMcp(new Request("https://x/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) }), baseEnv())).json();
  const names = list.result.tools.map((t) => t.name);
  assert.ok(names.includes("brazil_gap") && names.includes("lab_news"));
  assert.ok(!names.includes("reddit_top"), "personal tools hidden by default");
  const list2 = await (await handleMcp(new Request("https://x/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) }), { ...baseEnv(), PERSONAL_SOURCES: "on" })).json();
  assert.ok(list2.result.tools.some((t) => t.name === "google_news"));
});

test("unknown method and bad JSON", async () => {
  const r = await (await handleMcp(new Request("https://x/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "nope" }) }), baseEnv())).json();
  assert.equal(r.error.code, -32601);
  const bad = await handleMcp(new Request("https://x/mcp", { method: "POST", body: "{" }), baseEnv());
  assert.equal(bad.status, 400);
});

test("lab_news reads feeds, filters by time and keyword, reports failures", async () => {
  const f = mockFetch([["olhardigital", RSS], ["openai.com", ATOM], ["canaltech", 500]]);
  const out = await call(baseEnv(), "lab_news", { groups: ["labs", "brazil"], since_hours: 24, keywords: ["muse", "model"] }, f);
  const titles = out.items.map((i) => i.title);
  assert.ok(titles.includes("Meta lança Muse Wonder, novo modelo de IA"));
  assert.ok(titles.includes("Introducing Model X & friends"));
  assert.ok(!titles.includes("Celular velho"));
  assert.ok(out.errors.some((e) => e.source === "Canaltech"));
});

test("page watch: first call is a baseline, new links show later", async () => {
  const env = baseEnv();
  const f = mockFetch([["anthropic.com/news", PAGE]]);
  const first = await call(env, "lab_news", { groups: ["pages"] }, f);
  assert.equal(first.items.length, 0);
  assert.ok(first.notes[0].includes("baseline"));
  const page2 = PAGE.replace("</body>", '<a href="/news/fresh-launch">A fresh model launch today announced</a></body>');
  const second = await call(env, "lab_news", { groups: ["pages"] }, mockFetch([["anthropic.com/news", page2]]));
  assert.equal(second.items.length, 1);
  assert.equal(second.items[0].url, "https://www.anthropic.com/news/fresh-launch");
});

test("brazil_gap finds YouTube and Instagram coverage and lists what was not checked", async () => {
  const env = { ...baseEnv(), META_ACCESS_TOKEN: "t", IG_USER_ID: "178" };
  const f = mockFetch([["youtube.com/feeds", YT], ["graph.facebook.com", IG], ["olhardigital", RSS], ["tecnoblog", RSS.replace(/Muse Wonder/g, "outro")]]);
  const out = await call(env, "brazil_gap", { keywords: ["Muse Wonder"] }, f);
  assert.equal(out.covered, true);
  assert.ok(out.hits.some((h) => h.channel === "instagram reel"));
  assert.ok(out.hits.some((h) => h.channel === "youtube short" && h.views === 12345));
  assert.ok(out.not_checked.some((n) => n.source === "Google News Brasil"));
  // earliest first
  const times = out.hits.map((h) => h.published);
  assert.deepEqual([...times].sort(), times);
});

test("brazil_gap without Instagram configured says so instead of claiming no coverage", async () => {
  const out = await call(baseEnv(), "brazil_gap", { keywords: ["Nada Disso"] }, mockFetch([["youtube.com/feeds", YT], ["olhardigital", RSS]]));
  assert.equal(out.covered, false);
  assert.ok(out.not_checked.some((n) => n.source === "Instagram watchlist"));
});

test("instagram_posts: unconfigured and configured", async () => {
  const off = await call(baseEnv(), "instagram_posts", {});
  assert.equal(off.configured, false);
  const env = { ...baseEnv(), META_ACCESS_TOKEN: "t", IG_USER_ID: "178" };
  const on = await call(env, "instagram_posts", { handles: ["tecmundo"], keywords: ["muse"] }, mockFetch([["graph.facebook.com", IG]]));
  assert.equal(on.items.length, 1);
  assert.equal(on.items[0].type, "reel");
  assert.equal(on.profiles[0].followers, 3000000);
});

test("instagram resolves own account id from Pages and caches it", async () => {
  const log = [];
  const env = { ...baseEnv(), META_ACCESS_TOKEN: "t" };
  const f = mockFetch([["me/accounts", { data: [{ name: "Page", instagram_business_account: { id: "999", username: "vini" } }] }], ["graph.facebook.com", IG]], log);
  await call(env, "instagram_posts", { handles: ["tecmundo"] }, f);
  assert.ok(log.some((u) => u.includes("/999?fields=")));
  log.length = 0;
  await call(env, "instagram_posts", { handles: ["tecmundo"] }, f);
  assert.ok(!log.some((u) => u.includes("me/accounts")), "id is cached");
});

test("budget: stops at the limit and reports skipped requests", async () => {
  const env = { ...baseEnv(), SUBREQUEST_LIMIT: "3" };
  const out = await call(env, "lab_news", { groups: ["labs"] }, mockFetch([["", ATOM]]));
  assert.ok(out.budget_note && out.budget_note.includes("Skipped"));
});

test("watchlist add, duplicate, remove, reset", async () => {
  const env = baseEnv();
  let r = await call(env, "watchlist", { action: "add", list: "instagram", item: { handle: "@novo.criador", name: "Novo" } });
  assert.equal(r.ok, true);
  r = await call(env, "watchlist", { action: "add", list: "instagram", item: { handle: "novo.criador" } });
  assert.equal(r.note, "already on the list");
  r = await call(env, "watchlist", { action: "get", list: "instagram" });
  assert.ok(r.entries.some((e) => e.handle === "novo.criador"));
  r = await call(env, "watchlist", { action: "remove", list: "instagram", item: "@novo.criador" });
  assert.equal(r.ok, true);
  r = await call(env, "watchlist", { action: "add", list: "github_orgs", item: "newlab" });
  r = await call(env, "watchlist", { action: "reset", list: "github_orgs" });
  r = await call(env, "watchlist", { action: "get", list: "github_orgs" });
  assert.ok(!r.entries.includes("newlab"));
  r = await call(env, "watchlist", { action: "add", list: "bogus", item: "x" });
  assert.ok(r.error);
});

test("github, hf, arxiv, hn tools shape their output", async () => {
  const day = new Date().toISOString();
  const f = mockFetch([
    ["api.github.com/search", { items: [{ full_name: "QwenLM/Qwen4", html_url: "https://github.com/QwenLM/Qwen4", description: "Qwen 4", stargazers_count: 10, created_at: day, pushed_at: day }] }],
    ["/releases", [{ tag_name: "v1", name: "v1", html_url: "u", published_at: day, body: "notes" }]],
    ["huggingface.co/api/models", [{ id: "Qwen/Qwen4-7B", likes: 5, downloads: 9, trendingScore: 100, pipeline_tag: "text-generation" }]],
    ["export.arxiv.org", ATOM],
    ["hn.algolia.com", { hits: [{ title: "Show HN: an LLM thing", points: 120, num_comments: 3, objectID: "1", created_at: day }, { title: "Gardening tips", points: 300, objectID: "2", created_at: day }] }],
  ]);
  const gh = await call(baseEnv(), "github_releases", {}, f);
  assert.equal(gh.items[0].repo, "QwenLM/Qwen4");
  assert.equal(gh.items[0].new_repo, true);
  assert.equal(gh.items[0].releases[0].tag, "v1");
  const hf = await call(baseEnv(), "hf_trending", {}, f);
  assert.equal(hf.items[0].url, "https://huggingface.co/Qwen/Qwen4-7B");
  const ax = await call(baseEnv(), "arxiv_new", { keywords: ["agents"] }, f);
  assert.equal(ax.items.length, 1);
  const hn = await call(baseEnv(), "hn_top", {}, f);
  assert.deepEqual(hn.items.map((i) => i.title), ["Show HN: an LLM thing"]);
});

test("radar_status reports configuration honestly", async () => {
  const out = await call(baseEnv(), "radar_status", {});
  assert.match(out.instagram, /^off/);
  assert.match(out.storage, /memory/);
  assert.match(out.x_twitter, /not included/);
});

test("meta token refresh only when close to expiry", async () => {
  const env = { ...baseEnv(), META_APP_ID: "1", META_APP_SECRET: "s", META_ACCESS_TOKEN: "old" };
  await putString(env, "meta_token_expires", new Date(Date.now() + 30 * 86400e3).toISOString());
  assert.equal((await refreshMetaToken(env, { fetch: mockFetch([]) })).skipped, "still valid");
  await putString(env, "meta_token_expires", new Date(Date.now() + 2 * 86400e3).toISOString());
  const r = await refreshMetaToken(env, { fetch: mockFetch([["oauth/access_token", { access_token: "new", expires_in: 5184000 }]]) });
  assert.equal(r.refreshed, true);
});

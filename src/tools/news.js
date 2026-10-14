import { parseFeed } from "../lib/feed.js";
import { fetchText, pool } from "../lib/http.js";
import { getJson, getSources, putJson } from "../lib/store.js";
import { LANGUAGES } from "../sources.js";
import { decodeEntities, hoursAgo, isAfter, matchesAny, stripHtml } from "../lib/text.js";

export const SINCE = { type: "number", description: "Look back this many hours (default 24, max 720).", minimum: 1, maximum: 720 };
export const KEYWORDS = { type: "array", items: { type: "string" }, description: "Optional filter. An item is kept if its title, summary or categories contain any keyword (case and accent insensitive)." };
export const LIMIT = (d) => ({ type: "number", description: `Maximum items returned (default ${d}).`, minimum: 1, maximum: 200 });

export function clampSince(h, d = 24) {
  const n = Number(h);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 720) : d;
}

export async function readFeed(src, ctx) {
  const r = await fetchText(src.url, ctx, { label: src.id });
  if (!r.ok) return { source: src, error: r.error };
  const { items } = parseFeed(r.text);
  return { source: src, items };
}

// Pages without RSS: collect links under a path prefix and remember when each
// was first seen, so "new since" works without a publication date.
export async function readPage(src, ctx) {
  const r = await fetchText(src.url, ctx, { label: src.id, headers: { accept: "text/html" } });
  if (!r.ok) return { source: src, error: r.error };
  const base = new URL(src.url);
  const found = new Map();
  for (const m of r.text.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url;
    try {
      url = new URL(decodeEntities(m[1]), base);
    } catch {
      continue;
    }
    if (url.host !== base.host || !url.pathname.startsWith(src.prefix) || url.pathname === src.prefix) continue;
    const title = stripHtml(m[2]);
    if (title.length < 12) continue;
    const key = url.origin + url.pathname.replace(/\/$/, "");
    if (!found.has(key) || found.get(key).length < title.length) found.set(key, title);
  }
  const seenKey = `seen:page:${src.id}`;
  const seen = (await getJson(ctx.env, seenKey, null)) || {};
  const baseline = Object.keys(seen).length === 0;
  const now = new Date().toISOString();
  let changed = false;
  const items = [];
  for (const [url, title] of found) {
    if (!seen[url]) {
      seen[url] = baseline ? "baseline" : now;
      changed = true;
    }
    items.push({ title: title.slice(0, 200), url, published: null, first_seen: seen[url] === "baseline" ? null : seen[url], summary: "" });
  }
  if (changed) await putJson(ctx.env, seenKey, seen);
  return { source: src, items, baseline };
}

export const labNews = {
  name: "lab_news",
  description:
    "Latest posts from AI lab blogs, the foreign desk (tech press in up to 13 languages: the G20 languages plus Danish, each switchable) and Brazilian tech outlets, read from RSS/Atom feeds and from lab news pages that have no feed. Use this first to see what was announced. Foreign items keep their original language and link; translate them yourself.",
  inputSchema: {
    type: "object",
    properties: {
      groups: { type: "array", items: { type: "string", enum: ["labs", "pages", "foreign", "brazil"] }, description: 'Which source groups to read. Default ["labs","pages"].' },
      languages: { type: "array", items: { type: "string", enum: Object.keys(LANGUAGES) }, description: "Foreign-desk languages to read this call. Default: the languages switched on in the watchlist (see `watchlist` list `languages`). English-language items are always kept." },
      since_hours: SINCE,
      keywords: KEYWORDS,
      limit: LIMIT(40),
    },
  },
  async run(args, ctx) {
    const sources = await getSources(ctx.env);
    const groups = args.groups?.length ? args.groups : ["labs", "pages"];
    const since = hoursAgo(clampSince(args.since_hours));
    const jobs = [];
    const langs = new Set(args.languages?.length ? args.languages : sources.languages || []);
    for (const g of groups) for (const s of sources[g] || []) {
      if (g === "foreign" && s.lang !== "en" && !langs.has(s.lang)) continue;
      jobs.push({ ...s, group: g });
    }
    const results = await pool(jobs, 6, (s) => (s.group === "pages" ? readPage(s, ctx) : readFeed(s, ctx)));
    const items = [];
    const errors = [];
    const baselines = [];
    for (const r of results) {
      if (r.error) {
        errors.push({ source: r.source?.name || "?", error: r.error });
        continue;
      }
      if (r.baseline) baselines.push(r.source.name);
      for (const it of r.items) {
        const when = it.published || it.first_seen;
        if (r.source.group === "pages" && !when) continue; // baseline links are not news
        if (!isAfter(when, since)) continue;
        if (!matchesAny(`${it.title} ${it.summary} ${(it.categories || []).join(" ")}`, args.keywords)) continue;
        items.push({
          source: r.source.name,
          group: r.source.group,
          lang: r.source.lang,
          title: it.title,
          url: it.url,
          published: it.published,
          first_seen: it.first_seen,
          summary: it.summary,
        });
      }
    }
    items.sort((a, b) => String(b.published || b.first_seen || "").localeCompare(String(a.published || a.first_seen || "")));
    return {
      count: items.length,
      languages_read: groups.includes("foreign") ? [...langs] : [],
      items: items.slice(0, args.limit || 40),
      errors,
      notes: baselines.length ? [`First read of: ${baselines.join(", ")}. Their current links were stored as a baseline; new links will show from the next call.`] : [],
    };
  },
};

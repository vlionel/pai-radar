// Sources that are free to read but whose terms restrict commercial reuse.
// They only appear when PERSONAL_SOURCES = "on". Keep them off in any copy
// you share or sell.

import { parseFeed } from "../lib/feed.js";
import { fetchText, pool } from "../lib/http.js";
import { getSources } from "../lib/store.js";
import { hoursAgo, isAfter } from "../lib/text.js";
import { clampSince, LIMIT, SINCE } from "./news.js";

export function personalOn(env) {
  return String(env.PERSONAL_SOURCES || "").toLowerCase() === "on";
}

export const redditTop = {
  name: "reddit_top",
  personal: true,
  description: "PERSONAL USE ONLY. Top posts of the day from AI subreddits (r/LocalLLaMA, r/OpenAI, r/ClaudeAI and others), read from Reddit's public RSS.",
  inputSchema: { type: "object", properties: { subreddits: { type: "array", items: { type: "string" } }, since_hours: SINCE, limit: LIMIT(30) } },
  async run(args, ctx) {
    const sources = await getSources(ctx.env);
    const subs = args.subreddits?.length ? args.subreddits : sources.reddit_subs;
    const since = hoursAgo(clampSince(args.since_hours));
    const res = await pool(subs, 4, (s) => fetchText(`https://www.reddit.com/r/${s}/top/.rss?t=day`, ctx, { label: `reddit ${s}` }).then((r) => ({ s, r })));
    const items = [];
    const errors = [];
    for (const { s, r } of res) {
      if (!r.ok) {
        errors.push({ source: `r/${s}`, error: r.error });
        continue;
      }
      for (const it of parseFeed(r.text).items) if (isAfter(it.published, since)) items.push({ subreddit: `r/${s}`, title: it.title, url: it.url, published: it.published });
    }
    return { count: items.length, items: items.slice(0, args.limit || 30), errors };
  },
};

export const googleNews = {
  name: "google_news",
  personal: true,
  description: "PERSONAL USE ONLY. Google News search results for a query, in Brazil (pt-BR), the US (en) or Germany (de). Useful to date who covered a story first.",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: { query: { type: "string" }, edition: { type: "string", enum: ["br", "us", "de", "es"], description: "Default br." }, since_hours: SINCE, limit: LIMIT(30) },
  },
  async run(args, ctx) {
    const ed = { br: "hl=pt-BR&gl=BR&ceid=BR:pt-419", us: "hl=en-US&gl=US&ceid=US:en", de: "hl=de&gl=DE&ceid=DE:de", es: "hl=es&gl=ES&ceid=ES:es" }[args.edition || "br"];
    const r = await fetchText(`https://news.google.com/rss/search?q=${encodeURIComponent(args.query || "")}&${ed}`, ctx, { label: "google news" });
    if (!r.ok) return { count: 0, items: [], errors: [{ source: "Google News", error: r.error }] };
    const since = hoursAgo(clampSince(args.since_hours, 72));
    const items = parseFeed(r.text).items
      .filter((i) => isAfter(i.published, since))
      .sort((a, b) => String(a.published).localeCompare(String(b.published)))
      .map((i) => ({ outlet: i.title.split(" - ").pop(), title: i.title, url: i.url, published: i.published }));
    return { count: items.length, earliest_first: true, items: items.slice(0, args.limit || 30), errors: [] };
  },
};

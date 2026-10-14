import { fetchText, pool } from "../lib/http.js";
import { parseFeed } from "../lib/feed.js";
import { getSources } from "../lib/store.js";
import { hoursAgo, isAfter, matchesAny } from "../lib/text.js";
import { clampSince, readFeed } from "./news.js";
import { igFetchAccount, igUserId, metaToken, ytChannel } from "./social.js";
import { personalOn } from "./personal.js";

export const brazilGap = {
  name: "brazil_gap",
  description:
    "The 'post first' check. Given a story's keywords (e.g. a model name), checks whether Brazilian outlets and creators already covered it: Brazilian news feeds, Instagram watchlist captions, YouTube watchlist titles and, in personal mode, Google News Brasil. Returns covered or not, who was first and when, and which sources could not be checked. Absence of a hit is not proof nobody covered it; read `not_checked`.",
  inputSchema: {
    type: "object",
    required: ["keywords"],
    properties: {
      keywords: { type: "array", items: { type: "string" }, minItems: 1, description: 'Distinctive terms, e.g. ["Muse Wonder"]. Prefer names over generic words.' },
      since_hours: { type: "number", description: "Look back this many hours (default 72)." },
    },
  },
  async run(args, ctx) {
    const kws = (args.keywords || []).filter(Boolean);
    if (!kws.length) return { error: "keywords is required" };
    const since = hoursAgo(clampSince(args.since_hours, 72));
    const sources = await getSources(ctx.env);
    const hits = [];
    const checked = [];
    const notChecked = [];

    const tasks = [];
    for (const s of sources.brazil) tasks.push(async () => {
      const r = await readFeed({ ...s, group: "brazil" }, ctx);
      if (r.error) return notChecked.push({ source: s.name, reason: r.error });
      checked.push(s.name);
      for (const it of r.items) if (isAfter(it.published, since) && matchesAny(`${it.title} ${it.summary}`, kws)) hits.push({ who: s.name, channel: "site", title: it.title, url: it.url, published: it.published });
    });

    for (const c of sources.youtube) tasks.push(async () => {
      const r = await ytChannel(c, ctx);
      if (r.error) return notChecked.push({ source: `YouTube ${c.name}`, reason: r.error });
      checked.push(`YouTube ${c.name}`);
      for (const v of r.videos) if (isAfter(v.published, since) && matchesAny(`${v.title} ${v.description}`, kws)) hits.push({ who: c.name, channel: v.is_short ? "youtube short" : "youtube", title: v.title, url: v.url, published: v.published, views: v.views });
    });

    const token = await metaToken(ctx.env);
    const me = token ? await igUserId(ctx.env, ctx) : { error: "META_ACCESS_TOKEN is not set" };
    if (me.error) notChecked.push({ source: "Instagram watchlist", reason: me.error });
    else for (const a of sources.instagram) tasks.push(async () => {
      const r = await igFetchAccount(a.handle, 12, ctx.env, ctx, me.id, token);
      if (r.error) return notChecked.push({ source: `@${a.handle}`, reason: r.error });
      checked.push(`@${a.handle}`);
      for (const p of r.posts) if (isAfter(p.published, since) && matchesAny(p.caption, kws)) hits.push({ who: `@${a.handle}`, channel: `instagram ${p.type}`, title: p.caption.slice(0, 140), url: p.url, published: p.published, likes: p.likes, followers: r.followers });
    });

    if (personalOn(ctx.env)) tasks.push(async () => {
      const q = kws.map((k) => `"${k}"`).join(" OR ");
      const r = await fetchText(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, ctx, { label: "google news br" });
      if (!r.ok) return notChecked.push({ source: "Google News Brasil", reason: r.error });
      checked.push("Google News Brasil");
      for (const it of parseFeed(r.text).items) if (isAfter(it.published, since)) hits.push({ who: it.title.split(" - ").pop(), channel: "google news br", title: it.title, url: it.url, published: it.published });
    });
    else notChecked.push({ source: "Google News Brasil", reason: "personal sources are off (PERSONAL_SOURCES)" });

    await pool(tasks, 6, (t) => t());
    hits.sort((a, b) => String(a.published || "9").localeCompare(String(b.published || "9")));
    if (ctx.budget.skipped.length) notChecked.push({ source: ctx.budget.skipped.join(", "), reason: "request budget used up for this call" });
    return {
      keywords: kws,
      covered: hits.length > 0,
      first: hits[0] || null,
      hit_count: hits.length,
      hits: hits.slice(0, 30),
      checked_count: checked.length,
      not_checked: notChecked,
      verdict: hits.length
        ? `Covered in Brazil: first seen at ${hits[0].who} (${hits[0].published || "date unknown"}).`
        : `No Brazilian coverage found in ${checked.length} checked sources.${notChecked.length ? ` ${notChecked.length} could not be checked.` : ""}`,
    };
  },
};

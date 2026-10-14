import { fetchJson, fetchText, pool } from "../lib/http.js";
import { getSources, getString, putString } from "../lib/store.js";
import { decodeEntities, hoursAgo, isAfter, matchesAny, stripHtml, toIso, truncate } from "../lib/text.js";
import { clampSince, KEYWORDS, LIMIT, SINCE } from "./news.js";

// ---------- Instagram (Meta Graph API, Business Discovery) ----------

export function graphBase(env) {
  return `https://graph.facebook.com/${env.META_GRAPH_VERSION || "v25.0"}`;
}

export async function metaToken(env) {
  return (await getString(env, "meta_token")) || env.META_ACCESS_TOKEN || null;
}

// Your own Instagram professional account ID. Taken from IG_USER_ID, or found
// once through your Facebook Pages and cached.
export async function igUserId(env, ctx) {
  if (env.IG_USER_ID) return { id: env.IG_USER_ID };
  const cached = await getString(env, "ig_user_id");
  if (cached) return { id: cached };
  const token = await metaToken(env);
  if (!token) return { error: "META_ACCESS_TOKEN is not set" };
  const r = await fetchJson(`${graphBase(env)}/me/accounts?fields=name,instagram_business_account{id,username}&access_token=${encodeURIComponent(token)}`, ctx, { label: "meta me/accounts" });
  if (!r.ok) return { error: `could not list your Pages: ${r.error}` };
  const page = (r.data.data || []).find((p) => p.instagram_business_account?.id);
  if (!page) return { error: "no Facebook Page with a linked Instagram professional account was found for this token" };
  await putString(env, "ig_user_id", page.instagram_business_account.id);
  return { id: page.instagram_business_account.id, username: page.instagram_business_account.username };
}

export async function igFetchAccount(handle, n, env, ctx, me, token) {
  const fields = `business_discovery.username(${handle}){username,name,followers_count,media_count,media.limit(${n}){caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count}}`;
  const r = await fetchJson(`${graphBase(env)}/${me}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`, ctx, { label: `ig ${handle}` });
  if (!r.ok) return { handle, error: r.error };
  const bd = r.data.business_discovery || {};
  return {
    handle,
    name: bd.name,
    followers: bd.followers_count,
    posts: (bd.media?.data || []).map((m) => ({
      caption: truncate(m.caption || "", 400),
      type: m.media_product_type === "REELS" ? "reel" : (m.media_type || "").toLowerCase(),
      published: m.timestamp ? toIso(m.timestamp) : null,
      url: m.permalink,
      likes: m.like_count,
      comments: m.comments_count,
    })),
  };
}

export const instagramPosts = {
  name: "instagram_posts",
  description:
    "Recent public posts (captions, Reels, likes, comments) from Instagram business or creator accounts on the watchlist, through Meta's official Business Discovery API. Personal accounts cannot be read. Needs META_ACCESS_TOKEN.",
  inputSchema: {
    type: "object",
    properties: {
      handles: { type: "array", items: { type: "string" }, description: "Usernames without @. Default: the Instagram watchlist." },
      since_hours: SINCE,
      keywords: KEYWORDS,
      per_account: { type: "number", description: "Posts to read per account (default 8, max 25)." },
    },
  },
  async run(args, ctx) {
    const token = await metaToken(ctx.env);
    if (!token) return { configured: false, items: [], errors: [{ source: "Instagram", error: "Not configured: set META_ACCESS_TOKEN (see docs/SETUP.md)." }] };
    const me = await igUserId(ctx.env, ctx);
    if (me.error) return { configured: false, items: [], errors: [{ source: "Instagram", error: me.error }] };
    const sources = await getSources(ctx.env);
    const handles = (args.handles?.length ? args.handles : sources.instagram.map((x) => x.handle)).map((h) => h.replace(/^@/, ""));
    const n = Math.min(Math.max(args.per_account || 8, 1), 25);
    const since = hoursAgo(clampSince(args.since_hours, 48));
    const accounts = await pool(handles, 4, (h) => igFetchAccount(h, n, ctx.env, ctx, me.id, token));
    const items = [];
    const errors = [];
    const profiles = [];
    for (const a of accounts) {
      if (a.error) {
        errors.push({ source: `@${a.handle}`, error: a.error });
        continue;
      }
      profiles.push({ handle: a.handle, name: a.name, followers: a.followers });
      for (const p of a.posts) {
        if (!isAfter(p.published, since) || !matchesAny(p.caption, args.keywords)) continue;
        items.push({ account: `@${a.handle}`, followers: a.followers, ...p });
      }
    }
    items.sort((x, y) => String(y.published).localeCompare(String(x.published)));
    return { configured: true, count: items.length, items, profiles, errors };
  },
};

// ---------- YouTube (public channel RSS, no key needed) ----------

export async function ytChannel(ch, ctx) {
  const r = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channel_id}`, ctx, { label: `yt ${ch.name}` });
  if (!r.ok) return { channel: ch, error: r.error };
  const videos = [...r.text.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const g = (re) => (e.match(re) || [])[1] || "";
    return {
      title: decodeEntities(g(/<title>([\s\S]*?)<\/title>/)),
      url: g(/<link[^>]*href="([^"]+)"/),
      published: toIso(g(/<published>([^<]+)<\/published>/)),
      description: truncate(stripHtml(g(/<media:description>([\s\S]*?)<\/media:description>/)), 300),
      views: Number(g(/<media:statistics views="(\d+)"/)) || null,
      is_short: /\/shorts\//.test(g(/<link[^>]*href="([^"]+)"/)),
    };
  });
  return { channel: ch, videos };
}

export const youtubeVideos = {
  name: "youtube_videos",
  description: "Latest videos (title, description, views, Shorts flag) from YouTube channels on the watchlist, read from YouTube's public channel feeds. No API key needed.",
  inputSchema: {
    type: "object",
    properties: {
      channel_ids: { type: "array", items: { type: "string" }, description: "Channel IDs starting with UC. Default: the YouTube watchlist." },
      since_hours: SINCE,
      keywords: KEYWORDS,
      limit: LIMIT(40),
    },
  },
  async run(args, ctx) {
    const sources = await getSources(ctx.env);
    const chans = args.channel_ids?.length ? args.channel_ids.map((id) => ({ channel_id: id, name: id })) : sources.youtube;
    const since = hoursAgo(clampSince(args.since_hours, 48));
    const res = await pool(chans, 6, (c) => ytChannel(c, ctx));
    const items = [];
    const errors = [];
    for (const r of res) {
      if (r.error) {
        errors.push({ source: r.channel.name, error: r.error });
        continue;
      }
      for (const v of r.videos) {
        if (!isAfter(v.published, since) || !matchesAny(`${v.title} ${v.description}`, args.keywords)) continue;
        items.push({ channel: r.channel.name, ...v });
      }
    }
    items.sort((a, b) => String(b.published).localeCompare(String(a.published)));
    return { count: items.length, items: items.slice(0, args.limit || 40), errors };
  },
};

// ---------- Bluesky (open AT Protocol API) ----------

async function bskySession(env, ctx) {
  if (!env.BLUESKY_HANDLE || !env.BLUESKY_APP_PASSWORD) return null;
  const f = ctx.fetch || fetch;
  if (!ctx.budget.take("bluesky login")) return null;
  try {
    const res = await f("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: env.BLUESKY_HANDLE, password: env.BLUESKY_APP_PASSWORD }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()).accessJwt || null;
  } catch {
    return null;
  }
}

function bskyItem(p) {
  const rkey = (p.uri || "").split("/").pop();
  return {
    author: `@${p.author?.handle}`,
    name: p.author?.displayName,
    text: truncate(p.record?.text || "", 400),
    url: `https://bsky.app/profile/${p.author?.handle}/post/${rkey}`,
    link: p.embed?.external?.uri || null,
    published: toIso(p.record?.createdAt || p.indexedAt),
    likes: p.likeCount,
    reposts: p.repostCount,
  };
}

export const blueskyPosts = {
  name: "bluesky_posts",
  description:
    "Posts from AI researchers and labs on Bluesky. Without a query it reads the watchlist accounts (no login needed). With a query it searches all of Bluesky, which needs BLUESKY_HANDLE and a free BLUESKY_APP_PASSWORD.",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string", description: "Full-text search across Bluesky (needs app password)." }, since_hours: SINCE, keywords: KEYWORDS, limit: LIMIT(40) },
  },
  async run(args, ctx) {
    const since = hoursAgo(clampSince(args.since_hours));
    const errors = [];
    let posts = [];
    if (args.query) {
      const jwt = await bskySession(ctx.env, ctx);
      if (!jwt) return { count: 0, items: [], errors: [{ source: "Bluesky search", error: "Search needs BLUESKY_HANDLE and BLUESKY_APP_PASSWORD (free). Leave query empty to read the watchlist instead." }] };
      const r = await fetchJson(`https://bsky.social/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(args.query)}&sort=latest&limit=50`, ctx, { headers: { authorization: `Bearer ${jwt}` }, label: "bluesky search" });
      if (!r.ok) errors.push({ source: "Bluesky search", error: r.error });
      else posts = r.data.posts || [];
    } else {
      const sources = await getSources(ctx.env);
      const res = await pool(sources.bluesky, 6, (a) =>
        fetchJson(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(a.handle)}&limit=10&filter=posts_no_replies`, ctx, { label: `bsky ${a.handle}` }).then((r) => ({ a, r }))
      );
      for (const { a, r } of res) {
        if (!r.ok) errors.push({ source: `@${a.handle}`, error: r.error });
        else posts.push(...(r.data.feed || []).filter((f) => !f.reason).map((f) => f.post));
      }
    }
    const items = posts
      .map(bskyItem)
      .filter((p) => isAfter(p.published, since) && matchesAny(p.text, args.keywords))
      .sort((a, b) => String(b.published).localeCompare(String(a.published)));
    return { count: items.length, items: items.slice(0, args.limit || 40), errors };
  },
};

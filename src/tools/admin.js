import { DEFAULT_SOURCES } from "../sources.js";
import { getSources, getString, saveSources, putJson } from "../lib/store.js";
import { igUserId, metaToken } from "./social.js";
import { personalOn } from "./personal.js";

const LISTS = {
  labs: { key: "id", shape: '{"id","name","url","lang"}' },
  foreign: { key: "id", shape: '{"id","name","url","lang"} (lang de, da, es or zh)' },
  brazil: { key: "id", shape: '{"id","name","url","lang":"pt"}' },
  pages: { key: "id", shape: '{"id","name","url","prefix","lang"} for news pages without RSS' },
  github_orgs: { key: null, shape: '"org-name"' },
  instagram: { key: "handle", shape: '{"handle","name","type":"outlet|creator"}' },
  youtube: { key: "channel_id", shape: '{"channel_id":"UC...","name"}' },
  bluesky: { key: "handle", shape: '{"handle","name"}' },
  arxiv_categories: { key: null, shape: '"cs.AI"' },
  reddit_subs: { key: null, shape: '"LocalLLaMA"' },
};

export const watchlist = {
  name: "watchlist",
  description:
    "View or change what the radar watches: feeds, news pages, GitHub orgs, Instagram handles, YouTube channels, Bluesky accounts, arXiv categories, subreddits. Changes are saved and apply to every tool and every future call.",
  inputSchema: {
    type: "object",
    required: ["action"],
    properties: {
      action: { type: "string", enum: ["get", "add", "remove", "reset"] },
      list: { type: "string", enum: Object.keys(LISTS) },
      item: { description: "For add: the entry to add (see `get` for the shape). For remove: the entry or its id/handle/channel_id." },
    },
  },
  async run(args, ctx) {
    const sources = await getSources(ctx.env);
    if (args.action === "get") {
      if (args.list) return { list: args.list, shape: LISTS[args.list]?.shape, entries: sources[args.list] || [] };
      return { lists: Object.fromEntries(Object.keys(LISTS).map((k) => [k, (sources[k] || []).length])), shapes: Object.fromEntries(Object.entries(LISTS).map(([k, v]) => [k, v.shape])) };
    }
    if (args.action === "reset") {
      if (args.list) sources[args.list] = structuredClone(DEFAULT_SOURCES[args.list]);
      else Object.assign(sources, structuredClone(DEFAULT_SOURCES));
      await saveSources(ctx.env, sources);
      return { ok: true, reset: args.list || "all" };
    }
    const spec = LISTS[args.list];
    if (!spec) return { error: `list must be one of: ${Object.keys(LISTS).join(", ")}` };
    if (args.item === undefined || args.item === null || args.item === "") return { error: "item is required" };
    const list = sources[args.list] || [];
    const idOf = (x) => (spec.key ? (typeof x === "string" ? x : x?.[spec.key]) : x);
    const id = String(idOf(args.item)).replace(/^@/, "");
    if (args.action === "add") {
      if (spec.key && typeof args.item !== "object") return { error: `add expects an object: ${spec.shape}` };
      if (spec.key === "handle") args.item.handle = args.item.handle.replace(/^@/, "");
      if (list.some((x) => String(idOf(x)) === id)) return { ok: true, note: "already on the list" };
      list.push(args.item);
    } else if (args.action === "remove") {
      const before = list.length;
      sources[args.list] = list.filter((x) => String(idOf(x)) !== id);
      if (sources[args.list].length === before) return { ok: false, note: `${id} was not on ${args.list}` };
    }
    if (args.action === "add") sources[args.list] = list;
    await saveSources(ctx.env, sources);
    return { ok: true, list: args.list, size: sources[args.list].length };
  },
};

export const radarStatus = {
  name: "radar_status",
  description: "Shows how this radar is configured: which optional sources are switched on (Instagram, Bluesky search, GitHub token, personal-use sources), storage, Meta token expiry, and the size of each watchlist. Call it when a tool reports something is not configured.",
  inputSchema: { type: "object", properties: {} },
  async run(_args, ctx) {
    const env = ctx.env;
    const sources = await getSources(env);
    const token = await metaToken(env);
    let instagram = token ? "token set" : "off (no META_ACCESS_TOKEN)";
    if (token) {
      const me = await igUserId(env, ctx);
      instagram = me.error ? `token set, but: ${me.error}` : `on (account id ${me.id}${me.username ? `, @${me.username}` : ""})`;
    }
    const expires = await getString(env, "meta_token_expires");
    await putJson(env, "status_checked", new Date().toISOString());
    return {
      version: "1.0.0",
      storage: env.RADAR_KV ? "Cloudflare KV" : "memory only (bind RADAR_KV so watchlist edits persist)",
      instagram,
      meta_token_expires: expires || (token ? "unknown (a System User token does not expire)" : null),
      meta_auto_refresh: env.META_APP_ID && env.META_APP_SECRET ? "on (daily check, refresh when under 10 days left)" : "off (set META_APP_ID and META_APP_SECRET to refresh user tokens)",
      bluesky_search: env.BLUESKY_HANDLE && env.BLUESKY_APP_PASSWORD ? "on" : "off (watchlist reading still works)",
      github_token: env.GITHUB_TOKEN ? "on" : "off (60 requests/hour limit)",
      personal_sources: personalOn(env) ? "ON: reddit_top, google_news and Google News in brazil_gap. Personal use only." : "off",
      x_twitter: "not included: X has no free read access since February 2026",
      watchlist: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v.length])),
    };
  },
};

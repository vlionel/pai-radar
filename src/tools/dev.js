import { parseFeed } from "../lib/feed.js";
import { fetchJson, fetchText, pool } from "../lib/http.js";
import { getSources } from "../lib/store.js";
import { hoursAgo, isAfter, toIso, truncate } from "../lib/text.js";
import { clampSince, KEYWORDS, LIMIT, SINCE } from "./news.js";

const AI_TERMS = ["ai", "llm", "gpt", "claude", "gemini", "llama", "qwen", "deepseek", "mistral", "openai", "anthropic", "model", "agent", "transformer", "diffusion", "neural", "inference", "rag", "prompt", "copilot", "chatbot", "machine learning", "deep learning", "meta"];

function aiTitle(title) {
  const t = ` ${(title || "").toLowerCase()} `;
  return AI_TERMS.some((w) => (w.length <= 3 ? new RegExp(`[^a-z]${w}[^a-z]`).test(t) : t.includes(w)));
}

export const githubReleases = {
  name: "github_releases",
  description:
    "New repositories and recent releases from AI lab GitHub organizations (OpenAI, Anthropic, DeepMind, Meta, Qwen, DeepSeek, Mistral, Moonshot, Zhipu, MiniMax and more). Chinese labs often publish here before any press. Set GITHUB_TOKEN for higher rate limits.",
  inputSchema: {
    type: "object",
    properties: {
      since_hours: SINCE,
      orgs: { type: "array", items: { type: "string" }, description: "Override the watchlist organizations." },
      include_releases: { type: "boolean", description: "Also fetch the latest release of the most recently pushed repos (default true)." },
      limit: LIMIT(30),
    },
  },
  async run(args, ctx) {
    const sources = await getSources(ctx.env);
    const orgs = args.orgs?.length ? args.orgs : sources.github_orgs;
    const sinceH = clampSince(args.since_hours, 48);
    const day = hoursAgo(sinceH).toISOString().slice(0, 10);
    const headers = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" };
    if (ctx.env.GITHUB_TOKEN) headers.authorization = `Bearer ${ctx.env.GITHUB_TOKEN}`;
    const batches = [];
    for (let i = 0; i < orgs.length; i += 7) batches.push(orgs.slice(i, i + 7));
    const errors = [];
    const repos = new Map();
    for (const kind of ["created", "pushed"]) {
      const res = await pool(batches, 2, (b) =>
        fetchJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(b.map((o) => `org:${o}`).join(" ") + ` ${kind}:>=${day}`)}&sort=updated&order=desc&per_page=30`, ctx, { headers, label: `github ${kind}` })
      );
      for (const r of res) {
        if (!r.ok) {
          errors.push({ source: `GitHub search (${kind})`, error: r.error });
          continue;
        }
        for (const it of r.data.items || []) {
          const prev = repos.get(it.full_name);
          const created = it.created_at >= day;
          repos.set(it.full_name, {
            repo: it.full_name,
            url: it.html_url,
            description: truncate(it.description || "", 200),
            stars: it.stargazers_count,
            created_at: it.created_at,
            pushed_at: it.pushed_at,
            new_repo: created || prev?.new_repo || false,
          });
        }
      }
    }
    let list = [...repos.values()].sort((a, b) => (b.new_repo - a.new_repo) || b.pushed_at.localeCompare(a.pushed_at));
    if (args.include_releases !== false) {
      const top = list.slice(0, 8);
      const rel = await pool(top, 4, (r) => fetchJson(`https://api.github.com/repos/${r.repo}/releases?per_page=2`, ctx, { headers, label: `releases ${r.repo}` }));
      const since = hoursAgo(sinceH);
      rel.forEach((r, i) => {
        if (!r?.ok) return;
        const recent = (r.data || []).filter((x) => isAfter(x.published_at, since));
        if (recent.length) top[i].releases = recent.map((x) => ({ tag: x.tag_name, name: x.name, url: x.html_url, published: x.published_at, notes: truncate((x.body || "").replace(/\s+/g, " "), 240) }));
      });
    }
    return { count: list.length, items: list.slice(0, args.limit || 30), errors };
  },
};

export const arxivNew = {
  name: "arxiv_new",
  description: "Newest arXiv submissions in AI categories (default cs.AI, cs.CL, cs.LG, cs.CV), optionally filtered by keywords. Good for spotting a paper behind a launch.",
  inputSchema: {
    type: "object",
    properties: {
      categories: { type: "array", items: { type: "string" }, description: 'arXiv categories, e.g. ["cs.CL"].' },
      keywords: KEYWORDS,
      limit: LIMIT(25),
    },
  },
  async run(args, ctx) {
    const sources = await getSources(ctx.env);
    const cats = (args.categories?.length ? args.categories : sources.arxiv_categories).map((c) => `cat:${c}`).join(" OR ");
    const kw = (args.keywords || []).map((k) => `all:"${k.replace(/"/g, "")}"`).join(" OR ");
    const q = kw ? `(${cats}) AND (${kw})` : `(${cats})`;
    const n = Math.min(args.limit || 25, 100);
    const r = await fetchText(`https://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&sortBy=submittedDate&sortOrder=descending&max_results=${n}`, ctx, { label: "arxiv", timeoutMs: 12000 });
    if (!r.ok) return { count: 0, items: [], errors: [{ source: "arXiv", error: r.error }] };
    const items = parseFeed(r.text).items.map((i) => ({ title: i.title, url: i.url, published: i.published, summary: i.summary, categories: i.categories }));
    return { count: items.length, items, errors: [] };
  },
};

export const hfTrending = {
  name: "hf_trending",
  description: "Trending models, Spaces or today's papers on Hugging Face. New open-weight models (Qwen, DeepSeek, Llama, Mistral) usually appear here first.",
  inputSchema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["models", "spaces", "papers"], description: "Default models." },
      limit: LIMIT(20),
    },
  },
  async run(args, ctx) {
    const kind = args.kind || "models";
    const n = Math.min(args.limit || 20, 100);
    if (kind === "papers") {
      const r = await fetchJson(`https://huggingface.co/api/daily_papers?limit=${n}`, ctx, { label: "hf papers" });
      if (!r.ok) return { count: 0, items: [], errors: [{ source: "Hugging Face papers", error: r.error }] };
      const items = (r.data || []).map((p) => ({
        title: p.title || p.paper?.title,
        url: `https://huggingface.co/papers/${p.paper?.id}`,
        arxiv: p.paper?.id ? `https://arxiv.org/abs/${p.paper.id}` : null,
        upvotes: p.paper?.upvotes,
        published: toIso(p.publishedAt || p.paper?.publishedAt),
        summary: truncate(p.paper?.summary || "", 280),
      }));
      return { count: items.length, items, errors: [] };
    }
    const r = await fetchJson(`https://huggingface.co/api/${kind}?sort=trendingScore&direction=-1&limit=${n}`, ctx, { label: `hf ${kind}` });
    if (!r.ok) return { count: 0, items: [], errors: [{ source: `Hugging Face ${kind}`, error: r.error }] };
    const items = (r.data || []).map((m) => ({
      id: m.id,
      url: `https://huggingface.co/${kind === "spaces" ? "spaces/" : ""}${m.id}`,
      likes: m.likes,
      downloads: m.downloads,
      trending_score: m.trendingScore,
      task: m.pipeline_tag || m.sdk,
      created_at: m.createdAt,
    }));
    return { count: items.length, items, errors: [] };
  },
};

export const hnTop = {
  name: "hn_top",
  description: "Hacker News stories about AI from the last hours, ranked by points. Shows what developers are reacting to. Without keywords it keeps AI-related titles only.",
  inputSchema: {
    type: "object",
    properties: { since_hours: SINCE, keywords: KEYWORDS, min_points: { type: "number", description: "Default 30." }, limit: LIMIT(25) },
  },
  async run(args, ctx) {
    const since = Math.floor(hoursAgo(clampSince(args.since_hours)).getTime() / 1000);
    const pts = Number.isFinite(args.min_points) ? args.min_points : 30;
    const q = (args.keywords || []).join(" ");
    const r = await fetchJson(`https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=100&numericFilters=${encodeURIComponent(`created_at_i>${since},points>=${pts}`)}${q ? `&query=${encodeURIComponent(q)}` : ""}`, ctx, { label: "hn" });
    if (!r.ok) return { count: 0, items: [], errors: [{ source: "Hacker News", error: r.error }] };
    const items = (r.data.hits || [])
      .filter((h) => (q ? true : aiTitle(h.title)))
      .sort((a, b) => b.points - a.points)
      .slice(0, args.limit || 25)
      .map((h) => ({ title: h.title, url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, discussion: `https://news.ycombinator.com/item?id=${h.objectID}`, points: h.points, comments: h.num_comments, published: h.created_at }));
    return { count: items.length, items, errors: [] };
  },
};


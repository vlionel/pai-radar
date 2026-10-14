// Fetch helpers with a per-request budget. Cloudflare's free plan allows 50
// outbound requests per invocation, so every tool spends from one shared budget
// and reports what it skipped instead of failing outright.

const UA = "pai-radar/1.0 (+https://github.com/vlionel/pai-radar; news monitoring)";

export class Budget {
  constructor(limit = 45) {
    this.left = limit;
    this.skipped = [];
  }
  take(label) {
    if (this.left <= 0) {
      this.skipped.push(label);
      return false;
    }
    this.left -= 1;
    return true;
  }
}

export async function fetchText(url, ctx, { headers = {}, timeoutMs = 8000, label } = {}) {
  if (ctx?.budget && !ctx.budget.take(label || url)) {
    return { ok: false, status: 0, error: "skipped: request budget for this call is used up" };
  }
  const f = ctx?.fetch || fetch;
  try {
    const res = await f(url, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/atom+xml, application/json, text/xml, */*", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    const text = await res.text();
    return res.ok ? { ok: true, status: res.status, text } : { ok: false, status: res.status, text, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, status: 0, error: e?.name === "TimeoutError" ? "timeout" : String(e?.message || e) };
  }
}

export async function fetchJson(url, ctx, opts = {}) {
  const r = await fetchText(url, ctx, { ...opts, headers: { accept: "application/json", ...(opts.headers || {}) } });
  if (!r.ok) {
    let detail = r.error;
    try {
      const j = JSON.parse(r.text || "");
      detail = j?.error?.message || j?.message || detail;
    } catch {}
    return { ok: false, status: r.status, error: detail };
  }
  try {
    return { ok: true, status: r.status, data: JSON.parse(r.text) };
  } catch {
    return { ok: false, status: r.status, error: "response was not JSON" };
  }
}

// Run async jobs with a small concurrency cap; never throws.
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch (e) {
        out[idx] = { error: String(e?.message || e) };
      }
    }
  });
  await Promise.all(workers);
  return out;
}

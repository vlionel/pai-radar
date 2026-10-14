// Small text helpers shared by every tool. No dependencies, so they run the
// same way in Cloudflare Workers and in Node's test runner.

const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", copy: "©", reg: "®",
  euro: "€", middot: "·", bull: "•",
};

export function decodeEntities(s) {
  if (!s) return "";
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    const v = NAMED[code.toLowerCase()];
    return v === undefined ? m : v;
  });
}

export function stripHtml(s) {
  if (!s) return "";
  // Feeds often carry markup that is itself entity-escaped (&lt;p&gt;), so
  // decode once, strip tags, then decode what remains.
  const once = decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
  return decodeEntities(
    once.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

export function truncate(s, n = 280) {
  if (!s || s.length <= n) return s || "";
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut) + "…";
}

// Lowercase and remove accents so "inteligência" matches "inteligencia".
export function fold(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function matchesAny(text, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const t = fold(text);
  return keywords.some((k) => k && t.includes(fold(k)));
}

export function toIso(value) {
  if (!value) return null;
  const d = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000);
}

export function isAfter(iso, since) {
  if (!iso) return true; // undated items are kept and flagged, never silently dropped
  return new Date(iso) >= since;
}

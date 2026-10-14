// Tolerant RSS 2.0 / RSS 1.0 (RDF) / Atom parser. Workers have no DOMParser,
// so this works on the raw XML with regular expressions. It is deliberately
// forgiving: a feed with odd markup should still yield titles and links.

import { decodeEntities, stripHtml, toIso, truncate } from "./text.js";

function unwrap(s) {
  if (s == null) return "";
  const cdata = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return cdata ? cdata[1] : s;
}

function tag(block, names) {
  for (const name of names) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i");
    const m = block.match(re);
    if (m) return unwrap(m[1]);
  }
  return "";
}

function atomLink(block) {
  const links = [...block.matchAll(/<link\b([^>]*?)\/?>/gi)].map((m) => m[1]);
  let fallback = "";
  for (const attrs of links) {
    const href = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!href) continue;
    const rel = attrs.match(/rel\s*=\s*["']([^"']+)["']/i);
    if (!rel || rel[1] === "alternate") return decodeEntities(href[1]);
    if (!fallback) fallback = decodeEntities(href[1]);
  }
  return fallback;
}

export function parseFeed(xml) {
  if (!xml || typeof xml !== "string") return { title: "", items: [] };
  const isAtom = /<feed\b[^>]*xmlns=["']http:\/\/www\.w3\.org\/2005\/Atom/i.test(xml) || (/<entry\b/i.test(xml) && !/<item\b/i.test(xml));
  const head = xml.split(isAtom ? /<entry\b/i : /<item\b/i)[0];
  const feedTitle = stripHtml(tag(head, ["title"]));
  const blocks = isAtom
    ? [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => m[0])
    : [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);

  const items = blocks.map((b) => {
    const title = stripHtml(tag(b, ["title"]));
    let link = isAtom ? atomLink(b) : stripHtml(tag(b, ["link"])) || atomLink(b);
    if (!link) link = stripHtml(tag(b, ["guid", "id"]));
    const date = toIso(stripHtml(tag(b, ["pubDate", "published", "updated", "dc:date", "a10:updated"])));
    const summary = truncate(stripHtml(tag(b, ["description", "summary", "content:encoded", "content"])), 320);
    const categories = [...b.matchAll(/<category\b[^>]*?(?:term=["']([^"']+)["'][^>]*?\/>|>([\s\S]*?)<\/category>)/gi)]
      .map((m) => stripHtml(unwrap(m[1] || m[2] || "")))
      .filter(Boolean)
      .slice(0, 8);
    return { title, url: link.trim(), published: date, summary, categories };
  }).filter((i) => i.title || i.url);

  return { title: feedTitle, items };
}

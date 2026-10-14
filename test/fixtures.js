const now = new Date();
const iso = (h) => new Date(now - h * 3600e3).toISOString();
const rfc = (h) => new Date(now - h * 3600e3).toUTCString();

export const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Olhar Digital</title>
<item><title><![CDATA[Meta lança Muse Wonder, novo modelo de IA]]></title><link>https://olhardigital.com.br/2026/10/13/muse-wonder/</link><pubDate>${rfc(2)}</pubDate><description>&lt;p&gt;A Meta anunciou o Muse Wonder&amp;hellip;&lt;/p&gt;</description><category>IA</category></item>
<item><title>Celular velho</title><link>https://olhardigital.com.br/old</link><pubDate>${rfc(200)}</pubDate></item>
</channel></rss>`;

export const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Lab Blog</title>
<entry><title type="html">Introducing Model X &amp;amp; friends</title><link rel="alternate" href="https://lab.example/x"/><link rel="self" href="https://lab.example/x.atom"/><published>${iso(1)}</published><summary>Our new model.</summary><category term="Research"/></entry>
</feed>`;

export const RDF = `<?xml version="1.0"?><rdf:RDF xmlns:rdf="x" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>heise</title></channel>
<item><title>KI-Modell veröffentlicht</title><link>https://heise.de/a</link><dc:date>${iso(3)}</dc:date><description>Neues Sprachmodell.</description></item></rdf:RDF>`;

export const PAGE = `<html><body><a href="/news/claude-new-thing">Introducing a brand new Claude capability</a><a href="/news/">News</a><a href="https://other.com/news/x">Elsewhere link title long</a><a href="/careers">Careers page link</a></body></html>`;

export const YT = `<feed xmlns:media="x"><entry><title>Muse Wonder testado na prática</title><link rel="alternate" href="https://www.youtube.com/shorts/abc"/><published>${iso(5)}</published><media:group><media:description>Testei o novo modelo da Meta</media:description><media:community><media:statistics views="12345"/></media:community></media:group></entry></feed>`;

export const IG = { business_discovery: { username: "tecmundo", name: "TecMundo", followers_count: 3000000, media_count: 9000, media: { data: [
  { caption: "O Muse Wonder chegou! #ia", media_type: "VIDEO", media_product_type: "REELS", timestamp: iso(1).replace("Z", "+0000"), permalink: "https://instagram.com/reel/1", like_count: 900, comments_count: 40 },
  { caption: "Outro assunto", media_type: "IMAGE", timestamp: iso(2).replace("Z", "+0000"), permalink: "https://instagram.com/p/2", like_count: 5 },
] } } };

export function mockFetch(routes, log = []) {
  return async (url, init = {}) => {
    const u = String(url);
    log.push(u);
    for (const [pattern, body] of routes) {
      if (u.includes(pattern)) {
        if (body instanceof Error) throw body;
        if (typeof body === "number") return new Response("err", { status: body });
        return new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200 });
      }
    }
    return new Response("not found", { status: 404 });
  };
}

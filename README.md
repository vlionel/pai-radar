# P.a.i Radar

A free MCP connector that watches the AI news cycle and tells you whether Brazil has covered a story yet. Add it to Claude once and it works in every chat, project and scheduled task.

It runs on Cloudflare Workers' free plan. Nothing here costs money, and each person who uses it deploys their own copy with their own keys.

## What it reads

| Tool | Source | Needs |
|---|---|---|
| `lab_news` | Lab blogs (OpenAI, DeepMind, Google, Mistral, Microsoft, NVIDIA, Hugging Face, Qwen, Apple, Amazon and more), lab news pages without RSS (Anthropic, Meta AI, xAI, Cohere, DeepSeek), foreign tech press (German, Danish, Spanish, Chinese) and Brazilian outlets | nothing |
| `github_releases` | New repos and releases from 16 AI lab GitHub orgs | optional `GITHUB_TOKEN` |
| `hf_trending` | Trending models, Spaces and daily papers on Hugging Face | nothing |
| `arxiv_new` | Newest arXiv papers in AI categories | nothing |
| `hn_top` | AI stories on Hacker News | nothing |
| `bluesky_posts` | AI researchers on Bluesky; full search with a free app password | optional |
| `youtube_videos` | Latest videos from watched channels (public feeds, no key) | nothing |
| `instagram_posts` | Captions, Reels and engagement from watched business and creator accounts (Meta's official API) | `META_ACCESS_TOKEN` |
| `brazil_gap` | The "post first" check: did Brazilian sites, Instagram or YouTube already cover these keywords? | Instagram optional |
| `watchlist` | Add or remove feeds, handles, channels and orgs | nothing |
| `radar_status` | What is switched on, and what is not | nothing |
| `reddit_top`, `google_news` | Personal use only, off by default (`PERSONAL_SOURCES = "on"`) | nothing |

**Not included: X (Twitter).** X has had no free read access since February 2026. Lab blogs, GitHub and Bluesky usually trail X by minutes.

## Honesty rules built in

- Every tool lists the sources it could not read (`errors`, `not_checked`). An unchecked source is never reported as "not covered".
- Foreign items keep their original language and link.
- News pages without RSS get a baseline on first read, so old links are never presented as new.
- Cloudflare's free plan allows about 50 outbound requests per call. When a call would exceed that, the tool says what it skipped.

## Setup

See [docs/SETUP.md](docs/SETUP.md). It takes about 20 minutes without Instagram and 50 with it.

## Development

```
npm install
npm test          # 19 tests, no network needed
npx wrangler dev  # local server; put RADAR_KEY in .dev.vars
```

## License

MIT. The code is free to share. The personal-use sources (`reddit_top`, `google_news`) are off by default because their terms restrict commercial reuse. Keep them off in any copy you share or sell.

// Default watchlist. Researched and checked on 2026-10-13; `verified: false`
// means the feed was blocked during checking and may need a replacement.
// Edit at runtime with the `watchlist` tool; KV overrides these defaults.

export const DEFAULT_SOURCES = {
  "labs": [
    {
      "id": "openai",
      "name": "OpenAI News",
      "url": "https://openai.com/news/rss.xml",
      "lang": "en",
      "verified": true
    },
    {
      "id": "google-deepmind",
      "name": "Google DeepMind Blog",
      "url": "https://deepmind.google/blog/rss.xml",
      "lang": "en",
      "verified": true
    },
    {
      "id": "google-ai-blog",
      "name": "Google - The Keyword (AI)",
      "url": "https://blog.google/technology/ai/rss/",
      "lang": "en",
      "verified": true
    },
    {
      "id": "google-research",
      "name": "Google Research Blog",
      "url": "https://research.google/blog/rss/",
      "lang": "en",
      "verified": true
    },
    {
      "id": "mistral",
      "name": "Mistral AI News",
      "url": "https://mistral.ai/rss.xml",
      "lang": "en",
      "verified": true
    },
    {
      "id": "microsoft-research",
      "name": "Microsoft Research Blog",
      "url": "https://www.microsoft.com/en-us/research/feed/",
      "lang": "en",
      "verified": true
    },
    {
      "id": "nvidia-technical",
      "name": "NVIDIA Technical Blog",
      "url": "https://developer.nvidia.com/blog/feed",
      "lang": "en",
      "verified": true
    },
    {
      "id": "huggingface",
      "name": "Hugging Face Blog",
      "url": "https://huggingface.co/blog/feed.xml",
      "lang": "en",
      "verified": true
    },
    {
      "id": "qwen",
      "name": "Qwen Blog (qwenlm.github.io)",
      "url": "https://qwenlm.github.io/blog/index.xml",
      "lang": "en",
      "verified": true
    },
    {
      "id": "apple-ml",
      "name": "Apple Machine Learning Research",
      "url": "https://machinelearning.apple.com/rss.xml",
      "lang": "en",
      "verified": true
    },
    {
      "id": "amazon-science",
      "name": "Amazon Science",
      "url": "https://www.amazon.science/index.rss",
      "lang": "en",
      "verified": true
    },
    {
      "id": "stability",
      "name": "Stability AI News & Updates",
      "url": "https://stability.ai/news-updates?format=rss",
      "lang": "en",
      "verified": true
    }
  ],
  "foreign": [
    {
      "id": "heise",
      "name": "heise online (news)",
      "url": "https://www.heise.de/rss/heise.rdf",
      "lang": "de",
      "verified": false
    },
    {
      "id": "t3n",
      "name": "t3n News",
      "url": "https://t3n.de/rss.xml",
      "lang": "de",
      "verified": true
    },
    {
      "id": "golem",
      "name": "Golem.de",
      "url": "https://rss.golem.de/rss.php?feed=RSS2.0",
      "lang": "de",
      "verified": true
    },
    {
      "id": "version2",
      "name": "Version2",
      "url": "https://www.version2.dk/rss",
      "lang": "da",
      "verified": true
    },
    {
      "id": "ingenioeren",
      "name": "Ingeniøren",
      "url": "https://ing.dk/rss/nyheder",
      "lang": "da",
      "verified": true
    },
    {
      "id": "xataka",
      "name": "Xataka",
      "url": "https://www.xataka.com/index.xml",
      "lang": "es",
      "verified": true
    },
    {
      "id": "elpais-tecnologia",
      "name": "El País Tecnología",
      "url": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/tecnologia/portada",
      "lang": "es",
      "verified": false
    },
    {
      "id": "36kr",
      "name": "36Kr",
      "url": "https://36kr.com/feed",
      "lang": "zh",
      "verified": true
    },
    {
      "id": "synced-review",
      "name": "Synced Review (English edition of 机器之心)",
      "url": "https://syncedreview.com/feed/",
      "lang": "en",
      "verified": true
    },
    {
      "id": "qbitai",
      "name": "量子位 QbitAI",
      "url": "https://www.qbitai.com/feed",
      "lang": "zh",
      "verified": true
    },
    {
      "id": "infoq-cn",
      "name": "InfoQ 中国",
      "url": "https://www.infoq.cn/feed",
      "lang": "zh",
      "verified": true
    },
    {
      "id": "lmi-ia",
      "name": "Le Monde Informatique - Intelligence artificielle",
      "url": "https://www.lemondeinformatique.fr/flux-rss/thematique/intelligence-artificielle/rss.xml",
      "lang": "fr",
      "country": "FR",
      "verified": true
    },
    {
      "id": "lmi-all",
      "name": "Le Monde Informatique - all news",
      "url": "https://www.lemondeinformatique.fr/flux-rss/lmi/rss.xml",
      "lang": "fr",
      "country": "FR",
      "verified": true
    },
    {
      "id": "generation-nt",
      "name": "Generation-NT Actualites",
      "url": "https://www.generation-nt.com/export/rss.xml",
      "lang": "fr",
      "country": "FR",
      "verified": true
    },
    {
      "id": "journaldugeek",
      "name": "Journal du Geek",
      "url": "https://www.journaldugeek.com/feed/",
      "lang": "fr",
      "country": "FR",
      "verified": true
    },
    {
      "id": "hdblog",
      "name": "HDblog",
      "url": "https://www.hdblog.it/rss/",
      "lang": "it",
      "country": "IT",
      "verified": true
    },
    {
      "id": "punto-informatico",
      "name": "Punto Informatico",
      "url": "https://www.punto-informatico.it/feed/",
      "lang": "it",
      "country": "IT",
      "verified": true
    },
    {
      "id": "itmedia-aiplus",
      "name": "ITmedia AI+",
      "url": "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml",
      "lang": "ja",
      "country": "JP",
      "verified": true
    },
    {
      "id": "publickey",
      "name": "Publickey",
      "url": "https://www.publickey1.jp/atom.xml",
      "lang": "ja",
      "country": "JP",
      "verified": true
    },
    {
      "id": "gigazine",
      "name": "GIGAZINE",
      "url": "https://gigazine.net/news/rss_2.0/",
      "lang": "ja",
      "country": "JP",
      "verified": true
    },
    {
      "id": "forest-watch",
      "name": "Windows no Mori (Impress Watch)",
      "url": "https://forest.watch.impress.co.jp/data/rss/1.0/wf/feed.rdf",
      "lang": "ja",
      "country": "JP",
      "verified": true
    },
    {
      "id": "aitimes",
      "name": "AI Times (aitimes.com)",
      "url": "https://www.aitimes.com/rss/allArticle.xml",
      "lang": "ko",
      "country": "KR",
      "verified": true
    },
    {
      "id": "etnews-ai",
      "name": "Electronic Times (etnews) - AI section",
      "url": "https://rss.etnews.com/04046.xml",
      "lang": "ko",
      "country": "KR",
      "verified": true
    },
    {
      "id": "habr-news",
      "name": "Habr - all news",
      "url": "https://habr.com/ru/rss/news/?fl=ru",
      "lang": "ru",
      "country": "RU",
      "verified": true
    },
    {
      "id": "3dnews",
      "name": "3DNews",
      "url": "https://3dnews.ru/news/rss/",
      "lang": "ru",
      "country": "RU",
      "verified": true
    },
    {
      "id": "thebell",
      "name": "The Bell",
      "url": "https://thebell.io/feed",
      "lang": "ru",
      "country": "RU",
      "verified": true
    },
    {
      "id": "cnews",
      "name": "CNews.ru",
      "url": "https://www.cnews.ru/inc/rss/news.xml",
      "lang": "ru",
      "country": "RU",
      "verified": true
    },
    {
      "id": "aitnews",
      "name": "AITnews (Al-Bawaba Al-Tiqniya)",
      "url": "https://aitnews.com/feed/",
      "lang": "ar",
      "country": "SA",
      "verified": true
    },
    {
      "id": "unlimit-tech",
      "name": "Unlimit Tech",
      "url": "https://www.unlimit-tech.com/feed/",
      "lang": "ar",
      "country": "AE",
      "verified": true
    },
    {
      "id": "tech-wd",
      "name": "Tech World (tech-wd.com)",
      "url": "https://www.tech-wd.com/wd/feed/",
      "lang": "ar",
      "country": "EG",
      "verified": true
    },
    {
      "id": "webrazzi",
      "name": "Webrazzi",
      "url": "https://webrazzi.com/feed/",
      "lang": "tr",
      "country": "TR",
      "verified": true
    },
    {
      "id": "shiftdelete",
      "name": "ShiftDelete.Net",
      "url": "https://www.shiftdelete.net/feed",
      "lang": "tr",
      "country": "TR",
      "verified": true
    },
    {
      "id": "donanimhaber",
      "name": "DonanimHaber (all news)",
      "url": "https://www.donanimhaber.com/rss/tum/",
      "lang": "tr",
      "country": "TR",
      "verified": true
    },
    {
      "id": "detik-inet",
      "name": "detikInet",
      "url": "https://inet.detik.com/rss",
      "lang": "id",
      "country": "ID",
      "verified": true
    },
    {
      "id": "cnbc-id-tech",
      "name": "CNBC Indonesia - Tech",
      "url": "https://www.cnbcindonesia.com/tech/rss",
      "lang": "id",
      "country": "ID",
      "verified": true
    },
    {
      "id": "amarujala-tech",
      "name": "Amar Ujala - Tech Diary",
      "url": "https://www.amarujala.com/rss/tech-diary.xml",
      "lang": "hi",
      "country": "IN",
      "verified": true
    },
    {
      "id": "amarujala-technology",
      "name": "Amar Ujala - Technology",
      "url": "https://www.amarujala.com/rss/technology.xml",
      "lang": "hi",
      "country": "IN",
      "verified": true
    }
  ],
  "brazil": [
    {
      "id": "olhardigital",
      "name": "Olhar Digital",
      "url": "https://olhardigital.com.br/feed/",
      "lang": "pt",
      "verified": true
    },
    {
      "id": "canaltech",
      "name": "Canaltech",
      "url": "https://feeds.feedburner.com/canaltechbr",
      "lang": "pt",
      "verified": true
    },
    {
      "id": "tecnoblog",
      "name": "Tecnoblog",
      "url": "https://tecnoblog.net/feed/",
      "lang": "pt",
      "verified": true
    },
    {
      "id": "exame",
      "name": "Exame (whole site)",
      "url": "https://exame.com/feed/",
      "lang": "pt",
      "verified": true
    },
    {
      "id": "folha-tec",
      "name": "Folha de S.Paulo - Tec",
      "url": "http://feeds.folha.uol.com.br/tec/rss091.xml",
      "lang": "pt",
      "verified": false
    }
  ],
  "pages": [
    {
      "id": "anthropic",
      "name": "Anthropic News",
      "url": "https://www.anthropic.com/news",
      "prefix": "/news/",
      "lang": "en",
      "verified": false
    },
    {
      "id": "meta-ai",
      "name": "AI at Meta Blog",
      "url": "https://ai.meta.com/blog/",
      "prefix": "/blog/",
      "lang": "en",
      "verified": false
    },
    {
      "id": "xai",
      "name": "xAI News",
      "url": "https://x.ai/news",
      "prefix": "/news/",
      "lang": "en",
      "verified": false
    },
    {
      "id": "cohere",
      "name": "Cohere Blog",
      "url": "https://cohere.com/blog",
      "prefix": "/blog/",
      "lang": "en",
      "verified": false
    },
    {
      "id": "deepseek",
      "name": "DeepSeek API News",
      "url": "https://api-docs.deepseek.com/",
      "prefix": "/news/",
      "lang": "en",
      "verified": false
    }
  ],
  "github_orgs": [
    "openai",
    "anthropics",
    "google-deepmind",
    "meta-llama",
    "facebookresearch",
    "QwenLM",
    "deepseek-ai",
    "mistralai",
    "huggingface",
    "microsoft",
    "NVIDIA",
    "xai-org",
    "MoonshotAI",
    "zai-org",
    "THUDM",
    "MiniMax-AI"
  ],
  "instagram": [
    {
      "handle": "olhardigital",
      "name": "Olhar Digital",
      "type": "outlet"
    },
    {
      "handle": "tecmundo",
      "name": "TecMundo",
      "type": "outlet"
    },
    {
      "handle": "techtudo",
      "name": "TechTudo",
      "type": "outlet"
    },
    {
      "handle": "canaltech",
      "name": "Canaltech",
      "type": "outlet"
    },
    {
      "handle": "tecnoblog",
      "name": "Tecnoblog",
      "type": "outlet"
    },
    {
      "handle": "izabela.anholett",
      "name": "Izabela Anholett",
      "type": "creator"
    },
    {
      "handle": "thaleslaray",
      "name": "Thales Laray",
      "type": "creator"
    },
    {
      "handle": "tiagolemosx",
      "name": "Tiago Lemos",
      "type": "creator"
    },
    {
      "handle": "orafavoss",
      "name": "Rafa Voss | IA na Prática",
      "type": "creator"
    },
    {
      "handle": "neonplus.tech",
      "name": "Neon+ Tech",
      "type": "creator"
    }
  ],
  "youtube": [
    {
      "channel_id": "UCGV72aVJuWP0QPNGH4YgIww",
      "name": "Olhar Digital",
      "handle": "@OlharDigital"
    },
    {
      "channel_id": "UCdmGjywrxeOPfC7vDllmSgQ",
      "name": "TecMundo",
      "handle": "@tecmundo"
    },
    {
      "channel_id": "UCqpNnEzmmlzBfdy3X0eMOMg",
      "name": "Tecnoblog",
      "handle": "@tecnoblog"
    },
    {
      "channel_id": "UCGi_SASiOZwMqq5Surm8BnA",
      "name": "Izabela Anholett",
      "handle": "@izabela.anholett"
    },
    {
      "channel_id": "UCZExPHIG-k9bUnnTRmqzn9g",
      "name": "Thales Laray",
      "handle": "@thaleslaray"
    },
    {
      "channel_id": "UCXKq7LnNU-5dTL1WKLeGX3Q",
      "name": "Tiago Lemos",
      "handle": "@tiagolemosx"
    },
    {
      "channel_id": "UCbSAFcj6mhbAfREWVC5o6PQ",
      "name": "Rafa Voss | IA na Prática",
      "handle": "@Orafavoss"
    }
  ],
  "bluesky": [
    {
      "handle": "simonwillison.net",
      "name": "Simon Willison"
    },
    {
      "handle": "anthropic.com",
      "name": "Anthropic"
    },
    {
      "handle": "natolambert.bsky.social",
      "name": "Nathan Lambert"
    },
    {
      "handle": "emilymbender.bsky.social",
      "name": "Emily M. Bender"
    },
    {
      "handle": "mmitchell.bsky.social",
      "name": "Margaret Mitchell"
    },
    {
      "handle": "garymarcus.bsky.social",
      "name": "Gary Marcus"
    },
    {
      "handle": "thomwolf.bsky.social",
      "name": "Thomas Wolf"
    },
    {
      "handle": "sarahooker.bsky.social",
      "name": "Sara Hooker"
    },
    {
      "handle": "hardmaru.bsky.social",
      "name": "hardmaru (David Ha)"
    },
    {
      "handle": "sakanaai.bsky.social",
      "name": "Sakana AI"
    },
    {
      "handle": "alexhanna.bsky.social",
      "name": "Alex Hanna"
    },
    {
      "handle": "melaniemitchell.bsky.social",
      "name": "Melanie Mitchell"
    },
    {
      "handle": "karenhao.bsky.social",
      "name": "Karen Hao"
    },
    {
      "handle": "chrmanning.bsky.social",
      "name": "Christopher Manning"
    },
    {
      "handle": "hamel.bsky.social",
      "name": "Hamel Husain"
    },
    {
      "handle": "vickiboykis.com",
      "name": "Vicki Boykis"
    }
  ],
  "arxiv_categories": [
    "cs.AI",
    "cs.CL",
    "cs.LG",
    "cs.CV"
  ],
  "reddit_subs": [
    "LocalLLaMA",
    "singularity",
    "OpenAI",
    "ClaudeAI",
    "MachineLearning",
    "brdev"
  ],
  "languages": [
    "de",
    "da",
    "es",
    "zh"
  ]
};

// Languages of the foreign desk. English and Portuguese are always read
// (labs and Brazilian outlets); these are the ones you can switch on and off.
// Danish is not a G20 language but is kept by choice.
export const LANGUAGES = {
  de: "German", da: "Danish", es: "Spanish", zh: "Chinese", fr: "French", it: "Italian",
  ja: "Japanese", ko: "Korean", ru: "Russian (independent outlets only)", ar: "Arabic",
  tr: "Turkish", id: "Indonesian", hi: "Hindi",
};

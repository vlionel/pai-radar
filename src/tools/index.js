import { labNews } from "./news.js";
import { arxivNew, githubReleases, hfTrending, hnTop } from "./dev.js";
import { blueskyPosts, instagramPosts, youtubeVideos } from "./social.js";
import { brazilGap } from "./gap.js";
import { googleNews, personalOn, redditTop } from "./personal.js";
import { radarStatus, watchlist } from "./admin.js";

const ALL = [labNews, githubReleases, hfTrending, arxivNew, hnTop, blueskyPosts, instagramPosts, youtubeVideos, brazilGap, redditTop, googleNews, watchlist, radarStatus];

export function toolsFor(env) {
  return ALL.filter((t) => !t.personal || personalOn(env));
}

# Setup guide

Four steps. Steps 1 to 3 give you a working radar without Instagram. Step 4 adds Instagram.

## 1. Deploy to Cloudflare (10 minutes, no terminal)

1. Create a free account at dash.cloudflare.com.
2. In the left menu, open **Workers & Pages**, then click **Create**.
3. Choose **Import a repository** and connect GitHub. Pick **pai-radar**.
4. Keep the defaults and click **Deploy**. The storage it needs is created automatically on the first deploy.
5. When it finishes, copy the address it shows. It looks like `https://pai-radar.YOUR-NAME.workers.dev`.

From now on, every change pushed to the repository deploys by itself.

## 2. Create your secret key (2 minutes)

The key is part of your connector's address, so anyone without it gets "Not found".

1. Make a random key of at least 24 characters. On Windows, open PowerShell and paste:

   ```
   -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 32 | % {[char]$_})
   ```

2. In Cloudflare, open your **pai-radar** Worker, then **Settings**, then **Variables and Secrets**.
3. Click **Add**, choose type **Secret**, name it `RADAR_KEY`, paste the key and save.

Keep this key private. If it leaks, replace it here and update the connector address in Claude.

## 3. Add the connector to Claude (2 minutes)

1. In Claude, open **Settings**, then **Connectors**, then **Add custom connector**.
2. Name: `P.a.i Radar`.
3. URL: `https://pai-radar.YOUR-NAME.workers.dev/mcp/YOUR-KEY`
4. Save. Start a new chat and ask: *"Run radar_status."*

It now works in every chat, project and scheduled task on your account.

## 4. Turn on Instagram (about 30 minutes, once)

This uses Meta's official Business Discovery API. It is free and reads public posts from business and creator accounts. It needs **your** Instagram to be a Professional account linked to a Facebook Page.

### 4a. Create a Meta app

1. Go to developers.facebook.com and log in with the Facebook account that manages your Page.
2. Click **My Apps**, then **Create App**. For the use case, choose **Other**, then app type **Business**. Name it `pai-radar`.
3. On the app dashboard, add the **Instagram** product, then pick **API setup with Facebook login**.

### 4b. Get a token that does not expire (recommended)

1. Go to business.facebook.com, then **Settings**, then **Users**, then **System users**. Click **Add**, name it `pai-radar`, role **Admin**.
2. Click **Assign assets**. Give it your Facebook **Page** and your **Instagram account**, with full control.
3. Click **Generate new token**. Pick the `pai-radar` app, set expiry to **Never**, and tick these permissions:
   `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `business_management`.
4. Copy the token.

If you cannot use System Users, the alternative is a 60-day token. Use the Graph API Explorer to generate a user token with the same permissions, then extend it in the Access Token Debugger. Also add `META_APP_ID` and `META_APP_SECRET` (from **App settings**, then **Basic**) so the daily job refreshes it before it expires.

### 4c. Give the token to the radar

1. In Cloudflare, open **Settings**, then **Variables and Secrets**, then **Add**. Choose type **Secret**, name `META_ACCESS_TOKEN`, and paste the token.
2. In Claude, ask: *"Run radar_status."* The Instagram line should read **on**, followed by your account ID.

The radar finds your Instagram account ID by itself. If it can't, add `IG_USER_ID` as another secret.

Your app can stay in **Development** mode. You are the only user, reading public data through your own account.

## Optional extras

| Secret | What it adds | Where to get it |
|---|---|---|
| `GITHUB_TOKEN` | 5,000 GitHub requests per hour instead of 60 | github.com, then **Settings**, **Developer settings**, **Fine-grained tokens**. Public repositories, read-only. |
| `BLUESKY_HANDLE` + `BLUESKY_APP_PASSWORD` | Full-text search across Bluesky | bsky.app, then **Settings**, **Privacy and security**, **App passwords** |

## Changing what it watches

Just ask Claude. For example: *"Add the Instagram account @someone to the radar watchlist,"* or *"Show the radar's YouTube list."* Changes are saved in Cloudflare and apply everywhere.

## Sharing with others

Send them the repository link. Each person deploys their own copy and uses their own keys and tokens. Never share your `RADAR_KEY` or Meta token. For any copy that is shared or sold, keep `PERSONAL_SOURCES` set to `"off"` in `wrangler.toml`.

## Troubleshooting

- **The connector says "Not found":** the key in the URL doesn't match `RADAR_KEY`.
- **Instagram error "(#10) Application does not have permission":** the token is missing one of the four permissions. Generate a new one.
- **A feed keeps failing:** some sites block automated readers. Remove it with the `watchlist` tool, or replace its URL.
- **"Skipped N requests":** the call hit Cloudflare's free per-call limit. Ask for fewer groups or accounts at once.

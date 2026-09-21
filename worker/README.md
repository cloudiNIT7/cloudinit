# Cloud iNIT assistant Worker (Gemini, grounded on cloudinit.online)

This Cloudflare Worker gives the site chatbot a real Gemini backend that will
**only answer from the content of https://cloudinit.online/**. Off-topic
questions are refused. It sits in front of the `gemini-web2api` backend and
keeps the backend key server-side.

```
Browser (chat.js)  ─▶  cloudinit-assistant Worker  ─▶  gemini-web2api Worker  ─▶  Gemini
     (this repo)          (grounds + refuses)            (raw OpenAI-compat proxy)
```

You must run these steps on **your own Cloudflare account** — deployment can't
be done for you because it needs your Cloudflare login.

---

## Step 1 — Deploy the gemini-web2api backend (raw Gemini proxy)

Use the upstream project's ready-made Worker:

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it `api` → **Deploy** → **Edit code**.
3. Paste the contents of
   https://github.com/sophomoresty/gemini-web2api/blob/main/cloudflare/worker.js
4. **Save and deploy**. Your backend is now at
   `https://api.<your-subdomain>.workers.dev` (endpoint `/v1`).
5. (Recommended) In the Worker's **Settings → Variables**, set:
   - `API_KEYS` = `["sk-cloudinit"]`  (a key the backend requires)
   - `COOKIE_STRING` + `SAPISID`  (a Gemini cookie, to avoid rate-limits — see upstream README)
6. (Optional) Map it to `api.cloudinit.online` under the Worker's
   **Settings → Domains & Routes → Add custom domain**.

Verify: open `https://api.<your-subdomain>.workers.dev/health` → JSON `status: ok`.

## Step 2 — Deploy this grounding Worker

From this `worker/` folder:

```bash
cd worker
npm install
npx wrangler login                       # opens browser to auth your account

# point it at the backend from step 1 (edit wrangler.toml BACKEND_URL first,
# or override here):
#   [vars] BACKEND_URL = "https://api.<your-subdomain>.workers.dev/v1"

# set secrets (values are hidden, never committed):
npx wrangler secret put BACKEND_KEY      # paste: sk-cloudinit   (or blank if backend has no key)
npx wrangler secret put PROXY_KEY        # optional: any string the site will send, e.g. sk-site

npx wrangler deploy
```

This deploys to `https://cloudinit-assistant.<your-subdomain>.workers.dev`.

## Step 3 — (Recommended) custom domain `assistant.cloudinit.online`

Either uncomment the `[[routes]]` block in `wrangler.toml` (needs
`cloudinit.online` in this Cloudflare account) and re-deploy, or in the
dashboard: Worker → **Settings → Domains & Routes → Add custom domain** →
`assistant.cloudinit.online`.

## Step 4 — Point the site at it

Edit `../chat-config.js` in the repo:

```js
endpoint: 'https://assistant.cloudinit.online/v1',   // or the workers.dev URL + /v1
apiKey:   '',   // set to the PROXY_KEY value ONLY if you set PROXY_KEY in step 2
```

Commit + push; after the site redeploys, the chat title shows `gemini live`
and answers are grounded on cloudinit.online. If the Worker is ever down, the
chat falls back to the built-in knowledge base automatically.

---

## Config reference (`wrangler.toml` [vars] + secrets)

| Name            | Where            | Meaning                                            |
|-----------------|------------------|----------------------------------------------------|
| `BACKEND_URL`   | vars             | gemini-web2api Worker URL, incl. `/v1`             |
| `BACKEND_MODEL` | vars             | Gemini model (e.g. `gemini-3.5-flash-thinking`)    |
| `SITE_ORIGIN`   | vars             | Site whose content grounds answers                 |
| `BACKEND_KEY`   | secret           | Bearer key the backend expects (`''` if none)      |
| `PROXY_KEY`     | secret, optional | Key this Worker requires from the site             |

## Notes on the "only cloudinit.online data" guarantee

- The Worker fetches the site's own pages and injects them as CONTEXT, then
  instructs Gemini to answer **only** from that CONTEXT and refuse otherwise.
- This is prompt-level grounding (retrieval-augmented). It dramatically
  constrains answers but is not a cryptographic guarantee — a determined
  jailbreak could still coax the model off-topic. The system prompt explicitly
  tells the model to ignore instructions embedded in content/user input.
- Page text is cached for 1 hour, so content edits appear within the hour.

# Cloud iNIT assistant — Gemini backend

The site assistant (bottom-right "ask iNIT" launcher) runs in two modes:

1. **Retrieval mode (default, zero-config).** Answers from the built-in
   knowledge base in `chat.js`. Works offline, needs no server, no key.
2. **Gemini live mode.** When `chat-config.js` points at an OpenAI-compatible
   endpoint, the assistant sends the conversation to that endpoint and returns
   the model's answer. If the endpoint is unreachable, errors, or times out, it
   **automatically falls back** to retrieval mode — so the widget never breaks.

The backend is [`gemini-web2api`](https://github.com/sophomoresty/gemini-web2api),
which turns Google Gemini's web interface into a `/v1/chat/completions` API.

---

## 1. Run the backend locally

```bash
git clone https://github.com/sophomoresty/gemini-web2api
cd gemini-web2api
pip install httpx
python gemini_web2api.py
# → server on http://localhost:8081/v1
```

Anonymous access works for the Flash models with no cookie and no key.

## 2. Point the site at it

Edit `chat-config.js`:

```js
window.CLOUDINIT_CHAT_CONFIG = {
  endpoint: 'http://localhost:8081/v1',      // include /v1
  model:    'gemini-3.5-flash-thinking',
  apiKey:   '',                               // '' when backend api_keys is []
  ...
};
```

Reload the page — the chat title now reads `gemini live`.

## 3. Production deployment

The static site is served over HTTPS (Cloudflare). Browsers block a page from
calling `http://localhost`, and **any key in `chat-config.js` is public**. So
for production:

1. Host `gemini-web2api` on a server (Docker below), or use its bundled
   Cloudflare Worker (`cloudflare/` folder in that repo).
2. Put it behind HTTPS on a domain you control, e.g. `https://api.cloudinit.online`.
3. Keep the real API key / Google cookies **on the server only**. If you set
   `api_keys` in the backend, do not paste that key into `chat-config.js`;
   instead run a thin proxy (e.g. a Cloudflare Worker) that injects the key
   server-side and expose the proxy URL as `endpoint`.

### Docker

```bash
cp config.example.json config.json     # set api_keys, port, etc.
docker build -t gemini-web2api .
docker run -d --name gemini-web2api -p 8081:8081 \
  -v ./config.json:/app/config.json gemini-web2api
```

For real Gemini **Pro** routing, mount a Gemini Advanced account cookie file —
see the upstream README (`--cookie-file cookie.txt`).

## Config reference (`chat-config.js`)

| Key            | Meaning                                                        |
|----------------|----------------------------------------------------------------|
| `endpoint`     | OpenAI-compatible base URL incl. `/v1`. Empty ⇒ retrieval only |
| `model`        | Model name from gemini-web2api                                 |
| `apiKey`       | Bearer key; empty when backend auth is off. **Public.**        |
| `temperature`  | Sampling temperature                                           |
| `maxTokens`    | Max output tokens                                              |
| `timeoutMs`    | Request timeout before falling back to the KB                  |
| `historyTurns` | Prior turns of context sent with each request                  |
| `systemPrompt` | Grounds Gemini in the Cloud iNIT product                       |

## Security notes

- Client-side keys are visible to anyone. Use a throwaway key or a proxy.
- The assistant escapes plain-text model output and only allows a small HTML
  subset (`<p> <ul> <ol> <li> <strong> <em> <b> <a> <br>`); code fences are stripped.
- User input is always inserted as text, never as HTML.

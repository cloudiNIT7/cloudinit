/* ==========================================================================
   Cloud iNIT — assistant backend configuration
   --------------------------------------------------------------------------
   This wires the site assistant to a real LLM backend that speaks the
   OpenAI-compatible Chat Completions API. It is designed for the
   gemini-web2api server (https://github.com/sophomoresty/gemini-web2api),
   which turns Google Gemini's web interface into a drop-in
   `/v1/chat/completions` endpoint.

   HOW IT WORKS
   ------------
   • When `endpoint` is set and reachable, the assistant sends the
     conversation to that endpoint and streams back Gemini's answer.
   • When it is empty, unreachable, errors, or times out, the assistant
     silently falls back to the built-in, retrieval-based knowledge base in
     chat.js — so the widget always works, online or off.

   SECURITY NOTE
   -------------
   Anything placed in `apiKey` below ships to the browser and is therefore
   PUBLIC. Only use a throwaway key, or leave gemini-web2api's `api_keys`
   empty (no auth). For production, put a thin proxy (e.g. a Cloudflare
   Worker) in front of the backend and point `endpoint` at the proxy so the
   real key/cookies never reach the client. See README-chatbot.md.
   ========================================================================== */

window.CLOUDINIT_CHAT_CONFIG = {
  /* LIVE — deployed grounded Gemini Worker (see worker/). Grounds answers
     strictly on cloudinit.online content and refuses off-topic questions.
     Deployed on Cloudflare account cloudgcp08@gmail.com.
     Swap to 'https://assistant.cloudinit.online/v1' after mapping the custom
     domain. Leave '' to force the offline retrieval assistant only.     */
  endpoint: 'https://cloudinit-assistant.awscloud1211.workers.dev/v1',

  /* Model name exposed by gemini-web2api. See its README for the list.  */
  model: 'gemini-3.5-flash-thinking',

  /* Bearer key sent to the Worker. Only needed if you set PROXY_KEY as a
     secret on the cloudinit-assistant Worker. The real Gemini backend key is
     kept server-side in the Worker and never appears here. Leave '' if you
     did not set PROXY_KEY.                                              */
  apiKey: '',

  /* Generation + network tuning.                                       */
  temperature: 0.6,
  maxTokens: 900,
  timeoutMs: 30000,

  /* How many prior turns of context to send (keeps prompts small).     */
  historyTurns: 8,

  /* System prompt — grounds Gemini in the product so answers stay on
     topic and don't invent facts.                                      */
  systemPrompt:
    "You are the Cloud iNIT assistant, embedded on cloudinit.online. " +
    "Cloud iNIT is a multi-cloud platform that boots infrastructure through a " +
    "fixed nine-stage sequence (base image, network, identity, secrets, compute, " +
    "data, observability, ingress, traffic), running the same path on AWS, Azure " +
    "and GCP. It offers a free online sandbox and an offline build, an open API, " +
    "AES-256 security, a public status page, and is built by Abinash Kumar. " +
    "Answer concisely and helpfully about the product, cloud infrastructure, and " +
    "the boot-sequence model. Support email is cloudgcp08@gmail.com. Use short " +
    "paragraphs and simple HTML (<p>, <ul>, <li>, <strong>, <a>) — never markdown code fences."
};

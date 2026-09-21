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
  /* Base URL of the OpenAI-compatible server, INCLUDING /v1.
     Local dev example:   'http://localhost:8081/v1'
     Behind a proxy:      'https://api.cloudinit.online/v1'
     Leave '' to force the offline retrieval assistant only.            */
  endpoint: '',

  /* Model name exposed by gemini-web2api. See its README for the list.  */
  model: 'gemini-3.5-flash-thinking',

  /* Bearer key. Leave '' when the backend runs with `api_keys: []`.
     PUBLIC once deployed — use a proxy for real secrets.                */
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

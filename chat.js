/* ==========================================================================
   Cloud iNIT — site assistant
   A self-contained, retrieval-based helper. No backend, no API key, no network
   calls: the knowledge base ships with the page and matching runs locally.

   Why no LLM: this is a static site served from Cloudflare assets. Any API key
   placed in client JS is public, so a hosted model would need a server-side
   proxy. Retrieval answers the questions this site actually gets — stages,
   builds, regions, refunds — deterministically and with a source link, and it
   cannot invent product facts. answerFor() is isolated so a Workers AI
   endpoint can be added later as a fallback for unmatched queries.

   Every answer below is taken from the site's own copy. Nothing is invented.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------------------- helpers */
  const MAIL = 'cloudgcp08@gmail.com';
  const src = (label, href) =>
    `<div class="chat-src">source: <a href="${href}">${label}</a></div>`;

  /* ------------------------------------------------------- knowledge base --
     k  = keywords (matched individually)
     p  = phrases  (matched as substrings, weighted higher)
     a  = answer HTML
     next = follow-up chips offered after the answer                          */
  const KB = [
    {
      id: 'greeting',
      k: 'hi hello hey yo greetings sup namaste hola start',
      p: ['good morning', 'good evening'],
      a: `<p>Boot sequence complete — I'm the Cloud iNIT assistant.</p>
          <p>I answer from this site's own documentation: the nine boot stages, sandbox vs offline builds, regions, install steps, security, and billing. Ask away, or pick a starting point below.</p>`,
      next: ['What is Cloud iNIT?', 'What are the nine stages?', 'Sandbox vs offline build']
    },
    {
      id: 'help',
      k: 'help what can you do capabilities topics options commands assist',
      p: ['what can you do', 'what do you know', 'how can you help', 'who are you', 'are you a bot', 'are you ai'],
      a: `<p>I'm a retrieval assistant — I match your question against this site's documentation and quote it back with a link. I don't call an external model, so I can't speculate beyond what's published here.</p>
          <p>Topics I cover:</p>
          <ul>
            <li>The nine-stage boot sequence, and what happens when a stage fails</li>
            <li>Online sandbox vs offline build, and switching between them</li>
            <li>Download, system requirements, release windows, install problems</li>
            <li>Supported regions and cloud providers</li>
            <li>Security, credentials, and sandbox isolation</li>
            <li>Pricing, refunds, and cancellation</li>
          </ul>
          <p>For anything outside that, email <a href="mailto:${MAIL}">${MAIL}</a>.</p>`,
      next: ['What are the nine stages?', 'Which regions are supported?', 'Is it free?']
    },
    {
      id: 'what-is',
      k: 'what is cloudinit init product about overview explain purpose does mean concept',
      p: ['what is cloud init', 'what is cloudinit', 'what does it do', 'boot sequence first', 'tell me about'],
      a: `<p>Cloud iNIT treats a running platform the way a Linux kernel treats a running machine: as a <strong>sequence of stages that must complete, in order</strong>, before anything is considered "up."</p>
          <p>Most tooling provisions a pile of resources and wires them together afterward. Cloud iNIT inverts that — every environment, from a student sandbox to a multi-region production rollout, comes online through the same nine-stage path, and nothing downstream of a stage starts until that stage reports healthy.</p>
          <p>The payoff is deliberately boring: drift becomes visible because every re-run reproduces the same order, and debugging means reading the log back from the first stage that didn't come up clean.</p>`,
      src: src('Home', 'index.html'),
      next: ['What are the nine stages?', 'Who is it for?', 'Does it replace Terraform?']
    },
    {
      id: 'stages',
      k: 'stages nine 9 stage sequence order list steps boot path walkthrough',
      p: ['nine stages', '9 stages', 'boot sequence', 'what are the stages', 'list the stages', 'stage order'],
      a: `<p>Every environment boots through the same nine stages, in this order:</p>
          <ol class="chat-stages">
            <li><b>01</b> base image</li>
            <li><b>02</b> network</li>
            <li><b>03</b> identity</li>
            <li><b>04</b> secrets</li>
            <li><b>05</b> compute</li>
            <li><b>06</b> data</li>
            <li><b>07</b> observability</li>
            <li><b>08</b> ingress</li>
            <li><b>09</b> traffic</li>
          </ol>
          <p>Each stage declares what it depends on and what it exposes, so the engine won't start stage 5 (compute) until stage 4 (secrets) has written its output. A missing credential therefore fails loudly at stage 4 rather than as a mystery crash three stages later.</p>
          <p>A clean first boot ends with stage 9 reporting healthy.</p>`,
      src: src('Boot stages', 'stages.html'),
      next: ['What if a stage fails?', 'Does it replace Terraform?', 'How do I download it?']
    },
    {
      id: 'stage-fail',
      k: 'fail fails failure error broken halt stops crash halfway partial retry rerun',
      p: ['stage fails', 'stage failed', 'what happens if', 'halfway through', 'goes wrong', 'if it breaks'],
      a: `<p>The sequence <strong>halts at the failed stage</strong> rather than continuing past it.</p>
          <ul>
            <li>Everything that completed successfully stays up</li>
            <li>Nothing downstream of the failure starts</li>
            <li>The boot log shows exactly which stage failed and why</li>
            <li>Re-running only re-attempts from that stage forward</li>
          </ul>
          <p>So debugging is reading the log back to the first stage that didn't come up clean — not guessing across a dozen dashboards.</p>`,
      src: src('Home — FAQ', 'index.html'),
      next: ['What are the nine stages?', 'Is there drift correction?', 'Check live status']
    },
    {
      id: 'sandbox-vs-offline',
      k: 'sandbox offline online build difference compare versus vs which choose better',
      p: ['sandbox vs offline', 'online vs offline', 'difference between', 'which build', 'what build should'],
      a: `<p>Both run the <strong>identical nine-stage sequence</strong>. The difference is whose cloud accounts they run against, and how hard you can push them.</p>
          <p><strong>Online sandbox</strong> — runs against shared accounts we manage across AWS, Azure, and GCP. Rate-limited, and it goes through a short automated review before activating, because capacity is shared with everyone on the same release window. That trade-off is what makes it free. Built for coursework, demos, and trying a stage you haven't used before without touching your own billing.</p>
          <p><strong>Offline build</strong> — installs locally and runs the same sequence against your own cloud credentials. No shared capacity, so no queue and no rate limit; the boot log reflects your actual account limits. This is the one to use once you're past learning the sequence and are building something you intend to keep.</p>`,
      src: src('Download', 'download.html'),
      next: ['Can I switch later?', 'What are the system requirements?', 'Is it free?']
    },
    {
      id: 'switch',
      k: 'switch migrate move convert transfer later export import restart over',
      p: ['switch from', 'switch to offline', 'start over', 'without starting over', 'move to offline'],
      a: `<p>Yes, without starting over. Boot logs and stage configuration export from a sandbox session and import into an offline build, so you don't have to re-walk the sequence from stage 1.</p>
          <p>The only thing that must be redone is the credentials at the <strong>identity stage</strong>, which need re-issuing against your own accounts.</p>`,
      src: src('Download — Install FAQ', 'download.html'),
      next: ['Sandbox vs offline build', 'Is my data isolated?', 'How do I download it?']
    },
    {
      id: 'download',
      k: 'download install get installer setup platform windows mac macos os apple pc',
      p: ['how do i download', 'where do i get', 'how to install', 'get cloud init', 'is there a mac'],
      a: `<p>Windows and macOS builds are both available from the download page — the installer detects your OS automatically, but you can pick either.</p>
          <p>Choose a platform, then a release window. Online sandboxes activate after a short review; offline builds unlock everything immediately.</p>
          <p>macOS support arrived in v2.3.0; before that it was Windows-only.</p>`,
      src: src('Download', 'download.html'),
      next: ['What are the system requirements?', 'What are the release windows?', 'Do I need admin rights?']
    },
    {
      id: 'requirements',
      k: 'requirements specs minimum recommended ram storage disk space network hardware need',
      p: ['system requirements', 'how much ram', 'disk space', 'what do i need', 'will it run'],
      a: `<p>Minimum, then recommended:</p>
          <ul>
            <li><strong>OS</strong> — Windows 10 / macOS 12 · Windows 11 / macOS 14+</li>
            <li><strong>RAM</strong> — 4 GB · 8 GB+</li>
            <li><strong>Storage</strong> — 1.2 GB free · 3 GB free for the offline build</li>
            <li><strong>Network</strong> — required for the online sandbox, not required for the offline build</li>
          </ul>`,
      src: src('Download', 'download.html'),
      next: ['Do I need admin rights?', 'How do I download it?', 'Sandbox vs offline build']
    },
    {
      id: 'release-windows',
      k: 'release window windows batch batches time slot schedule when available morning evening',
      p: ['release window', 'what time', 'which batch', 'batch window'],
      a: `<p>Builds are published per release window. The current windows are <strong>7:30 AM</strong>, <strong>9:00 AM</strong>, <strong>10:30 AM</strong>, and <strong>7:30 PM</strong>.</p>
          <p>Pick a platform on the download page and the available windows appear underneath. Online sandboxes are reviewed within their batch window; offline builds skip the queue entirely.</p>
          <p>Note that sandboxes auto-expire at the end of their release window.</p>`,
      src: src('Download', 'download.html'),
      next: ['How do I download it?', 'Sandbox vs offline build', 'How do I tear it down?']
    },
    {
      id: 'admin',
      k: 'admin administrator root privileges permission rights sudo elevated',
      p: ['admin rights', 'do i need admin', 'need root', 'administrator access'],
      a: `<p>On <strong>Windows, yes</strong> — the installer registers a local service that runs the boot engine.</p>
          <p>On <strong>macOS, no</strong> — a standard user account is enough, and no root privileges are required.</p>`,
      src: src('Download — Install FAQ', 'download.html'),
      next: ['What if the installer fails?', 'How do I uninstall?', 'What are the system requirements?']
    },
    {
      id: 'installer-fail',
      k: 'installer fails failed stuck partway interrupted incomplete log troubleshoot',
      p: ['installer fails', 'installer failed', 'install failed', 'stuck at', 'partway through'],
      a: `<p>Re-run the installer — it resumes from the last completed step rather than starting over.</p>
          <p>If a step keeps failing, check the installer log written next to the installer. It will name the missing prerequisite, which is usually <strong>available disk space</strong> or a <strong>blocked network port</strong>.</p>`,
      src: src('Download — Install FAQ', 'download.html'),
      next: ['What are the system requirements?', 'Do I need admin rights?', 'Contact support']
    },
    {
      id: 'uninstall',
      k: 'uninstall remove delete cleanly teardown removal',
      p: ['how do i uninstall', 'uninstall cleanly', 'remove it'],
      a: `<p>Run the uninstaller rather than deleting the app folder by hand — running it directly is what triggers teardown.</p>
          <p>Uninstalling tears down any active sandboxes first, rotates or revokes the credentials the identity stage issued, then removes the local install.</p>`,
      src: src('Download — Install FAQ', 'download.html'),
      next: ['How do I tear it down?', 'Is my data isolated?', 'How do I download it?']
    },
    {
      id: 'teardown',
      k: 'teardown expire expiry destroy stop shutdown cleanup finished done rotate',
      p: ['tear down', 'auto expire', 'when done', 'clean up after'],
      a: `<p>Sandboxes <strong>auto-expire at the end of their release window</strong> — nothing to do.</p>
          <p>Offline builds tear down on command, rotating any credentials the identity stage generated as they go.</p>`,
      src: src('Download', 'download.html'),
      next: ['Is my data isolated?', 'What are the release windows?', 'How do I uninstall?']
    },
    {
      id: 'regions',
      k: 'regions region providers provider aws azure gcp google amazon multicloud supported india',
      p: ['which regions', 'what regions', 'supported providers', 'us-east-1', 'ap-south-1', 'eastus2', 'us-central1', 'multi cloud'],
      a: `<p>Fully supported across all nine stages:</p>
          <ul>
            <li><strong>AWS</strong> us-east-1</li>
            <li><strong>Azure</strong> eastus2</li>
            <li><strong>GCP</strong> us-central1</li>
          </ul>
          <p><strong>AWS ap-south-1</strong> is live for the compute, storage, and networking stages, with the remaining stages rolling out. It was added in v3.0.0.</p>
          <p>All four regions currently report operational — the status page carries the live view.</p>`,
      src: src('System status', 'status.html'),
      next: ['Check live status', 'Do I need to know all three clouds?', 'What is the uptime?']
    },
    {
      id: 'status',
      k: 'status uptime sla availability latency response incident outage downtime health live',
      p: ['live status', 'is it down', 'what is the uptime', 'response time', 'incident log'],
      a: `<p>The status page is public — no support ticket needed. It shows region health, a 60-day uptime history, and the full incident log, read from the same source as the platform.</p>
          <ul>
            <li><strong>99.9%</strong> uptime SLA</li>
            <li><strong>99.94%</strong> average over the trailing 60 days</li>
            <li><strong>&lt;5ms</strong> response time</li>
            <li><strong>AES-256</strong> encryption</li>
          </ul>`,
      src: src('System status', 'status.html'),
      next: ['Which regions are supported?', 'How is my data secured?', 'What is Cloud iNIT?']
    },
    {
      id: 'security',
      k: 'security secure encryption encrypted aes credentials secrets safe protection hardening auth audit',
      p: ['how secure', 'is it safe', 'aes 256', 'my credentials', 'encryption at rest'],
      a: `<p>Strong encryption, layered authentication, and audited access sit under every request — by default, not as an upgrade.</p>
          <ul>
            <li><strong>AES-256</strong> encryption, including at rest</li>
            <li>Credentials are issued, rotated, and revoked through the Cloud iNIT Database, with erasure on request</li>
            <li>Offline builds store cloud credentials in an <strong>OS-native secret store</strong> (since v2.4.0), not a local config file</li>
            <li>Offline build credentials stay local and are never sent to us</li>
          </ul>`,
      src: src('Boot stages', 'stages.html'),
      next: ['Is my data isolated?', 'Privacy policy', 'What is the uptime?']
    },
    {
      id: 'isolation',
      k: 'isolated isolation shared between sandboxes leak tenant separate cross account privacy data',
      p: ['data shared', 'credentials shared', 'is my data isolated', 'between sandboxes', 'cross account'],
      a: `<p>No — nothing is shared between sandboxes.</p>
          <ul>
            <li>Each sandbox gets its <strong>own isolated credential set</strong>, generated at the identity stage</li>
            <li>Credentials are rotated on teardown</li>
            <li>Secrets never persist beyond the sandbox's lifetime</li>
            <li>Cross-account access is <strong>off by default</strong></li>
          </ul>`,
      src: src('Home — FAQ', 'index.html'),
      next: ['How is my data secured?', 'Privacy policy', 'How do I tear it down?']
    },
    {
      id: 'terraform',
      k: 'terraform pulumi cloudformation iac replace alternative competitor infrastructure code ansible',
      p: ['replace terraform', 'instead of terraform', 'does it replace', 'vs terraform', 'work with terraform'],
      a: `<p>No — it sits <strong>on top of them</strong>. The boot sequence engine calls your existing IaC modules as part of each stage; it doesn't reimplement provisioning.</p>
          <p>If you already have Terraform for the compute stage, Cloud iNIT runs that module at the right point in the sequence and waits for it to report healthy before moving on.</p>`,
      src: src('Home — FAQ', 'index.html'),
      next: ['What are the nine stages?', 'What is Cloud iNIT?', 'Is there an API?']
    },
    {
      id: 'learn-clouds',
      k: 'learn know all three clouds beginner student curriculum course new experience required',
      p: ['know all three', 'do i need to know', 'am i a beginner', 'never used aws', 'learning curve'],
      a: `<p>No. The nine stages are the same regardless of provider, so most people learn the sequence on whichever provider their course or job uses first, then pick up the other two faster because the mental model already transfers.</p>
          <p>The console normalizes provider-specific plumbing — you learn the sequence once and it maps onto whichever provider a project actually uses.</p>`,
      src: src('Home — FAQ', 'index.html'),
      next: ['Who is it for?', 'What are the nine stages?', 'Is it free?']
    },
    {
      id: 'audience',
      k: 'who for audience students beginners teams solo builders career switchers use case suitable',
      p: ['who is it for', 'who should use', 'is it for students', 'for teams'],
      a: `<p>Two groups, explicitly:</p>
          <p><strong>Students and career-switchers</strong> — working through an AWS, Azure, or GCP curriculum. The sandbox behaves like production rather than a cut-down teaching stand-in: the same IAM, networking, and observability stages you'd hit on the job, without a cloud bill to babysit.</p>
          <p><strong>Solo builders and small teams</strong> — without a dedicated platform engineer. A fixed boot sequence means the same nine stages run whether it's one service or twelve, so the platform doesn't get more fragile as it grows.</p>`,
      src: src('Home', 'index.html'),
      next: ['Is it free?', 'Sandbox vs offline build', 'Do I need to know all three clouds?']
    },
    {
      id: 'pricing',
      k: 'price pricing cost free paid plan subscription money charge billing tier trial expensive',
      p: ['is it free', 'how much', 'what does it cost', 'do i have to pay', 'paid plan', 'pricing'],
      a: `<p>The core test sandbox, the documentation, the boot-stage walkthrough, and the current open API are <strong>free</strong>.</p>
          <p>There is no paid tier today. If one is introduced — extended sandbox limits, production support, or dedicated capacity are the examples given — the pricing and billing cycle will be shown at checkout.</p>
          <p>The online sandbox being rate-limited and review-gated is precisely the trade-off that keeps it free.</p>`,
      src: src('Refund policy', 'refund.html'),
      next: ['What is the refund policy?', 'Sandbox vs offline build', 'Who is it for?']
    },
    {
      id: 'refund',
      k: 'refund refunds money back reimburse return chargeback dispute',
      p: ['refund policy', 'money back', 'get a refund', 'how do i request a refund'],
      a: `<p>For any paid subscription, you can request a <strong>full refund within 14 calendar days</strong> of the initial charge, provided the plan hasn't been used beyond reasonable evaluation. After 14 days charges are non-refundable, except where required by law.</p>
          <p>Renewal charges after the first billing cycle are non-refundable, though you can cancel any time to stop future renewals.</p>
          <p>To request one: email <a href="mailto:${MAIL}">${MAIL}</a> with the subject line "Refund request," the account email, and the approximate charge date. Response target is 3 business days; approved refunds reach the original payment method in 5–10 business days.</p>
          <p>Since nothing is currently charged for, there is nothing to refund on the free tier.</p>`,
      src: src('Refund policy', 'refund.html'),
      next: ['How do I cancel?', 'Is it free?', 'Contact support']
    },
    {
      id: 'cancel',
      k: 'cancel cancellation unsubscribe stop renewal terminate quit account close',
      p: ['how do i cancel', 'stop renewal', 'cancel my plan'],
      a: `<p>Cancel any time from your account settings, or by emailing us. Cancelling stops future renewals.</p>
          <p>It doesn't automatically trigger a refund for the current period unless you're still inside the 14-day window — and you keep access to paid features through the end of the period already paid for.</p>`,
      src: src('Refund policy', 'refund.html'),
      next: ['What is the refund policy?', 'Contact support', 'Is it free?']
    },
    {
      id: 'api',
      k: 'api integration integrate github repo sdk documentation docs developer endpoint open',
      p: ['is there an api', 'api access', 'open api', 'github repo', 'developer docs'],
      a: `<p>Yes — every internal service is reachable through one open, documented API, so you can build, integrate, and extend without touching the core. The API surface comes up at stage 6 of the boot sequence.</p>
          <p>Code and docs live on <a href="https://github.com/CloudTechDevOps" target="_blank" rel="noopener">GitHub (CloudTechDevOps)</a>. There's also a live sandbox at <a href="https://test.cloudinit.online" target="_blank" rel="noopener">test.cloudinit.online</a>.</p>
          <p>Since v3.0.0 the boot log also exports to JSON for CI pipelines.</p>`,
      next: ['What is in the changelog?', 'What are the nine stages?', 'Contact support']
    },
    {
      id: 'drift',
      k: 'drift reconciler reconcile correction detect automatic self healing consistency ai managed',
      p: ['drift correction', 'drift detection', 'self healing', 'ai managed'],
      a: `<p>A background reconciler re-walks the boot sequence on a schedule — so this is drift <strong>correction</strong>, not just detection.</p>
          <p>If stage 6 (data) has quietly diverged from what stage 4 last wrote to secrets, it's flagged and, where policy allows, corrected automatically rather than left for someone to notice during an incident.</p>
          <p>A network of AI-managed services also watches routine tasks, validates changes, and re-routes around failures.</p>`,
      src: src('Home', 'index.html'),
      next: ['What if a stage fails?', 'What is in the changelog?', 'Check live status']
    },
    {
      id: 'changelog',
      k: 'changelog version versions release notes update updates new latest v3 history',
      p: ['what version', 'release notes', 'what is new', 'changelog', 'latest version'],
      a: `<p>Current release is <strong>v3.0.0</strong>:</p>
          <ul>
            <li>Nine-stage sequence with AI-managed drift correction</li>
            <li>Reconciler auto-corrects drift between the secrets and data stages where policy allows</li>
            <li>ap-south-1 added for compute, storage, and networking stages</li>
            <li>Boot log export to JSON for CI pipelines</li>
          </ul>
          <p><strong>v2.4.0</strong> — offline builds moved cloud credentials into an OS-native secret store; identity stage cold-boot time cut by about a third.</p>
          <p><strong>v2.3.0</strong> — native macOS build (previously Windows-only); sandbox activation review shortened from 24h.</p>`,
      src: src('Download — release notes', 'download.html'),
      next: ['Which regions are supported?', 'Is there drift correction?', 'How do I download it?']
    },
    {
      id: 'contact',
      k: 'contact support email help human reach team talk speak ticket',
      p: ['contact support', 'talk to a human', 'email address', 'get in touch', 'who do i contact'],
      a: `<p>Email <a href="mailto:${MAIL}">${MAIL}</a> — that's the address used for support, refund requests, and billing questions alike.</p>
          <p>For billing specifically, it's worth emailing before filing a bank dispute: chargebacks raised without contacting us first may suspend sandbox and API access while investigated.</p>`,
      src: src('Refund policy', 'refund.html'),
      next: ['What is the refund policy?', 'Is there an API?', 'Check live status']
    },
    {
      id: 'author',
      k: 'who built made developer author creator behind owner abinash company',
      p: ['who built', 'who made', 'who created', 'who is behind', 'the developer'],
      a: `<p>Cloud iNIT is built and maintained by <strong>Abinash Kumar</strong>.</p>
          <p>You'll find him on <a href="https://github.com/abinashkumar19" target="_blank" rel="noopener">GitHub</a> and <a href="https://x.com/AbinashKumar192" target="_blank" rel="noopener">X</a>, with project code under <a href="https://github.com/CloudTechDevOps" target="_blank" rel="noopener">CloudTechDevOps</a>.</p>`,
      next: ['Is there an API?', 'What is Cloud iNIT?', 'Contact support']
    },
    {
      id: 'legal',
      k: 'privacy policy terms service cookies legal gdpr data retention compliance',
      p: ['privacy policy', 'terms of service', 'cookie policy', 'my data rights'],
      a: `<p>All four policies are published in full:</p>
          <ul>
            <li><a href="privacy.html">Privacy policy</a></li>
            <li><a href="terms.html">Terms of service</a></li>
            <li><a href="cookies.html">Cookie policy</a></li>
            <li><a href="refund.html">Refund &amp; cancellation policy</a></li>
          </ul>
          <p>On the platform side: credentials are issued, rotated, and revoked with encryption at rest and <strong>erasure on request</strong>.</p>`,
      next: ['Is my data isolated?', 'How is my data secured?', 'Contact support']
    }
  ];

  /* --------------------------------------------------------- normalisation */
  const SYN = {
    price: 'pricing cost', cost: 'pricing price', costs: 'pricing price',
    pricing: 'price cost', money: 'pricing cost', cheap: 'pricing free',
    setup: 'install', installing: 'install', installation: 'install',
    docs: 'documentation api', doc: 'documentation',
    aws: 'amazon regions provider', azure: 'microsoft regions provider',
    gcp: 'google regions provider',
    region: 'regions', provider: 'providers',
    creds: 'credentials', cred: 'credentials',
    secure: 'security', safety: 'security', safe: 'security',
    down: 'status outage', broken: 'fail failure',
    cancelling: 'cancel', canceling: 'cancel',
    refunded: 'refund', reimbursement: 'refund',
    mac: 'macos apple', osx: 'macos', windows: 'win pc',
    pc: 'windows', laptop: 'requirements',
    beginner: 'student learn', newbie: 'student learn',
    tf: 'terraform', iac: 'terraform',
    sla: 'uptime status', latency: 'response status',
    bot: 'help', chatbot: 'help', assistant: 'help'
  };

  const STOP = new Set(('a an and are as at be but by can could do does for from get got has have how i if in ' +
    'into is it its me my of on or our so than that the their them then there these they this to too us was ' +
    'we were what when where which who why will with would you your about tell me please just also').split(' '));

  function norm(s) {
    return String(s).toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(s) {
    const out = [];
    norm(s).split(' ').forEach(w => {
      if (!w || w.length < 2 || STOP.has(w)) return;
      out.push(w);
      // crude de-pluralisation so "stages" matches "stage"
      if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) out.push(w.slice(0, -1));
      if (SYN[w]) SYN[w].split(' ').forEach(x => out.push(x));
    });
    return out;
  }

  // pre-index the knowledge base once
  KB.forEach(e => {
    e._k = new Set(tokens(e.k));
    e._p = (e.p || []).map(norm);
  });

  /* ------------------------------------------------------------- retrieval */
  /* Short greetings are mostly stopwords, so they never survive tokenising.
     Match them up front rather than distorting the keyword weights. */
  const GREET_RE = /^(hi+|hey+|hello+|yo|sup|hola|namaste|greetings|good\s+(morning|afternoon|evening|day))\b/;

  function score(query) {
    const q = norm(query);
    const uniq = [...new Set(tokens(query))];

    return KB.map(e => {
      let raw = 0, phrases = 0;
      uniq.forEach(t => { if (e._k.has(t)) raw += 1; });
      // phrase hits are far stronger evidence of intent than loose words, and
      // must be counted even when the query is entirely stopwords
      e._p.forEach(p => { if (p && q.includes(p)) { phrases += 1; raw += 4; } });
      // normalise so entries with big keyword lists aren't unfairly favoured
      return { e, raw, phrases, s: raw / Math.sqrt(Math.max(e._k.size, 1)) };
    }).filter(r => r.raw > 0).sort((a, b) => b.s - a.s);
  }

  const FALLBACK_CHIPS = ['What are the nine stages?', 'Sandbox vs offline build', 'Is it free?', 'Contact support'];

  /* Single seam for answering. A Workers AI call could slot in here as a
     fallback when confidence is low, without touching any UI code. */
  function answerFor(query) {
    const q = norm(query);

    if (GREET_RE.test(q) && q.split(' ').length <= 4) {
      const g = KB.find(x => x.id === 'greeting');
      return { html: g.a, next: g.next, id: g.id };
    }

    const ranked = score(query);
    const best = ranked[0];

    /* Confidence gate. A one-word query ("refund") only has one token to give,
       so requiring two matches would reject it; longer queries must clear two
       to avoid a single incidental word deciding the intent. A phrase hit is
       decisive on its own. */
    const tokenCount = new Set(tokens(query)).size;
    const need = tokenCount === 0 ? Infinity : Math.min(2, tokenCount);
    const confident = best && (best.phrases > 0 || best.raw >= need);

    if (!confident) {
      const alts = ranked.slice(0, 3);
      return {
        html: `<p>I don't have a documented answer for that, and I'd rather say so than guess.</p>
               <p>I can only speak to what's published on this site — the boot stages, builds, regions, install, security, and billing. For anything else, email <a href="mailto:${MAIL}">${MAIL}</a>.</p>`,
        next: alts.length
          ? alts.map(r => firstChip(r.e)).filter(Boolean).slice(0, 3)
          : FALLBACK_CHIPS.slice(0, 3),
        id: 'fallback'
      };
    }

    return { html: best.e.a + (best.e.src || ''), next: best.e.next || [], id: best.e.id };
  }

  function firstChip(entry) {
    const map = {
      stages: 'What are the nine stages?', pricing: 'Is it free?',
      download: 'How do I download it?', regions: 'Which regions are supported?',
      status: 'Check live status', security: 'How is my data secured?',
      refund: 'What is the refund policy?', contact: 'Contact support',
      'sandbox-vs-offline': 'Sandbox vs offline build', 'what-is': 'What is Cloud iNIT?'
    };
    return map[entry.id] || null;
  }

  /* ------------------------------------------------------------------- UI */
  const STORE = 'cloudinit-chat-v1';
  let panel, log, chips, input, sendBtn, fab, lastFocus = null, busy = false;

  function build() {
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'chat-fab';
    fab.id = 'chatFab';
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'chatPanel');
    fab.innerHTML = '<span class="chat-fab__caret" aria-hidden="true">&gt;</span>' +
      '<span>ask iNIT</span><span class="chat-fab__cursor" aria-hidden="true"></span>' +
      '<span class="chat-fab__dot" aria-hidden="true"></span>';
    fab.setAttribute('aria-label', 'Open the Cloud iNIT assistant');

    panel = document.createElement('section');
    panel.className = 'chat-panel';
    panel.id = 'chatPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Cloud iNIT assistant');
    panel.innerHTML = `
      <div class="chat-bar">
        <span class="chat-dot chat-dot--r" aria-hidden="true"></span>
        <span class="chat-dot chat-dot--y" aria-hidden="true"></span>
        <span class="chat-dot chat-dot--g" aria-hidden="true"></span>
        <span class="chat-title">~/cloudinit/assistant — retrieval mode</span>
        <button type="button" class="chat-x" id="chatClose" aria-label="Close assistant">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
        </button>
      </div>
      <div class="chat-log" id="chatLog" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <div class="chat-chips" id="chatChips"></div>
      <form class="chat-form" id="chatForm" autocomplete="off">
        <span class="chat-prompt" aria-hidden="true">&gt;</span>
        <label class="chat-sr" for="chatInput">Ask about Cloud iNIT</label>
        <input class="chat-input" id="chatInput" type="text" placeholder="ask about stages, builds, regions…"
               maxlength="300" autocomplete="off"/>
        <button class="chat-send" id="chatSend" type="submit" aria-label="Send question">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m0 0l-6-6m6 6l-6 6"/></svg>
        </button>
      </form>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    log = panel.querySelector('#chatLog');
    chips = panel.querySelector('#chatChips');
    input = panel.querySelector('#chatInput');
    sendBtn = panel.querySelector('#chatSend');
    panel.classList.add('ready');

    fab.addEventListener('click', open);
    panel.querySelector('#chatClose').addEventListener('click', close);
    panel.querySelector('#chatForm').addEventListener('submit', e => {
      e.preventDefault();
      submit(input.value);
    });
    chips.addEventListener('click', e => {
      const c = e.target.closest('.chat-chip');
      if (c) submit(c.textContent);
    });
    document.addEventListener('keydown', onKey);

    restore();
  }

  /* ---- rendering ---- */
  function addMsg(html, who, asText) {
    const d = document.createElement('div');
    d.className = 'chat-msg chat-msg--' + who;
    // user input is never trusted as markup
    if (asText) d.textContent = html; else d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function setChips(items) {
    chips.innerHTML = '';
    (items || []).forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chat-chip';
      b.textContent = t;
      chips.appendChild(b);
    });
  }

  function typing(on) {
    let t = log.querySelector('.chat-typing');
    if (on) {
      if (t) return;
      t = document.createElement('div');
      t.className = 'chat-typing';
      t.setAttribute('aria-label', 'Assistant is typing');
      t.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(t);
      log.scrollTop = log.scrollHeight;
    } else if (t) t.remove();
  }

  /* ---- conversation ---- */
  function submit(text) {
    const q = String(text || '').trim();
    if (!q || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    addMsg(q, 'user', true);
    setChips([]);
    typing(true);

    const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
    setTimeout(() => {
      typing(false);
      const res = answerFor(q);
      addMsg(res.html, 'bot');
      setChips(res.next);
      busy = false;
      sendBtn.disabled = false;
      save();
      input.focus();
    }, reduced ? 60 : 420);
  }

  function greet() {
    const e = KB.find(x => x.id === 'greeting');
    addMsg(e.a, 'bot');
    setChips(e.next);
  }

  /* ---- transcript persistence (per tab) ---- */
  function save() {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({
        html: log.innerHTML,
        chips: [...chips.querySelectorAll('.chat-chip')].map(c => c.textContent)
      }));
    } catch (e) { /* private mode / quota — transcript is disposable */ }
  }

  function restore() {
    let data = null;
    try { data = JSON.parse(sessionStorage.getItem(STORE) || 'null'); } catch (e) {}
    if (data && data.html) {
      log.innerHTML = data.html;
      typing(false);
      setChips(data.chips);
      log.scrollTop = log.scrollHeight;
    } else {
      greet();
      // gentle first-visit nudge, once per tab
      try {
        if (!sessionStorage.getItem(STORE + '-seen')) {
          setTimeout(() => fab.classList.add('has-nudge'), 3200);
        }
      } catch (e) {}
    }
  }

  /* ---- open / close + focus management ---- */
  function open() {
    lastFocus = document.activeElement;
    panel.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    fab.classList.remove('has-nudge');
    try { sessionStorage.setItem(STORE + '-seen', '1'); } catch (e) {}
    setTimeout(() => input.focus(), 120);
  }

  function close() {
    panel.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus(); else fab.focus();
  }

  const isOpen = () => panel.classList.contains('open');

  function onKey(e) {
    // Cmd/Ctrl+K toggles, matching the terminal theme
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      isOpen() ? close() : open();
      return;
    }
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    // keep Tab inside the panel while it's open
    if (e.key === 'Tab') {
      const f = [...panel.querySelectorAll('button,input,a[href]')]
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* ------------------------------------------------------------------ boot */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else build();

  // exposed for tests and for wiring an "ask the assistant" link anywhere
  window.CloudChat = { open, close, ask: submit, answerFor, KB };
})();

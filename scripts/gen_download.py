#!/usr/bin/env python3
"""
Cloud iNIT — download page generator

Emits the three-step download tree into download/:

    download.html                          batch selector (4 release windows)
      download/<batch>.html                online or offline
        download/<batch>-<mode>.html       Windows or macOS
          download/<batch>-<mode>-<os>.html  final page with the release link

28 generated pages. They are committed to the repo like any other file — this
script exists so the set stays consistent, not as a build step. Re-run it after
editing any template or the RELEASES map, then commit the output.

    python3 scripts/gen_download.py

Nav and footer are extracted from why.html so generated pages cannot drift from
the rest of the site. Relative links are rewritten with a ../ prefix because
generated pages live one directory down.

RELEASE TAGS ARE INTENTIONALLY IRREGULAR. The original inline implementation in
script.js built them by string concatenation and the naming was never
normalised: macOS AM builds carry no suffix, macOS 7:30 PM uses 'mac' but its
offline build puts 'mac' before 'offline'. Every tag below is transcribed from
the previous behaviour so no download link changes. Do not "tidy" them without
confirming the tags exist on GitHub.
"""

import os
import re
import html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'download')
BASE = 'https://github.com/CloudTechDevOps/CloudTechDevOps/releases/tag/'

BATCHES = [
    {'id': '730',   'label': '7:30 AM',  'num': '01'},
    {'id': '900',   'label': '9:00 AM',  'num': '02'},
    {'id': '1030',  'label': '10:30 AM', 'num': '03'},
    {'id': '730pm', 'label': '7:30 PM',  'num': '04'},
]

MODES = [
    {'id': 'online',  'label': 'Online sandbox'},
    {'id': 'offline', 'label': 'Offline build'},
]

OSES = [
    {'id': 'windows', 'label': 'Windows', 'short': 'win64'},
    {'id': 'macos',   'label': 'macOS',   'short': 'macos'},
]

# (batch, mode, os) -> release tag, transcribed from the previous script.js logic
RELEASES = {
    ('730',   'online',  'windows'): '730onlinepc',
    ('730',   'offline', 'windows'): '730offlinepc',
    ('730',   'online',  'macos'):   '730online',
    ('730',   'offline', 'macos'):   '730offline',
    ('900',   'online',  'windows'): '900onlinepc',
    ('900',   'offline', 'windows'): '900offlinepc',
    ('900',   'online',  'macos'):   '900online',
    ('900',   'offline', 'macos'):   '900offline',
    ('1030',  'online',  'windows'): '1030onlinepc',
    ('1030',  'offline', 'windows'): '1030offlinepc',
    ('1030',  'online',  'macos'):   '1030online',
    ('1030',  'offline', 'macos'):   '1030offline',
    ('730pm', 'online',  'windows'): '730pmonline',
    ('730pm', 'offline', 'windows'): '730pmoffline',
    ('730pm', 'online',  'macos'):   '730pmonlinemac',
    ('730pm', 'offline', 'macos'):   '730pmmacoffline',
}

MODE_COPY = {
    'online': {
        'tag': 'SHARED CAPACITY · REVIEWED',
        'blurb': 'Runs the full nine-stage sequence against shared accounts we manage across AWS, Azure, and GCP. Rate-limited, and it goes through a short automated review before activating, because capacity is shared with everyone else on the same release window. That trade-off is what keeps it free.',
        'best': 'Coursework, demos, and trying a stage you have not used before without touching your own billing.',
        'notes': [
            'Activates after a short automated review within this release window',
            'Rate-limited, since capacity is shared',
            'Needs no cloud credentials of your own',
            'Auto-expires at the end of the release window',
        ],
    },
    'offline': {
        'tag': 'YOUR ACCOUNTS · NO QUEUE',
        'blurb': 'Installs locally and runs the same nine-stage sequence against your own cloud credentials. No shared capacity, so no queue and no rate limit — the boot log reflects your actual account limits rather than ours.',
        'best': 'Real projects and coursework you intend to keep iterating on, once you are past learning the sequence.',
        'notes': [
            'Unlocks immediately — no review queue',
            'No rate limits; your account limits apply instead',
            'Asks for cloud credentials on first launch; these stay local and are never sent to us',
            'Credentials are held in an OS-native secret store (since v2.4.0)',
        ],
    },
}

OS_COPY = {
    'windows': {
        'req': [('OS', 'Windows 10', 'Windows 11'),
                ('RAM', '4 GB', '8 GB+'),
                ('Storage', '1.2 GB free', '3 GB free (offline build)')],
        'admin': 'Administrator rights are required — the installer registers a local service that runs the boot engine.',
    },
    'macos': {
        'req': [('OS', 'macOS 12', 'macOS 14+'),
                ('RAM', '4 GB', '8 GB+'),
                ('Storage', '1.2 GB free', '3 GB free (offline build)')],
        'admin': 'A standard user account is enough — no root privileges are required.',
    },
}


# --------------------------------------------------------------------- chrome
def extract_chrome():
    """Pull the shared nav and footer out of why.html so generated pages match."""
    src = open(os.path.join(ROOT, 'why.html'), encoding='utf-8').read()
    nav = re.search(r'(<nav>.*?</nav>\s*<div class="nav-scrim".*?</div>)', src, re.S).group(1)
    foot = re.search(r'(<footer>.*?</footer>)', src, re.S).group(1)
    return depth_fix(nav), depth_fix(foot)


def depth_fix(frag):
    """Rewrite bare page links for a file one directory below the site root."""
    frag = re.sub(r'(href|src)="(?!https?:|/|#|mailto:|\.\./)([^"]+)"', r'\1="../\2"', frag)
    return frag


NAV, FOOTER = extract_chrome()

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="description" content="{desc}"/>
<link rel="icon" type="image/png" href="https://i.ibb.co/C5XqXXx5/d2a09cd4-f07d-4034-99ad-51292342123d.png" />
<title>{title}</title>
<link rel="canonical" href="https://cloudinit.online/download/{slug}.html"/>
<meta name="robots" content="{robots}"/>
<meta name="author" content="Abinash Kumar"/>
<meta name="theme-color" content="#faf3e3"/>
<link rel="manifest" href="../site.webmanifest"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Cloud iNIT"/>
<meta property="og:title" content="{title}"/>
<meta property="og:description" content="{desc}"/>
<meta property="og:url" content="https://cloudinit.online/download/{slug}.html"/>
<meta property="og:image" content="https://i.ibb.co/C5XqXXx5/d2a09cd4-f07d-4034-99ad-51292342123d.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../style.css"/>
<link rel="stylesheet" href="../buttons.css"/>
<link rel="stylesheet" href="../chat.css"/>
<link rel="stylesheet" href="../dl-flow.css"/>
</head>
<body>

<div class="cursor-glow" id="cursorGlow" aria-hidden="true"></div>
<div id="prog" aria-hidden="true"></div>
<div id="toasts" aria-live="polite"></div>
<div class="site-orbs" aria-hidden="true">
  <span class="site-orb site-orb-a"></span>
  <span class="site-orb site-orb-b"></span>
  <span class="site-orb site-orb-c"></span>
</div>

{nav}
"""

TAIL = """
{footer}

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="../script.js" defer></script>
<script src="../buttons.js" defer></script>
<script src="../chat.js" defer></script>
</body>
</html>
"""


def page(slug, title, desc, body, robots='index,follow'):
    doc = HEAD.format(title=html.escape(title), desc=html.escape(desc), slug=slug,
                      robots=robots, nav=NAV) + body + TAIL.format(footer=FOOTER)
    path = os.path.join(OUT, slug + '.html')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(doc)
    return path


def crumbs(*parts):
    """parts: (label, href|None) — last item renders as the current page."""
    out = ['<div class="breadcrumb"><a href="../index.html">cloudinit</a><span>/</span>'
           '<a href="../download.html">download</a>']
    for label, href in parts:
        out.append('<span>/</span>')
        out.append(f'<a href="{href}">{label}</a>' if href else f'<em>{label}</em>')
    out.append('</div>')
    return ''.join(out)


def step(n, total, label):
    dots = ''.join(
        f'<i class="{"on" if i < n else ""}"></i>' for i in range(total))
    return (f'<div class="dl-step"><span class="dl-step__dots" aria-hidden="true">{dots}</span>'
            f'<span class="dl-step__txt">step {n} of {total} — {label}</span></div>')


# ------------------------------------------------------------------ level 2
def gen_batch(b):
    """Choose online or offline for a given release window."""
    cards = []
    for m in MODES:
        c = MODE_COPY[m['id']]
        notes = ''.join(f'<li>{n}</li>' for n in c['notes'])
        cards.append(f"""
      <a class="dl-opt glass-shine" href="{b['id']}-{m['id']}.html">
        <span class="dl-opt__tag">{c['tag']}</span>
        <h3>{m['label']}</h3>
        <p>{c['blurb']}</p>
        <ul class="dl-opt__list">{notes}</ul>
        <span class="dl-opt__go">Choose {m['label'].lower()} &rarr;</span>
      </a>""")

    body = f"""
<header class="page-head section" style="padding-bottom:26px">
  {crumbs((b['label'], None))}
  <div class="mono-tag mono-tag--ok" style="margin-bottom:18px">RELEASE WINDOW · {b['label']}</div>
  <h1>Sandbox or <em>offline build</em>?</h1>
  <p>Both run the identical nine-stage boot sequence. The difference is whose cloud accounts they run against, and how hard you can push them.</p>
  {step(2, 3, 'pick a build')}
</header>

<section class="section" style="padding-top:0">
  <div class="dl-opt-grid">{''.join(cards)}</div>
  <p class="dl-back"><a href="../download.html">&larr; Back to release windows</a></p>
</section>
"""
    return page(b['id'], f"{b['label']} release — Cloud iNIT",
                f"Choose the online sandbox or the offline build for the {b['label']} Cloud iNIT release window.",
                body)


# ------------------------------------------------------------------ level 3
def gen_mode(b, m):
    """Choose Windows or macOS for a given batch and mode."""
    cards = []
    for o in OSES:
        rows = ''.join(
            f'<tr><td>{k}</td><td>{lo}</td><td>{hi}</td></tr>'
            for k, lo, hi in OS_COPY[o['id']]['req'])
        cards.append(f"""
      <a class="dl-opt glass-shine" href="{b['id']}-{m['id']}-{o['id']}.html">
        <span class="dl-opt__tag">cloudinit · {o['short']}</span>
        <h3>{o['label']}</h3>
        <p>{OS_COPY[o['id']]['admin']}</p>
        <table class="dl-req"><thead><tr><th>Component</th><th>Minimum</th><th>Recommended</th></tr></thead><tbody>{rows}</tbody></table>
        <span class="dl-opt__go">Get the {o['label']} build &rarr;</span>
      </a>""")

    body = f"""
<header class="page-head section" style="padding-bottom:26px">
  {crumbs((b['label'], b['id'] + '.html'), (MODES[0]['label'] if m['id'] == 'online' else MODES[1]['label'], None))}
  <div class="mono-tag mono-tag--ok" style="margin-bottom:18px">{b['label']} · {m['label'].upper()}</div>
  <h1>Which <em>platform</em>?</h1>
  <p>{MODE_COPY[m['id']]['blurb']}</p>
  {step(3, 3, 'pick a platform')}
</header>

<section class="section" style="padding-top:0">
  <div class="dl-opt-grid">{''.join(cards)}</div>
  <p class="dl-back"><a href="{b['id']}.html">&larr; Back to build choice</a></p>
</section>
"""
    return page(f"{b['id']}-{m['id']}", f"{b['label']} {m['label']} — Cloud iNIT",
                f"Pick Windows or macOS for the {b['label']} {m['label'].lower()} of Cloud iNIT.",
                body)


# ------------------------------------------------------------------ level 4
def gen_leaf(b, m, o):
    tag = RELEASES[(b['id'], m['id'], o['id'])]
    url = BASE + tag
    c = MODE_COPY[m['id']]
    rows = ''.join(f'<tr><td>{k}</td><td>{lo}</td><td>{hi}</td></tr>'
                   for k, lo, hi in OS_COPY[o['id']]['req'])
    notes = ''.join(f'<li>{n}</li>' for n in c['notes'])

    net = ('Required — the sandbox runs against our shared cloud accounts.'
           if m['id'] == 'online'
           else 'Not required once installed; the build runs against your own credentials.')

    body = f"""
<header class="page-head section" style="padding-bottom:26px">
  {crumbs((b['label'], b['id'] + '.html'), (m['label'], f"{b['id']}-{m['id']}.html"), (o['label'], None))}
  <div class="mono-tag mono-tag--ok" style="margin-bottom:18px">{b['label']} · {m['label'].upper()} · {o['label'].upper()}</div>
  <h1>Download <em>Cloud iNIT</em></h1>
  <p>{m['label']} for {o['label']}, built for the {b['label']} release window. Release tag <code>{tag}</code>.</p>
</header>

<section class="section" style="padding-top:0">
  <div class="dl-final glass-shine">
    <div class="dl-final__meta">
      <span class="dl-final__row"><b>Release window</b> {b['label']}</span>
      <span class="dl-final__row"><b>Build</b> {m['label']}</span>
      <span class="dl-final__row"><b>Platform</b> {o['label']} <code>{o['short']}</code></span>
      <span class="dl-final__row"><b>Network</b> {net}</span>
    </div>
    <a class="btn btn--primary btn--lg" data-fx="shimmer magnetic ripple glow halo"
       href="{url}" target="_blank" rel="noopener">
      <span class="btn__inner">
        <span class="btn__label">Download from GitHub</span>
        <span class="btn__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 19h16"/></svg></span>
      </span>
    </a>
    <p class="dl-final__note">Opens the tagged release on GitHub in a new tab.</p>
  </div>

  <div class="dl-cols">
    <div>
      <h3>What you are getting</h3>
      <p>{c['blurb']}</p>
      <ul class="dl-opt__list">{notes}</ul>
    </div>
    <div>
      <h3>Before you install</h3>
      <p>{OS_COPY[o['id']]['admin']}</p>
      <table class="dl-req"><thead><tr><th>Component</th><th>Minimum</th><th>Recommended</th></tr></thead><tbody>{rows}</tbody></table>
      <p class="dl-final__note">Re-running the installer resumes from the last completed step. Uninstall with the uninstaller rather than deleting the folder, so sandboxes tear down and credentials rotate.</p>
    </div>
  </div>

  <p class="dl-back">
    <a href="{b['id']}-{m['id']}.html">&larr; Back to platform choice</a>
    <a href="../download.html">Start over</a>
  </p>
</section>
"""
    return page(f"{b['id']}-{m['id']}-{o['id']}",
                f"Download {b['label']} {m['label']} for {o['label']} — Cloud iNIT",
                f"Download the {b['label']} {m['label'].lower()} of Cloud iNIT for {o['label']}.",
                body)


def main():
    os.makedirs(OUT, exist_ok=True)
    made = []
    for b in BATCHES:
        made.append(gen_batch(b))
        for m in MODES:
            made.append(gen_mode(b, m))
            for o in OSES:
                made.append(gen_leaf(b, m, o))
    for p in made:
        print('wrote', os.path.relpath(p, ROOT))
    print(f'\n{len(made)} pages generated')


if __name__ == '__main__':
    main()

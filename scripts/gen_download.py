#!/usr/bin/env python3
"""
Cloud iNIT — download page generator  ·  "install console" redesign

Emits the three-step download tree into download/:

    download.html                          batch selector (4 release windows)
      download/<batch>.html                online or offline
        download/<batch>-<mode>.html       Windows or macOS
          download/<batch>-<mode>-<os>.html  final page with the direct link

28 generated pages. They are committed to the repo like any other file — this
script exists so the set stays consistent, not as a build step. Re-run it after
editing any template or the DOWNLOADS map, then commit the output.

    python3 scripts/gen_download.py

Nav and footer are extracted from why.html so generated pages cannot drift from
the rest of the site. Relative links are rewritten with a ../ prefix because
generated pages live one directory down.

DOWNLOADS now point at the signed-off Google Cloud Storage objects (direct .exe
/ .dmg), not GitHub release tags. FILENAMES AND SIZES ARE TRANSCRIBED FROM THE
BUCKET AS-IS — the naming is irregular (Windows uses "7 am", macOS uses
"730am"; one Windows object has a stray space before ".exe"). Do not "tidy"
any URL without re-checking it returns 200 from the bucket first.
"""

import os
import re
import html
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'download')
BUCKET = 'https://storage.googleapis.com/abinashdatafetch/'

BATCHES = [
    {'id': '730',   'label': '7:30 AM',  'num': '01', 'when': 'morning batch'},
    {'id': '900',   'label': '9:00 AM',  'num': '02', 'when': 'mid-morning batch'},
    {'id': '1030',  'label': '10:30 AM', 'num': '03', 'when': 'late-morning batch'},
    {'id': '730pm', 'label': '7:30 PM',  'num': '04', 'when': 'evening batch'},
]

MODES = [
    {'id': 'online',  'label': 'Online build'},
    {'id': 'offline', 'label': 'Offline build'},
]

OSES = [
    {'id': 'windows', 'label': 'Windows', 'short': 'win64', 'ext': 'EXE'},
    {'id': 'macos',   'label': 'macOS',   'short': 'arm64', 'ext': 'DMG'},
]

# (batch, mode, os) -> (object path inside the bucket, size in bytes)
# Sizes were read from the bucket (content-length) so the page can state the
# download weight without a request at page load.
DOWNLOADS = {
    ('730',   'offline', 'windows'): ('window offline/CloudINIT 7 am offline pc.exe',    77866739),
    ('900',   'offline', 'windows'): ('window offline/CloudINIT 9 am offline pc.exe',    77866729),
    ('1030',  'offline', 'windows'): ('window offline/CloudINIT 10 am offline pc.exe',   77866600),
    ('730pm', 'offline', 'windows'): ('window offline/CloudINIT 7 pm offline.exe',       77866542),
    ('730',   'online',  'windows'): ('window online/CloudINIT 7 am online pc.exe',      77866778),
    ('900',   'online',  'windows'): ('window online/CloudINIT 9 am online pc .exe',     77866651),
    ('1030',  'online',  'windows'): ('window online/CloudINIT 10 am online pc.exe',     77866790),
    ('730pm', 'online',  'windows'): ('window online/CloudINIT 7 pm online pc.exe',      77866561),
    ('730',   'offline', 'macos'):   ('mac offline/cloudinit730amofflinemac.dmg',         4935294),
    ('900',   'offline', 'macos'):   ('mac offline/CloudInit9amofflinemac.dmg',           4936292),
    ('1030',  'offline', 'macos'):   ('mac offline/CloudInit1030offlinemac.dmg',          4935280),
    ('730pm', 'offline', 'macos'):   ('mac offline/CloudInit730pmofflinemac.dmg',         4937579),
    ('730',   'online',  'macos'):   ('mac online/cloudinitonlinemac730am.dmg',           4935290),
    ('900',   'online',  'macos'):   ('mac online/CloudInit9amonlinemac.dmg',             4936285),
    ('1030',  'online',  'macos'):   ('mac online/CloudInit1030onlinemac.dmg',            4935298),
    ('730pm', 'online',  'macos'):   ('mac online/CloudInit730pmonlinemac.dmg',           4937740),
}

MODE_COPY = {
    'online': {
        'tag': 'FREE · BEST IF YOU ARE LEARNING',
        'blurb': 'Runs the full nine-stage sequence against shared accounts we manage across AWS, Azure, and GCP. Rate-limited, and it goes through a short automated review before activating, because capacity is shared with everyone else on the same release window. That trade-off is what keeps it free.',
        'notes': [
            'Activates after a short automated review within this release window',
            'Rate-limited, since capacity is shared',
            'Needs no cloud credentials of your own',
            'Auto-expires at the end of the release window',
        ],
        'net': 'Required — the online build runs against our shared cloud accounts.',
    },
    'offline': {
        'tag': 'NEEDS YOUR OWN CLOUD ACCOUNT',
        'blurb': 'Installs locally and runs the same nine-stage sequence against your own cloud credentials. No shared capacity, so no queue and no rate limit — the boot log reflects your actual account limits rather than ours.',
        'notes': [
            'Unlocks immediately — no review queue',
            'No rate limits; your account limits apply instead',
            'Asks for cloud credentials on first launch; these stay local and are never sent to us',
            'Credentials are held in an OS-native secret store (since v2.4.0)',
        ],
        'net': 'Not required once installed; the build runs against your own credentials.',
    },
}

OS_COPY = {
    'windows': {
        'blurb': 'Windows 10 and Windows 11 only, 64-bit. Administrator rights are required — the installer registers a local service that runs the boot engine.',
        'spec': [('OS', 'Windows 10 or 11 (64-bit) <span>— nothing older</span>'),
                 ('CPU', 'x64 <span>· older desktops and laptops are fine on 10 / 11</span>'),
                 ('RAM', '4 GB minimum <span>· 8 GB recommended</span>'),
                 ('Disk', '1.2 GB free <span>· 3 GB for the offline build</span>'),
                 ('Rights', 'Administrator <span>· registers a local service</span>')],
        'install': [
            'Run the downloaded <b>.exe</b>. SmartScreen may warn on a fresh build — choose <b>More info → Run anyway</b>.',
            'Approve the <b>administrator prompt</b> so the boot-engine service can register.',
            'Launch Cloud iNIT and watch the first boot stream all nine stages.',
            'Uninstall from <b>Settings → Apps</b>, not by deleting the folder, so sandboxes tear down and credentials rotate.',
        ],
    },
    'macos': {
        'blurb': 'Apple silicon MacBooks only (M1 and newer) on a fully updated macOS. A standard user account is enough — no root privileges are required.',
        'spec': [('Chip', 'Apple silicon — M1 / M2 / M3 / M4 <span>— Intel Macs unsupported</span>'),
                 ('OS', 'Latest macOS available for your Mac <span>· keep it updated</span>'),
                 ('RAM', '8 GB unified memory'),
                 ('Disk', '1.2 GB free <span>· 3 GB for the offline build</span>'),
                 ('Rights', 'Standard user <span>· no root needed</span>')],
        'install': [
            'Open the <b>.dmg</b> and drag Cloud iNIT into <b>Applications</b>.',
            'First launch: <b>right-click → Open</b>, then allow it under <b>System Settings → Privacy &amp; Security</b> if Gatekeeper holds it.',
            'Install any pending <b>macOS updates</b> first — the build targets the current release.',
            'Uninstall with the bundled uninstaller so sandboxes tear down and credentials rotate.',
        ],
    },
}

# ------------------------------------------------------------------- icons
I_ARROW = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
           'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13m0 0l-5-5m5 5l-5 5"/></svg>')
I_BACK = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
          'stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H6m0 0l5-5m-5 5l5 5"/></svg>')
I_DL = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" '
        'stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M4 20h16"/></svg>')
I_WARN = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
          'stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9.5 17H2.5L12 3z"/>'
          '<path d="M12 9v5m0 3.2v.1"/></svg>')
# Glyph paths are kept on one line each: splitting a path `d` across Python
# string literals silently eats the separating space and corrupts the curve.
I_WIN = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.6l7.6-1v7.1H3V5.6zm0 12.8l7.6 1v-7H3v6zM11.6 4.4L21 3v8.7h-9.4V4.4zm0 8.3H21V21l-9.4-1.3v-7z"/></svg>'
I_MAC = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.8 3-.8 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.7zM14.2 5.5c.6-.8 1.1-1.8 1-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2-.5 2.6-1.3z"/></svg>'
I_CLOUD = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" '
           'stroke-linejoin="round"><path d="M7 18h10a3.5 3.5 0 000-7 5 5 0 00-9.6-1.4A3.8 3.8 0 007 18z"/></svg>')
I_CHIP = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" '
          'stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2.5"/>'
          '<path d="M10 3v3m4-3v3m-4 12v3m4-3v3M3 10h3m-3 4h3m12-4h3m-3 4h3"/></svg>')
OS_ICON = {'windows': I_WIN, 'macos': I_MAC}
MODE_ICON = {'online': I_CLOUD, 'offline': I_CHIP}


# ------------------------------------------------------------- compat note
def compat_note(scope='both'):
    """The support rules shown before every download decision.

    scope: 'both' | 'windows' | 'macos' — narrows the cards on platform-specific
    pages so a macOS visitor is not reading Windows rules.
    """
    win = """
      <div class="dlx-note__card">
        <h4>""" + I_WIN + """ Windows</h4>
        <ul>
          <li><b>Windows 10 or Windows 11 only</b>, 64-bit. These are the only versions the installer supports.</li>
          <li class="no">Windows 8.1, 8, 7 and anything older will not install, and will not be patched to.</li>
          <li><b>An older laptop is usually fine.</b> Age does not matter — if it runs Windows 10 or 11 with 4&nbsp;GB of RAM, it is supported.</li>
          <li>Keep Windows updated, and allow the installer through SmartScreen and any admin prompt.</li>
        </ul>
      </div>"""
    mac = """
      <div class="dlx-note__card">
        <h4>""" + I_MAC + """ macOS</h4>
        <ul>
          <li><b>MacBook with Apple silicon only</b> — M1, M2, M3, M4 and later chips.</li>
          <li class="no">Intel-based Macs are not supported. There is no Intel build.</li>
          <li><b>macOS must be up to date.</b> Install every pending system update before you run the installer.</li>
          <li>On first launch use right-click → Open, then allow it under Privacy &amp; Security if Gatekeeper holds it.</li>
        </ul>
      </div>"""

    cards = {'both': win + mac, 'windows': win, 'macos': mac}[scope]
    grid = ' style="grid-template-columns:1fr"' if scope != 'both' else ''
    foot = {
        'both': 'Where to check — Windows: Settings → System → About. Mac: Apple menu → About This Mac; '
                'the <b>Chip</b> line must read Apple&nbsp;M-something.',
        'windows': 'Where to check — Settings → System → About. The <b>Edition</b> line must read '
                   'Windows&nbsp;10 or Windows&nbsp;11, and <b>System type</b> must be 64-bit.',
        'macos': 'Where to check — Apple menu → About This Mac. The <b>Chip</b> line must read '
                 'Apple&nbsp;M-something, and Software Update must show no pending updates.',
    }[scope]
    return f"""
  <aside class="dlx-note">
    <div class="dlx-note__hd">{I_WARN} will it run on your computer?</div>
    <p class="dlx-note__lead">There is one build per platform. Check your machine against the rules below — an unsupported computer fails during install, so it is worth thirty seconds now.</p>
    <div class="dlx-note__grid"{grid}>{cards}</div>
    <p class="dlx-note__foot">{foot}</p>
  </aside>"""


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
<meta name="theme-color" content="#15130e"/>
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
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
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
    out = ['<div class="dlx-crumb"><a href="../index.html">cloudinit</a><span>/</span>'
           '<a href="../download.html">download</a>']
    for label, href in parts:
        out.append('<span>/</span>')
        out.append(f'<a href="{href}">{label}</a>' if href else f'<em>{label}</em>')
    out.append('</div>')
    return ''.join(out)


def guide(step, text, note=''):
    """Plain-English "what to do now" line shown above each set of choices."""
    tail = f' <span>{note}</span>' if note else ''
    return f'<p class="dlx-guide"><b>step {step} of 4</b>{text}{tail}</p>'


STEP_LABELS = [('step 1 of 4', 'pick a time'), ('step 2 of 4', 'online or offline'),
               ('step 3 of 4', 'Windows or Mac'), ('step 4 of 4', 'download')]


def rail(current):
    """Segmented step rail. current is 1-based; 4 means the final page."""
    segs = []
    for i, (num, label) in enumerate(STEP_LABELS, start=1):
        cls = 'is-now' if i == current else ('is-done' if i < current else '')
        segs.append(f'<div class="dlx-rail__seg {cls}">{num}<b>{label}</b></div>')
    return f'<div class="dlx-rail">{"".join(segs)}</div>'


def spec(rows):
    items = ''.join(f'<div class="dlx-spec__row"><dt>{k}</dt><dd>{v}</dd></div>' for k, v in rows)
    return f'<dl class="dlx-spec">{items}</dl>'


def flownav(*links):
    """links: (label, href, back?) tuples.

    Deliberately a <div>, not a <nav> — style.css pins the bare `nav` element
    with position:fixed for the site header, which would rip this off the page.
    """
    out = []
    for label, href, back in links:
        ico = I_BACK if back else I_ARROW
        out.append(f'<a href="{href}">{ico}{label}</a>')
    return f'<div class="dlx-flownav">{"".join(out)}</div>'


def size_mb(n):
    return f'{n / (1024 * 1024):.1f} MB'


def url_for(b, m, o):
    path, _ = DOWNLOADS[(b, m, o)]
    return BUCKET + quote(path)


def filename_for(b, m, o):
    """Bucket object name. Not shown on the pages — the installer filename and
    the 'direct from storage' line were removed from the ticket on request —
    but kept here because it is the handle used when auditing the bucket."""
    return DOWNLOADS[(b, m, o)][0].split('/')[-1]


# ------------------------------------------------------------------ level 2
def gen_batch(b):
    """Choose online or offline for a given release window."""
    cards = []
    for m in MODES:
        c = MODE_COPY[m['id']]
        notes = ''.join(f'<li>{n}</li>' for n in c['notes'])
        # dlx-card--<mode> carries the per-build accent (mint / violet) that
        # dl-flow.css reads through --dlx-hot, so the two choices no longer
        # read as the same cyan card twice.
        cards.append(f"""
      <a class="dlx-card dlx-card--{m['id']}" href="{b['id']}-{m['id']}.html">
        <span class="dlx-card__tag">{c['tag']}</span>
        <span class="dlx-card__glyph">{MODE_ICON[m['id']]}</span>
        <h2>{m['label']}</h2>
        <p>{c['blurb']}</p>
        <ul class="dlx-list">{notes}</ul>
        <span class="dlx-card__go">Choose {m['label'].lower()} {I_ARROW}</span>
      </a>""")

    body = f"""
<main class="dlx">
 <div class="dlx-wrap">
  {crumbs((b['label'], None))}
  <header class="dlx-head">
    <span class="dlx-kicker"><i></i>release window · {b['label']}</span>
    <h1>Online or <em>offline</em> build?<span class="dlx-cursor"></span></h1>
    <p>Both run the identical nine-stage boot sequence. The difference is whose cloud accounts they run against, and how hard you can push them.</p>
    {rail(2)}
  </header>
  {guide(2, 'Pick one of the two builds below.',
         'Studying or just trying it out? Choose the online build — it is free and needs no cloud account of your own.')}
  <div class="dlx-pick">{''.join(cards)}</div>
{compat_note('both')}
  {flownav(('Back to release windows', '../download.html', True))}
 </div>
</main>
"""
    return page(b['id'], f"{b['label']} release — Cloud iNIT",
                f"Choose the online build or the offline build for the {b['label']} Cloud iNIT release window.",
                body)


# ------------------------------------------------------------------ level 3
def gen_mode(b, m):
    """Choose Windows or macOS for a given batch and mode."""
    cards = []
    for o in OSES:
        _, size = DOWNLOADS[(b['id'], m['id'], o['id'])]
        cards.append(f"""
      <a class="dlx-card" href="{b['id']}-{m['id']}-{o['id']}.html">
        <span class="dlx-card__tag">cloudinit · {o['short']} · {o['ext']} · {size_mb(size)}</span>
        <span class="dlx-card__glyph">{OS_ICON[o['id']]}</span>
        <h2>{o['label']}</h2>
        <p>{OS_COPY[o['id']]['blurb']}</p>
        {spec(OS_COPY[o['id']]['spec'])}
        <span class="dlx-card__go">Get the {o['label']} build {I_ARROW}</span>
      </a>""")

    body = f"""
<main class="dlx">
 <div class="dlx-wrap">
  {crumbs((b['label'], b['id'] + '.html'), (m['label'], None))}
  <header class="dlx-head">
    <span class="dlx-kicker"><i></i>{b['label']} · {m['label']}</span>
    <h1>Windows or <em>Mac</em>?<span class="dlx-cursor"></span></h1>
    <p>{MODE_COPY[m['id']]['blurb']}</p>
    {rail(3)}
  </header>
  {guide(3, 'Choose the computer you will install on.',
         'Not sure? Check the Windows and macOS rules below before you pick.')}
  <div class="dlx-pick">{''.join(cards)}</div>
{compat_note('both')}
  {flownav((f"Back to build choice", f"{b['id']}.html", True),
           ('Start over', '../download.html', True))}
 </div>
</main>
"""
    return page(f"{b['id']}-{m['id']}", f"{b['label']} {m['label']} — Cloud iNIT",
                f"Pick Windows or macOS for the {b['label']} {m['label'].lower()} of Cloud iNIT.",
                body)


# ------------------------------------------------------------------ level 4
def gen_leaf(b, m, o):
    url = url_for(b['id'], m['id'], o['id'])
    _, size = DOWNLOADS[(b['id'], m['id'], o['id'])]
    c = MODE_COPY[m['id']]
    notes = ''.join(f'<li>{n}</li>' for n in c['notes'])
    steps = ''.join(f'<li>{s}</li>' for s in OS_COPY[o['id']]['install'])

    meta = spec([
        ('Release', b['label'] + f" <span>· {b['when']}</span>"),
        ('Build', m['label']),
        ('Platform', f"{o['label']} <span>· {o['short']}</span>"),
        ('Installer', f"<code>{o['ext']}</code> <span>· {size_mb(size)}</span>"),
        ('Network', c['net']),
    ])

    body = f"""
<main class="dlx">
 <div class="dlx-wrap">
  {crumbs((b['label'], b['id'] + '.html'), (m['label'], f"{b['id']}-{m['id']}.html"), (o['label'], None))}
  <header class="dlx-head">
    <span class="dlx-kicker"><i></i>{b['label']} · {m['label']} · {o['label']}</span>
    <h1>Your build is <em>ready</em><span class="dlx-cursor"></span></h1>
    <p>{m['label']} for {o['label']}, cut for the {b['label']} release window. The button below pulls the installer straight from our storage bucket — no account, no redirect.</p>
    {rail(4)}
  </header>
  {guide(4, 'Click the blue button below to download.',
         'The file is ' + size_mb(size) + ' and saves to your Downloads folder. Installing steps are further down this page.')}

  <section class="dlx-ticket">
    <div class="dlx-ticket__bar">
      <span class="dlx-ticket__dots" aria-hidden="true"><i></i><i></i><i></i></span>
      cloudinit · {b['id']}-{m['id']}-{o['id']} · verified object
    </div>
    <div class="dlx-ticket__body">
      <div class="dlx-ticket__main">
        <div class="dlx-ticket__badges">
          <span class="dlx-badge dlx-badge--gold">{o['ext']} installer</span>
          <span class="dlx-badge">{size_mb(size)}</span>
          <span class="dlx-badge">{o['short']}</span>
          <span class="dlx-badge">{m['label']}</span>
        </div>
        <a class="dlx-dl" href="{url}" rel="noopener">
          <span class="dlx-dl__ico" aria-hidden="true">{I_DL}</span>
          <span>Download for {o['label']}<small>{o['ext']} · {size_mb(size)}</small></span>
        </a>
        <p class="dlx-hint">The download starts as soon as you click. If your browser asks, choose <b>Keep</b> or <b>Allow</b> — the file is served over HTTPS from our own storage.</p>
      </div>
      <div class="dlx-ticket__stub">
        <h3>Build details</h3>
        {meta}
      </div>
    </div>
  </section>

  <div class="dlx-cols">
    <div class="dlx-panel">
      <h3>What you are getting</h3>
      <p>{c['blurb']}</p>
      <ul class="dlx-list">{notes}</ul>
    </div>
    <div class="dlx-panel">
      <h3>Installing on {o['label']}</h3>
      <ol class="dlx-steps">{steps}</ol>
    </div>
  </div>
{compat_note(o['id'])}

  {flownav((f"Back to platform choice", f"{b['id']}-{m['id']}.html", True),
           ('Start over', '../download.html', True),
           ('Live system status', '../status.html', False))}
 </div>
</main>
"""
    return page(f"{b['id']}-{m['id']}-{o['id']}",
                f"Download {b['label']} {m['label']} for {o['label']} — Cloud iNIT",
                f"Download the {b['label']} {m['label'].lower()} of Cloud iNIT for {o['label']}. "
                f"Windows 10/11 or Apple silicon macOS only.",
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

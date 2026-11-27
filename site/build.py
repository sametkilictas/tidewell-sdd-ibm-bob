#!/usr/bin/env python3
"""Build the project website into _site/ (GitHub Pages).

  python3 site/build.py            # needs Python 3.9+ and the `markdown` package (pip install markdown)

Sources: site/src/ (landing assets, media, deck PDF), site/content/article.md, sdd/docs/LABS.md and the
self-contained Atlas sdd/docs/atlas.html. Counts on the landing page are read from the kit itself.
SITE_URL (env) sets absolute URLs for link previews and the sitemap; the Pages workflow passes it.
"""
import html, json, os, re, shutil, subprocess, sys
from datetime import date
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'site' / 'src'
OUT = ROOT / '_site'
REPO = 'https://github.com/sametkilictas/tidewell-sdd-ibm-bob'
SITE = os.environ.get('SITE_URL', 'https://sametkilictas.github.io/tidewell-sdd-ibm-bob/').rstrip('/') + '/'
TITLE = 'Tidewell SDD — spec-driven delivery with IBM Bob'
DESC = ('An open, complete worked example of spec-driven development with IBM Bob: Bob builds, people approve, '
        'checks verify. Modes and guardrails for Bob V2, human sign-offs, shift-left security checks, a pipeline '
        'gate for any CI and an evidence pack for auditors.')
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;600&display=swap" rel="stylesheet">')

NAV = [('', 'Home'), ('atlas/', 'Atlas'), ('labs/', 'Lab guide'), ('deck/tidewell-sdd-ibm-bob-deck.pdf', 'Presentation'),
       ('article/', 'Article'), ('#video', 'Video')]


def counts():
    c = {'features': len([p for p in (ROOT / 'sdd/specs/features').iterdir() if p.is_dir()]),
         'reqs': 212, 'acs': 287, 'ops': 116,
         'commands': len(list((ROOT / '.bob/commands').glob('*.md'))),
         'modes': 0}
    try:
        out = subprocess.run(['node', 'sdd/scripts/validate-specs.mjs'], cwd=ROOT, capture_output=True, text=True, timeout=120).stdout
        m = re.search(r'requirements:\s*(\d+).*?acceptance criteria:\s*(\d+).*?contract ops:\s*(\d+)', out)
        if m:
            c['reqs'], c['acs'], c['ops'] = map(int, m.groups())
    except Exception as e:  # Node missing: keep the last known counts
        print('note: counts from fallback values:', e, file=sys.stderr)
    c['modes'] = len(re.findall(r'^\s*- slug:', (ROOT / '.bob/custom_modes.yaml').read_text(), re.M))
    return c


def head(title, desc, path, depth):
    up = '../' * depth
    url = SITE + path
    t = html.escape(title)
    d = html.escape(desc)
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{t}</title><meta name="description" content="{d}"><link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Tidewell SDD"><meta property="og:title" content="{t}">
<meta property="og:description" content="{d}"><meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}assets/og.png">
<meta property="og:image:width" content="1280"><meta property="og:image:height" content="640">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#161616">
<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">{FONTS}<link rel="stylesheet" href="{up}assets/site.css"></head>
<body><a class="skip" href="#main">Skip to content</a>"""


def header(current, depth):
    up = '../' * depth
    def href(h):
        if h == '':
            return up or './'
        return (up if depth else '') + h if h.startswith('#') else up + h
    # Home first, on every page, so the way back is always in the same place (the logo links there too)
    links = ''.join(f'<a href="{href(h)}"{" aria-current=page" if h == current else ""}>{label}</a>' for h, label in NAV)
    return f"""<header class="hdr"><div class="in"><a class="brand" href="{up or './'}">{logo()}Tidewell SDD <b>· IBM Bob</b></a>
<nav class="nav" aria-label="Site">{links}<a class="gh" href="{REPO}">GitHub ↗</a></nav></div></header>"""


def logo():
    return ('<svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="4" width="7" height="24" fill="#a56eff"/>'
            '<rect x="12.5" y="4" width="7" height="24" fill="#ee5396"/><rect x="23" y="4" width="7" height="24" fill="#08bdba"/></svg>')


def footer(depth):
    up = '../' * depth
    return f"""<footer><div class="wrap"><div class="cols">
<div><h4>Tidewell SDD</h4><p style="margin:0">Spec-driven delivery with IBM Bob. An open worked example: Bob builds, people approve, checks verify.</p></div>
<div><h4>Learn</h4><ul><li><a href="{up}atlas/">Interactive Atlas</a></li><li><a href="{up}labs/">Lab guide</a></li>
<li><a href="{up}deck/tidewell-sdd-ibm-bob-deck.pdf">Presentation (PDF)</a></li><li><a href="{up}article/">Article</a></li></ul></div>
<div><h4>Kit</h4><ul><li><a href="{REPO}">Repository</a></li><li><a href="{REPO}/releases">Releases</a></li>
<li><a href="{REPO}/blob/main/CONTRIBUTING.md">Contributing</a></li><li><a href="{REPO}/blob/main/SECURITY.md">Security policy</a></li></ul></div>
<div><h4>Licence</h4><ul><li>Code: <a href="{REPO}/blob/main/LICENSE">Apache-2.0</a></li><li>Docs and media: <a href="{REPO}/blob/main/LICENSE-docs">CC BY 4.0</a></li></ul></div>
</div><p class="made">Made with <a href="https://bob.ibm.com">IBM Bob</a></p><p class="fine">Tidewell Bank is fictional; all data is synthetic. This is an independent, community example, not an IBM product and
not endorsed by IBM. IBM, IBM Bob, IBM Concert, Carbon and other IBM marks, HashiCorp Vault and Vault Radar, SonarQube and other
products named here are trademarks of their respective owners. Typefaces: IBM Plex (SIL OFL 1.1).</p></div></footer>"""


TOC_JS = """<script>(()=>{const l=[...document.querySelectorAll('.toc a')];if(!l.length)return;const h=l.map(a=>document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
const on=()=>{let i=0;h.forEach((e,k)=>{if(e.getBoundingClientRect().top<120)i=k});l.forEach((a,k)=>a.classList.toggle('on',k===i))};addEventListener('scroll',on,{passive:true});on()})();</script>"""


def link_rewrite(md_html):
    """Relative links inside kit docs point at files in the repository; on the site they go to GitHub."""
    def fix(m):
        href = m.group(1)
        if re.match(r'^(https?:|mailto:|#|\.\./(atlas|labs|deck|article)/)', href):
            return m.group(0)
        if href.endswith('LABS.md'):
            return 'href="../labs/"'
        path = href.lstrip('./')
        if not path.startswith(('sdd/', '.bob/', '.github/')) and not path.endswith('.md'):
            path = 'sdd/docs/' + path
        elif not path.startswith(('sdd/', '.bob/', '.github/')):
            path = 'sdd/docs/' + path if (ROOT / 'sdd/docs' / path).exists() else path
        return f'href="{REPO}/blob/main/{path}"'
    return re.sub(r'href="([^"]+)"', fix, md_html)


PATHS = {'Both paths': 'both', 'Terminal path': 'terminal', 'GitHub path': 'github'}
COPY_JS = """<script>(()=>{for(const pre of document.querySelectorAll('.prose pre:not(.output)')){const box=document.createElement('div');box.className='codebox';pre.before(box);box.appendChild(pre);
const b=document.createElement('button');b.type='button';b.className='copy';
b.textContent='Copy';b.setAttribute('aria-label','Copy this code');b.addEventListener('click',async()=>{const t=pre.querySelector('code')?.innerText??pre.innerText;
try{await navigator.clipboard.writeText(t);b.textContent='Copied'}catch(e){const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Selected'}
setTimeout(()=>{b.textContent='Copy'},1600)});box.appendChild(b)}})();</script>"""


SVG_ATTR = 'viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
WHERE = {
    'Terminal': ('term', '<rect x="1.5" y="2.5" width="13" height="11" rx="1"/><path d="M4.5 6l2 2-2 2M8.5 10.5h3"/>'),
    'Bob chat': ('bob', '<path d="M2.5 3h11v7.5h-6L4.5 13v-2.5h-2z"/>'),
    'Editor': ('edit', '<path d="M10.5 2.5l3 3L6 13H3v-3z"/><path d="M9 4l3 3"/>'),
    'Browser': ('web', '<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2.2 2.2 2.2 9.8 0 12M8 2C5.8 4.2 5.8 11.8 8 14"/>'),
}


def where_chip(kind):
    cls, path = WHERE[kind]
    return f'<span class="wk"><svg {SVG_ATTR}>{path}</svg>{kind}</span>'


def readable(body, img_dir=None, out=None):
    """Make a rendered guide easier to read: diagrams inline, lab and step headings with their numbers set apart,
    lab cards and checkpoints as panels, and the expected output in code blocks coloured by result."""
    def diagram(m):
        name = m.group(1)
        src = img_dir / f'{name}.svg'
        (out / 'img').mkdir(parents=True, exist_ok=True)
        shutil.copy(src, out / 'img' / src.name)
        svg = re.sub(r' width="\d+" height="\d+"', '', src.read_text().strip(), count=1)
        return (f'<figure class="diagram"><div class="dg-scroll">{svg}</div>'
                f'<figcaption>Swipe sideways to see all of it, or <a href="img/{src.name}">open it full size</a>.</figcaption></figure>')
    if img_dir:
        body = re.sub(r'<p><img alt="[^"]*" src="img/([\w-]+)\.svg" ?/?></p>', diagram, body)

    body = re.sub(r'<h2 id="([^"]+)">Lab (\d+) — (.*?)</h2>', r'<h2 id="\1" class="lab"><span class="labno">Lab \2</span>\3</h2>', body)

    def step(m):
        hid, no, rest = m.groups()
        pm = re.match(r'(Both paths|Terminal path|GitHub path)(?::\s*(.*))?$', rest)
        chip = ''
        if pm and pm.group(2):
            rest = pm.group(2)[:1].upper() + pm.group(2)[1:]
            chip = f' <span class="path {PATHS[pm.group(1)]}">{pm.group(1)}</span>'
        elif pm:
            chip = ''
            rest = f'<span class="path {PATHS[pm.group(1)]} solo">{pm.group(1)}</span>'
        return f'<h3 id="{hid}" class="step"><span class="stepno">{no}</span>{rest}{chip}</h3>'
    body = re.sub(r'<h3 id="([^"]+)">(\d+[a-z])\. (.*?)</h3>', step, body)

    def card(m):
        items = re.sub(r'<li><strong>([^<:]+):</strong> ?(.*?)</li>', r'<li><span class="k">\1</span><span class="v">\2</span></li>', m.group(1), flags=re.S)
        return f'<blockquote class="labcard">\n<ul>{items}</ul>\n</blockquote>'
    body = re.sub(r'<blockquote>\s*<ul>(\s*<li><strong>Goal:</strong>.*?)</ul>\s*</blockquote>', card, body, flags=re.S)
    body = re.sub(r'<blockquote>\s*<p><strong>Checkpoint:</strong> ?', '<blockquote class="checkpoint">\n<p><strong>Checkpoint</strong> ', body)

    # Where each command runs: a label line (emoji + bold place + detail) becomes a bar above the code box.
    kinds = '|'.join(WHERE)
    body = re.sub(rf'<p>\S+ <strong>({kinds})</strong> · (.*?)</p>',
                  lambda m: f'<p class="where w-{WHERE[m.group(1)][0]}">{where_chip(m.group(1))}<span class="wv">{m.group(2)}</span></p>', body)
    body = re.sub(rf'<li>\S+ <strong>({kinds})</strong> · ',
                  lambda m: f'<li><span class="where-in w-{WHERE[m.group(1)][0]}">{where_chip(m.group(1))}</span> ', body)
    body = re.sub(rf'<td>\S+ <strong>({kinds})</strong></td>',
                  lambda m: f'<td><span class="where-in w-{WHERE[m.group(1)][0]}">{where_chip(m.group(1))}</span></td>', body)
    # What you should see: output boxes look different from boxes you type into, and have no Copy button.
    body = body.replace('<pre><code class="language-text">', '<pre class="output"><code class="language-text">')
    body = body.replace('<pre><code class="language-prompt">', '<pre class="prompt"><code class="language-prompt">')

    def code(m):
        lines = []
        for ln in m.group(2).split('\n'):
            cm = re.search(r'(^|\s)(#\s.*)$', ln)
            if ln.lstrip().startswith(('✖', '✔')):
                ln = f'<span class="out {"bad" if ln.lstrip().startswith("✖") else "good"}">{ln}</span>'
            elif cm:
                c = cm.group(2)
                kind = 'out bad' if '✖' in c else 'out good' if '✔' in c else 'cm'
                ln = ln[:cm.start(2)] + f'<span class="{kind}">{c}</span>'
            lines.append(ln)
        return m.group(1) + '\n'.join(lines) + '</code></pre>'
    body = re.sub(r'(<pre(?: class="\w+")?><code[^>]*>)(.*?)</code></pre>', code, body, flags=re.S)
    return body


def render_doc(md_text, *, title, eyebrow, lede, path, current, out_dir, prev_next='', img_dir=None):
    md = markdown.Markdown(extensions=['tables', 'fenced_code', 'toc', 'sane_lists'], extension_configs={'toc': {'permalink': False}})
    body = md.convert(md_text)
    body = link_rewrite(body)
    body = readable(body, img_dir, OUT / out_dir)
    tops = [t for top in md.toc_tokens for t in ([top] if top['level'] == 2 else top.get('children') or [])]
    toc = ''.join(f'<a href="#{t["id"]}">{html.escape(re.sub(r"<[^>]+>", "", t["name"]))}</a>' for t in tops if t['level'] == 2)
    page = (head(title, lede, path, 1) + header(current, 1) +
            f"""<main id="main"><div class="doc-hero"><div class="wrap"><p class="eyebrow">{eyebrow}</p><h1>{html.escape(title)}</h1>
<p class="lede">{html.escape(lede)}</p></div></div>
<div class="wrap doc"><nav class="toc" aria-label="On this page"><p>On this page</p>{toc}</nav>
<article class="prose">{body}{prev_next}</article></div></main>""" + footer(1) + TOC_JS + COPY_JS + '</body></html>')
    (OUT / out_dir).mkdir(parents=True, exist_ok=True)
    (OUT / out_dir / 'index.html').write_text(page)


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(SRC, OUT)
    c = counts()

    # landing page
    land = (SRC / 'index.html').read_text()
    for k, v in c.items():
        land = land.replace('{{' + k + '}}', str(v))
    land = land.replace('{{HEAD}}', head(TITLE, DESC, '', 0)).replace('{{HEADER}}', header('', 0)).replace('{{FOOTER}}', footer(0))
    land = land.replace('{{REPO}}', REPO)
    (OUT / 'index.html').write_text(land)

    # 404
    nf = (SRC / '404.html').read_text().replace('{{HEAD}}', head('Page not found · Tidewell SDD', DESC, '404.html', 0).replace(
        'href="assets/', f'href="{SITE}assets/')).replace('{{HEADER}}', header(None, 0).replace('href="./"', 'href=""').replace('href="', f'href="{SITE}').replace(
        f'href="{SITE}https', 'href="https')).replace('{{FOOTER}}', '')
    (OUT / '404.html').write_text(nf)

    # lab guide
    labs = (ROOT / 'sdd/docs/LABS.md').read_text()
    labs = re.sub(r'\A# [^\n]*\n+(?:[A-Z][a-z]{2} \d{1,2}, \d{4}[^\n]*\n+)?', '', labs)
    render_doc(labs, title='Lab guide: spec-driven delivery with IBM Bob', eyebrow='Hands-on · a day, alone or together',
               lede='Run the whole cycle for real at Tidewell Bank: a written spec, a signed plan, test-first code, shift-left '
                    'security checks, proof that every example works, a pipeline gate and a release decision.',
               path='labs/', current='labs/', out_dir='labs', img_dir=ROOT / 'sdd/docs/img',
               prev_next=f'<div class="docnav"><a class="btn" href="../atlas/">Explore the Atlas</a><a class="btn ghost" style="color:var(--text);border-color:var(--border)" href="{REPO}">Get the kit</a></div>')

    # article
    art = (ROOT / 'site/content/article.md').read_text()
    fm = re.match(r'\A---\n(.*?)\n---\n', art, re.S)
    meta = dict(re.findall(r'^(\w+):\s*(.*)$', fm.group(1), re.M)) if fm else {}
    art = art[fm.end():] if fm else art
    render_doc(art, title=meta.get('title', 'Article'), eyebrow=f'Article · {meta.get("date", "")}', lede=meta.get('description', ''),
               path='article/', current='article/', out_dir='article',
               prev_next=f'<div class="docnav"><a class="btn" href="../atlas/">Explore the Atlas</a><a class="btn ghost" style="color:var(--text);border-color:var(--border)" href="../labs/">Run the labs</a></div>')

    # the Atlas: self-contained; point its links at the site and the repository, add link previews
    atlas = (ROOT / 'sdd/docs/atlas.html').read_text()
    atlas = atlas.replace("'LABS.md']", "'../labs/']").replace("'../../README.md']", f"'{REPO}#readme']")
    # the Atlas's top bar gets a link back to the website's home page
    home = "const HOME='https://sametkilictas.github.io/tidewell-sdd-ibm-bob/';"
    assert home in atlas, 'the Atlas no longer has the HOME setting'
    atlas = atlas.replace(home, "const HOME='../';", 1)
    atlas_meta = (f'<meta name="description" content="{html.escape(DESC)}"><link rel="canonical" href="{SITE}atlas/">'
                  f'<meta property="og:title" content="Tidewell SDD Atlas — spec-driven delivery with IBM Bob">'
                  f'<meta property="og:description" content="The whole spec-driven cycle, interactive: the loop, the people, the automation dial, shift-left security and the pipeline.">'
                  f'<meta property="og:image" content="{SITE}assets/og.png"><meta property="og:url" content="{SITE}atlas/"><meta name="twitter:card" content="summary_large_image">'
                  f'<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">')
    atlas = atlas.replace('</title>', '</title>' + atlas_meta, 1)
    (OUT / 'atlas').mkdir(exist_ok=True)
    (OUT / 'atlas' / 'index.html').write_text(atlas)

    # crawlers and Pages
    today = date.today().isoformat()
    urls = ['', 'atlas/', 'labs/', 'article/', 'deck/tidewell-sdd-ibm-bob-deck.pdf']
    (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                                     + ''.join(f'<url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>' for u in urls) + '</urlset>\n')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n')
    (OUT / '.nojekyll').write_text('')
    (OUT / 'index.html.json').unlink(missing_ok=True)
    print(json.dumps({'built': str(OUT), 'counts': c, 'site': SITE}))


if __name__ == '__main__':
    build()

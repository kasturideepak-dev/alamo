#!/usr/bin/env python3
"""Compose the static prototype pages from _partials/.

Static HTML is the deliverable; this only keeps the shared header, footer and
repeated sections from drifting between the two pages. Run: python3 build.py
"""
import hashlib, pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
P = ROOT / "_partials"

def read(name):
    return (P / name).read_text()

# --- diagonal section cuts (Figma 203-210) ---------------------------------
# Two stacked wedges. `fill` paints the far side of the boundary so the cut can
# sit on top of whichever section it overlaps.
def cut(kind):
    """A diagonal boundary, painted OVER the section above it.

    Nothing here has to match a neighbour's background: the wedges cover the
    last `--cut-h` of the preceding section and the lowest band runs down to
    the boundary, continuing seamlessly into the section below.
    """
    if kind == "to-navy":
        return """<div class="cut" aria-hidden="true">
  <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
    <path d="M0 46 L1440 0 L1440 24 L0 70 Z" fill="#52B04F"/>
    <path d="M0 70 L1440 24 L1440 100 L0 100 Z" fill="#2A3379"/>
  </svg>
</div>"""
    if kind == "to-white":
        return """<div class="cut" aria-hidden="true">
  <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
    <path d="M0 40 L1440 0 L1440 20 L0 60 Z" fill="#52B04F"/>
    <path d="M0 60 L1440 20 L1440 40 L0 80 Z" fill="#2A3379"/>
    <path d="M0 80 L1440 40 L1440 100 L0 100 Z" fill="#FFFFFF"/>
  </svg>
</div>"""
    raise KeyError(kind)

# --- schematic locality maps ----------------------------------------------
def locmap(label, roads, pin=(96, 58)):
    """A stylised locality panel, not a live map. Replaced by an embedded
    Google Map in the production build."""
    lines = "".join(
        '<path d="%s" stroke="#D9DCE8" stroke-width="%s" fill="none" stroke-linecap="round"/>' % (d, w)
        for d, w in roads)
    px, py = pin
    return (
      '<svg viewBox="0 0 200 120" role="img" aria-label="Map of %s">'
      '<rect width="200" height="120" fill="#EEF1F7"/>'
      '<path d="M0 96 H200" stroke="#CFE3CC" stroke-width="26" fill="none"/>'
      '%s'
      '<circle cx="%s" cy="%s" r="13" fill="#52B04F" opacity=".22"/>'
      '<path d="M%s %s c0 4.6-6 10.4-6 10.4S%s %s %s %s a6 6 0 1 1 12 0Z" fill="#2A3379"/>'
      '<circle cx="%s" cy="%s" r="2.3" fill="#fff"/>'
      '<text x="8" y="114" font-family="Inter,sans-serif" font-size="8" fill="#5B64AA">%s</text>'
      '</svg>'
    ) % (label, lines, px, py, px+6, py, px-6+0, py+0, px-6, py, px, py, label)

MAP_SA = locmap("Potranco Rd", [
    ("M-4 40 H204", 7), ("M-4 70 H204", 4), ("M56 -4 V124", 5), ("M136 -4 V124", 3),
    ("M-4 18 H120 V124", 2.4),
], pin=(98, 52))
MAP_BO = locmap("S Main St", [
    ("M-4 26 H204", 4), ("M78 -4 V124", 7), ("M-4 66 H204", 3),
    ("M130 -4 V124", 2.4), ("M0 100 C60 78 140 108 204 84", 2.4),
], pin=(80, 56))

def stamp(rel):
    """Content-hash query on an asset URL.

    A CDN keys its cache on the exact URL, so an unchanged `style.css` path can
    keep serving a stale copy for the whole max-age after a deploy — which is
    exactly what happened on 2026-09-13 (the brotli variant went 31 hours
    stale). Changing the URL whenever the bytes change makes that impossible.
    """
    p = ROOT / rel
    h = hashlib.sha256(p.read_bytes()).hexdigest()[:10] if p.exists() else "0"
    return "%s?v=%s" % (rel, h)


SHELL = """<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#2A3379">
<link rel="icon" href="assets/img/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="{css}">
{preload}
{sprite}
{header}
<main id="main">
{body}
</main>
{footer}
<script src="assets/js/gsap.min.js"></script>
<script src="assets/js/ScrollTrigger.min.js"></script>
<script src="assets/js/lenis.min.js"></script>
<script src="{mainjs}"></script>
"""

HEAD_OPEN = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
"""

def compose(out, title, desc, body_file, preload, active_pc, header_file="header.html",
            footer=True):
    header = (read(header_file)
              .replace("{{ACT_PC}}", " is-active" if active_pc else "")
              .replace("{{MEGA}}", read("megamenu.html")))
    body = read(body_file)
    body = (body
        .replace("{{VALUES}}", read("values.html"))
        .replace("{{PROVIDERS}}", read("providers.html"))
        .replace("{{TESTIMONIALS}}", read("testimonials.html"))
        
        .replace("{{CUT_TO_NAVY}}", cut("to-navy"))
        .replace("{{CUT_TO_WHITE}}", cut("to-white"))
        .replace("{{MAP_SA}}", MAP_SA)
        .replace("{{MAP_BO}}", MAP_BO))

    page = SHELL.format(title=title, desc=desc, preload=preload,
                        css=stamp("assets/css/style.css"),
                        mainjs=stamp("assets/js/main.js"),
                        sprite=read("sprite.html"), header=header,
                        body=body,
                        footer=read("footer.html")
                            .replace("{{CUT_TO_NAVY}}", cut("to-navy"))
                            if footer else "")
    lines = page.split("\n")
    head_lines, body_lines, in_head = [], [], True
    for ln in lines:
        if in_head and ln.startswith("<svg class=\"svg-sprite\""):
            in_head = False
        (head_lines if in_head else body_lines).append(ln)
    html = HEAD_OPEN + "\n".join(head_lines).rstrip() + "\n</head>\n<body>\n" \
         + "\n".join(body_lines).rstrip() + "\n</body>\n</html>\n"
    (ROOT / out).write_text(html)
    left = re.findall(r"\{\{[A-Z_]+\}\}", html)
    print("%-20s %6d bytes%s" % (out, len(html), "  UNRESOLVED: %s" % set(left) if left else ""))

compose(
  "index.html",
  "Alamo Primary Care — Complete care for your health, wellness and confidence",
  "Primary care, weight loss management, hormone replacement and aesthetics in "
  "San Antonio and Boerne, Texas. Accepting new patients ages 16 and up.",
  "page-portal.html",
  '<link rel="preload" as="image" href="assets/img/card-primary.png">',
  active_pc=False, header_file="header-min.html", footer=False,
)
compose(
  "primary-care.html",
  "Primary Health Care — Alamo Primary Care",
  "Comprehensive primary care at Alamo Primary Care: telemedicine, chronic disease "
  "management, screenings, routine check-ups, in-office procedures, geriatric care and more.",
  "page-primary.html",
  '<link rel="preload" as="image" href="assets/img/community-room.jpg">',
  active_pc=True,
)

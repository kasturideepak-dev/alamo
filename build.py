#!/usr/bin/env python3
"""Compose the static prototype pages from _partials/.

Static HTML is the deliverable; this only keeps the shared header, footer and
repeated sections from drifting between the two pages. Run: python3 build.py
"""
import hashlib, pathlib, re, sys

import megamenus

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

# --- URL structure --------------------------------------------------------
# Each page is written as <folder>/index.html so the live URL reads as a
# hierarchy: /primary-care/ and /primary-care/acute-care/. Old .html paths are
# 301-redirected in .htaccess.
PAGES = {
    "index.html": "",
    "primary-care.html": "primary-care",
    "acute-care.html": "primary-care/acute-care",
    "chronic-care.html": "primary-care/chronic-disease-management",
    "telemedicine.html": "primary-care/telemedicine",
    "checkups.html": "primary-care/routine-check-ups",
    "screenings.html": "primary-care/health-screenings",
    "procedures.html": "primary-care/in-office-procedures",
    "geriatric.html": "primary-care/geriatric-care",
    "mens-health.html": "primary-care/mens-health",
    "womens-health.html": "primary-care/womens-health",
    "referrals.html": "primary-care/referrals",
    "iv-therapy.html": "primary-care/iv-therapy",
    "weight-loss.html": "weight-loss",
    "hormone-replacement.html": "hormone-replacement",
    "trt.html": "hormone-replacement/trt",
    "aesthetics.html": "aesthetics",
    "semaglutide.html": "weight-loss/semaglutide",
    "tirzepatide.html": "weight-loss/tirzepatide",
    "lipotropic.html": "weight-loss/lipotropic-b12-injections",
    "inbody.html": "weight-loss/inbody-scan",
    "weight-management.html": "weight-loss/weight-management",
    "biote-men.html": "hormone-replacement/biote-for-men",
    "biote-women.html": "hormone-replacement/biote-for-women",
    "botox.html": "aesthetics/botox",
    "dermal-fillers.html": "aesthetics/dermal-fillers",
    "sculptra.html": "aesthetics/sculptra",
}

def url_for(name):
    folder = PAGES[name]
    return "/" + folder + "/" if folder else "/"

def absolutise(html):
    """Rewrite page links to their folder URLs and asset paths to root-absolute,
    so a page works at any depth."""
    for name in sorted(PAGES, key=len, reverse=True):
        html = re.sub(r'(href=")%s(#[^"]*)?"' % re.escape(name),
                      lambda m: 'href="%s%s"' % (url_for(name), m.group(2) or ""), html)
    html = html.replace('href="assets/', 'href="/assets/')
    html = html.replace('src="assets/', 'src="/assets/')
    html = html.replace('content="assets/', 'content="/assets/')
    return html

# --- related services rail -------------------------------------------------
# One list for every primary care service. `page` points at the service's own
# page once it exists; the rest fall back to the services grid.
PC_SERVICES = [
    ("s01-telemedicine", "Telemedicine Visits", "telemedicine.html"),
    ("s02-chronic", "Chronic Disease Management", "chronic-care.html"),
    ("s03-screenings", "Health Screenings &amp; Diagnostic Tests", "screenings.html"),
    ("s04-checkups", "Routine Check-ups &amp; Preventative Care", "checkups.html"),
    ("s05-procedures", "In-office Procedures", "procedures.html"),
    ("s06-geriatric", "Geriatric Care", "geriatric.html"),
    ("s07-mens", "Men&rsquo;s Health Services", "mens-health.html"),
    ("s08-womens", "Women&rsquo;s Health Services", "womens-health.html"),
    ("s09-referrals", "Referrals to Specialists", "referrals.html"),
    ("s10-acute", "Acute Care Visits", "acute-care.html"),
    ("s11-iv", "IV Therapy", "iv-therapy.html"),
]

# the other sections get the same rail, with their own list
WL_SERVICES = [
    ("https://images.pexels.com/photos/6551136/pexels-photo-6551136.jpeg?auto=compress&cs=tinysrgb&w=600&h=420&fit=crop", "Weight Management", "weight-management.html"),
    ("https://images.pexels.com/photos/7653692/pexels-photo-7653692.jpeg?auto=compress&cs=tinysrgb&w=600&h=420&fit=crop", "Semaglutide", "semaglutide.html"),
    ("https://images.pexels.com/photos/5207032/pexels-photo-5207032.jpeg?auto=compress&cs=tinysrgb&w=600&h=420&fit=crop", "Tirzepatide", "tirzepatide.html"),
    ("https://images.unsplash.com/photo-1675271007628-47bead6b5960?auto=format&fit=crop&w=600&h=420&q=70", "InBody Weight Analyzer", "inbody.html"),
    ("https://images.pexels.com/photos/5234490/pexels-photo-5234490.jpeg?auto=compress&cs=tinysrgb&w=600&h=420&fit=crop", "Lipolean &amp; B12 Injections", "lipotropic.html"),
]
HR_SERVICES = [
    ("https://images.unsplash.com/photo-1666887360680-9dc27a1d2753?auto=format&fit=crop&w=600&h=420&q=70", "Testosterone Replacement", "trt.html"),
    ("https://images.pexels.com/photos/3782194/pexels-photo-3782194.jpeg?auto=compress&cs=tinysrgb&w=600&h=420&fit=crop", "Biote for Men", "biote-men.html"),
    ("https://images.unsplash.com/photo-1761414500568-1348275e08a0?auto=format&fit=crop&w=600&h=420&q=70", "Biote for Women", "biote-women.html"),
]
AE_SERVICES = [
    ("https://images.pexels.com/photos/4586708/pexels-photo-4586708.jpeg?auto=compress&cs=tinysrgb&w=600&h=420&fit=crop", "Botox", "botox.html"),
    ("https://images.unsplash.com/photo-1746017062285-13c77e29fc25?auto=format&fit=crop&w=600&h=420&q=70", "Dermal Filler", "dermal-fillers.html"),
    ("https://images.unsplash.com/photo-1746708810803-722593e53772?auto=format&fit=crop&w=600&h=420&q=70", "Sculptra", "sculptra.html"),
]
RAILS = {"PC": (PC_SERVICES, "More Primary Care Services", "/primary-care/#services"),
         "WL": (WL_SERVICES, "More Weight Loss Services", "/weight-loss/#services"),
         "HR": (HR_SERVICES, "More Hormone Therapies", "/hormone-replacement/#services"),
         "AE": (AE_SERVICES, "More Aesthetic Services", "/aesthetics/#services")}

def service_rail(skip=None, section="PC"):
    items, heading, fallback = RAILS.get(section, RAILS["PC"])
    cards = []
    for img, label, page in items:
        if page and page == skip:
            continue
        href = url_for(page) if page else fallback
        src = img if img.startswith("http") else "/assets/img/%s.jpg" % img
        cards.append(
            '        <a class="scard" href="%s">\n'
            '          <span class="scard__img"><img src="%s" alt="" loading="lazy" decoding="async"></span>\n'
            '          <span class="scard__name">%s</span>\n'
            '        </a>' % (href, src, label))
    return ('<section class="section svc-more" data-count="%d">\n' % len(cards) +
            '  <div class="shell">\n'
            '    <div class="svc-more__head">\n'
            '      <h2 class="h2" data-split>' + heading + '</h2>\n'
            '      <div class="srail__ctrl">\n'
            '        <button class="srail__btn" type="button" data-srail-prev aria-label="Scroll left">\n'
            '          <svg aria-hidden="true"><use href="#i-arrow-l"/></svg>\n'
            '        </button>\n'
            '        <button class="srail__btn" type="button" data-srail-next aria-label="Scroll right">\n'
            '          <svg aria-hidden="true"><use href="#i-arrow-r"/></svg>\n'
            '        </button>\n'
            '      </div>\n'
            '    </div>\n'
            '    <div class="srail" data-srail>\n'
            '      <div class="srail__track">\n' + "\n".join(cards) + '\n'
            '      </div>\n'
            '    </div>\n'
            '  </div>\n'
            '</section>')

def mobile_bar(body):
    """Fixed bottom bar on phones: book, services, about. Each button points at
    this page's own section when it has one, otherwise at the primary care page."""
    ids = set(re.findall(r'id="([a-z-]+)"', body))
    def pick(options, fallback):
        return next(("#" + o for o in options if o in ids), fallback)
    book = pick(["book", "trt-contact", "schedule"], "tel:+12105711338")
    # the TRT page belongs to the hormone section
    services = pick(["services"], "hormone-replacement.html#services" if "trt-contact" in ids
                    else "primary-care.html#services")
    about = pick(["about", "program", "approach", "trt", "membership", "why"], "primary-care.html#about")
    item = ('  <a class="mbar__item%s" href="%s"><svg aria-hidden="true"><use href="#%s"/></svg>'
            '<span>%s</span></a>\n')
    return ('\n<nav class="mbar" aria-label="Quick links">\n'
            + item % ("", services, "i-stetho", "Services")
            + item % ("", about, "i-users", "About")
            + item % (" mbar__item--book", book, "i-cal", "Book now")
            + '</nav>\n')

def compose(out, title, desc, body_file, preload, active_pc=False, header_file="header.html",
            footer=True, active=None):
    # active: which nav item is current — "PC", "WL", "HR" or "AE"
    if active_pc:
        active = "PC"
    header = read(header_file)
    for key in ("PC", "WL", "HR", "AE"):
        header = header.replace("{{ACT_%s}}" % key, " is-active" if active == key else "")
    header = (header
              .replace("{{MEGA}}", megamenus.panels(read("megamenu.html"))
                                if header_file == "header.html" else read("megamenu.html")))
    body = read(body_file)
    body = (body
        .replace("{{VALUES}}", read("values.html"))
        .replace("{{PROVIDERS}}", read("providers.html"))
        .replace("{{INSURANCE}}", read("insurance.html"))
        .replace("{{TESTIMONIALS}}", read("testimonials.html"))
        .replace("{{SERVICE_RAIL}}", service_rail(skip=out, section=active or "PC"))
        
        .replace("{{CUT_TO_NAVY}}", cut("to-navy"))
        .replace("{{CUT_TO_WHITE}}", cut("to-white"))
        .replace("{{MAP_SA}}", MAP_SA)
        .replace("{{MAP_BO}}", MAP_BO)
        .replace("{{BAND}}", read("band.html"))
        .replace("{{FAQ_CTA}}", read("contact-strip.html")))

    body += mobile_bar(body)
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
    html = absolutise(html)
    folder = PAGES[out]
    target = (ROOT / folder / "index.html") if folder else (ROOT / "index.html")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html)
    out = str(target.relative_to(ROOT))
    left = re.findall(r"\{\{[A-Z_]+\}\}", html)
    print("%-34s %6d bytes%s" % (out, len(html), "  UNRESOLVED: %s" % set(left) if left else ""))

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
compose(
  "weight-loss.html",
  "Weight Loss Management — Alamo Primary Care",
  "Medically supervised weight loss in San Antonio and Boerne: tirzepatide, semaglutide, "
  "and InBody body composition analysis.",
  "page-weight.html",
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400&display=swap">\n'
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1675271007628-47bead6b5960?auto=format&fit=crop&w=2200&q=80">',
  active="WL",
)
compose(
  "hormone-replacement.html",
  "Hormone Replacement Therapy — Alamo Primary Care",
  "Hormone replacement therapy at Alamo Primary Care: a testosterone replacement "
  "membership for men and Biote bioidentical hormone therapy for men and women.",
  "page-hormone.html",
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400&display=swap">\n'
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1666887360680-9dc27a1d2753?auto=format&fit=crop&w=2200&q=80">',
  active="HR",
)
compose(
  "trt.html",
  "Testosterone Replacement Therapy Membership — Alamo Primary Care",
  "The TRT program at Alamo Primary Care: a $150/month membership with consultations, "
  "lab reviews, prescription management and injection training.",
  "page-trt.html",
  '<link rel="preload" as="image" href="assets/img/s07-mens.jpg">',
  active="HR",
)
compose(
  "acute-care.html",
  "Acute Care & Same-Day Sick Visits in San Antonio & Boerne | Alamo Primary Care",
  "Same-day and next-available acute care visits in San Antonio and Boerne for "
  "fever, sore throat, infections, minor injuries and stomach pain.",
  "page-acute-care.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1758691462878-6edc3d3da1be?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "chronic-care.html",
  "Chronic Disease Management in San Antonio & Boerne | Alamo Primary Care",
  "Personalized chronic disease management in San Antonio and Boerne for diabetes, "
  "high blood pressure, cholesterol, heart disease, COPD and thyroid disorders.",
  "page-chronic-care.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1758691462321-9b6c98c40f7e?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "telemedicine.html",
  "Telemedicine Primary Care in San Antonio & Boerne | Alamo Primary Care",
  "Secure virtual visits with trusted primary care physicians in San Antonio & Boerne. "
  "Get care for minor illnesses, follow-ups & chronic conditions from home.",
  "page-telemedicine.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1758691463620-188ca7c1a04f?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "checkups.html",
  "Routine Check-Ups & Preventive Care in San Antonio & Boerne | Alamo Primary Care",
  "Annual physicals, wellness exams, vaccines and preventive screenings in San Antonio "
  "and Boerne, for adults and families at every stage of life.",
  "page-checkups.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.pexels.com/photos/39192383/pexels-photo-39192383.jpeg?auto=compress&cs=tinysrgb&w=2200">',
  active="PC",
)
compose(
  "screenings.html",
  "Health Screenings & Diagnostic Tests in San Antonio & Boerne | Alamo Primary Care",
  "Preventive health screenings and diagnostic testing in San Antonio & Boerne. Blood "
  "work, cholesterol, diabetes & cancer screenings. Book with Alamo Primary Care.",
  "page-screenings.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1606206591513-adbfbdd7a177?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "procedures.html",
  "In-Office Procedures in San Antonio & Boerne, TX | Alamo Primary Care",
  "Stitches, wound repair, pap tests, cyst drainage and foreign body removal at our "
  "San Antonio and Boerne clinics, without the urgent care or ER wait.",
  "page-procedures.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1559123633-d373e3384f08?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "geriatric.html",
  "Geriatric Care in San Antonio & Boerne | Alamo Primary Care",
  "Senior primary care in San Antonio and Boerne: Medicare wellness visits, chronic "
  "condition management, medication reviews, memory assessments and fall prevention.",
  "page-geriatric.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1758691462321-9b6c98c40f7e?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "mens-health.html",
  "Men’s Health Services in San Antonio & Boerne | Alamo Primary Care",
  "Men’s health care in San Antonio and Boerne: annual physicals, prostate screening, "
  "low testosterone evaluation, ED treatment and heart health screening.",
  "page-mens-health.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1739285388427-d6f85d12a8fc?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "womens-health.html",
  "Women’s Health Services in San Antonio & Boerne | Alamo Primary Care",
  "Well-woman exams, pap tests, birth control, menopause care and preventive "
  "screenings for women in San Antonio and Boerne, Texas.",
  "page-womens-health.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1631815589874-ca81d86ee018?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "referrals.html",
  "Referrals to Specialists in San Antonio & Boerne | Alamo Primary Care",
  "Alamo Primary Care connects patients in San Antonio and Boerne with trusted "
  "specialists, coordinates records and stays involved after the referral.",
  "page-referrals.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1745420052490-285dbfa1cf4d?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "iv-therapy.html",
  "IV Therapy & Vitamin Injections in San Antonio & Boerne | Alamo Primary Care",
  "Physician-supervised IV therapy and vitamin injections in San Antonio and Boerne: "
  "hydration, Myers’ Cocktail, immunity, recovery drips and B12 shots.",
  "page-iv-therapy.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1763310225009-50214e3c99d9?auto=format&fit=crop&w=2200&q=80">',
  active="PC",
)
compose(
  "semaglutide.html",
  "Semaglutide for Weight Loss in San Antonio & Boerne | Alamo Primary Care",
  "Physician-prescribed semaglutide in San Antonio and Boerne: labs before you start, "
  "gradual dosing, monthly follow-ups and InBody body composition tracking.",
  "page-semaglutide.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.pexels.com/photos/7653692/pexels-photo-7653692.jpeg?auto=compress&cs=tinysrgb&w=2200">',
  active="WL",
)
compose(
  "tirzepatide.html",
  "Tirzepatide for Weight Loss in San Antonio & Boerne | Alamo Primary Care",
  "Physician-prescribed tirzepatide (Zepbound, Mounjaro) in San Antonio and Boerne, with "
  "labs, managed dose steps and InBody tracking at every monthly visit.",
  "page-tirzepatide.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.pexels.com/photos/5207032/pexels-photo-5207032.jpeg?auto=compress&cs=tinysrgb&w=2200">',
  active="WL",
)
compose(
  "lipotropic.html",
  "Lipotropic (Lipolean) & B12 Injections in San Antonio & Boerne | Alamo Primary Care",
  "Weekly lipotropic and vitamin B12 injections in San Antonio and Boerne, given by "
  "clinical staff as part of a physician-led weight loss plan.",
  "page-lipotropic.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.pexels.com/photos/5234490/pexels-photo-5234490.jpeg?auto=compress&cs=tinysrgb&w=2200">',
  active="WL",
)
compose(
  "inbody.html",
  "InBody Body Composition Scan in San Antonio & Boerne | Alamo Primary Care",
  "A 60-second InBody scan measuring muscle, body fat, visceral fat and body water, "
  "with results explained by your provider in San Antonio or Boerne.",
  "page-inbody.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1675271007628-47bead6b5960?auto=format&fit=crop&w=2200&q=80">',
  active="WL",
)
compose(
  "weight-management.html",
  "Weight Management in San Antonio & Boerne | Alamo Primary Care",
  "A long-term weight management program in San Antonio and Boerne: metabolic review, nutrition, habits and InBody tracking, with or without medication.",
  "page-weight-management.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.pexels.com/photos/6551136/pexels-photo-6551136.jpeg?auto=compress&cs=tinysrgb&w=2200">',
  active="WL",
)
compose(
  "biote-men.html",
  "Biote Testosterone Pellet Therapy for Men in San Antonio & Boerne | Alamo Primary Care",
  "Testosterone pellet therapy for men in San Antonio and Boerne: morning labs, in-office insertion every four to six months and monitoring by your primary care team.",
  "page-biote-men.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.pexels.com/photos/3782194/pexels-photo-3782194.jpeg?auto=compress&cs=tinysrgb&w=2200">',
  active="HR",
)
compose(
  "biote-women.html",
  "Biote Hormone Pellet Therapy for Women in San Antonio & Boerne | Alamo Primary Care",
  "Bioidentical hormone pellet therapy for perimenopause and menopause in San Antonio and Boerne, with lab testing first and follow-ups every three to four months.",
  "page-biote-women.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1761414500568-1348275e08a0?auto=format&fit=crop&w=2200&q=80">',
  active="HR",
)
compose(
  "botox.html",
  "Botox in San Antonio & Boerne | Alamo Primary Care",
  "Botox for forehead lines, frown lines and crow's feet in San Antonio and Boerne, planned and performed by medical providers with a two-week follow-up.",
  "page-botox.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.pexels.com/photos/4586708/pexels-photo-4586708.jpeg?auto=compress&cs=tinysrgb&w=2200">',
  active="AE",
)
compose(
  "dermal-fillers.html",
  "Dermal Fillers in San Antonio & Boerne | Alamo Primary Care",
  "Lip, cheek, under-eye, chin and jawline filler in San Antonio and Boerne, with immediate, natural-looking results planned by medical providers.",
  "page-dermal-fillers.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1746017062285-13c77e29fc25?auto=format&fit=crop&w=2200&q=80">',
  active="AE",
)
compose(
  "sculptra.html",
  "Sculptra in San Antonio & Boerne | Alamo Primary Care",
  "Sculptra collagen-stimulating treatment in San Antonio and Boerne: gradual, natural results over two to three sessions that can last two years or more.",
  "page-sculptra.html",
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1746708810803-722593e53772?auto=format&fit=crop&w=2200&q=80">',
  active="AE",
)
compose(
  "aesthetics.html",
  "Aesthetics — Botox, Filler & Sculptra — Alamo Primary Care",
  "Botox, dermal filler and Sculptra treatments at Alamo Primary Care in San Antonio "
  "and Boerne, Texas.",
  "page-aesthetics.html",
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400&display=swap">\n'
  '<link rel="preconnect" href="https://images.unsplash.com">\n'
  '<link rel="preconnect" href="https://images.pexels.com">\n'
  '<link rel="preload" as="image" href="https://images.unsplash.com/photo-1673970561722-9f1dec556bdd?auto=format&fit=crop&w=2200&q=80">',
  active="AE",
)

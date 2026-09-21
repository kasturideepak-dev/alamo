"""Mega menu panels for the full header.

Primary Care's panel is hand-written in _partials/megamenu.html. The other
three services are generated here in exactly the same shape, and share its
Explore column and location cards, so all four menus stay consistent.
"""

# key: (column label, promo href, (promo image, title, text, cta), links)
# link: (icon, title, href, service image, one-line description)
SERVICES = {
    "wl": ("Weight Loss Services", "weight-loss.html#plan",
           ("assets/img/svc-weight-loss.jpg", "Physician-led weight loss",
            "Plans built around your health history.", "Book a consultation"), [
        ("i-scale", "Weight Management", "weight-loss.html#plan", "s04-checkups",
         "A plan shaped around your history, goals and week."),
        ("i-pen", "Tirzepatide", "weight-loss.html#medications", "s12-immunization",
         "Once-weekly dual GIP and GLP-1 medication."),
        ("i-pen", "Semaglutide", "weight-loss.html#medications", "s10-acute",
         "Once-weekly GLP-1 medication that quiets hunger."),
        ("i-body", "InBody Weight Analyzer", "weight-loss.html#inbody", "s03-screenings",
         "Comprehensive body composition insights."),
        ("i-cal", "How the Program Works", "weight-loss.html#plan", "s08-womens",
         "Four steps with the same provider throughout."),
    ]),
    "hr": ("Hormone Therapies", "trt.html",
           ("assets/img/s07-mens.jpg", "TRT membership, $150/month",
            "Visits, labs and prescriptions in one plan.", "Explore the program"), [
        ("i-bolt", "Testosterone Replacement (TRT)", "trt.html", "s07-mens",
         "A monitored membership program for men."),
        ("i-check", "TRT Membership &amp; Pricing", "trt.html#membership", "s02-chronic",
         "$150 a month. Medication billed separately."),
        ("i-mens", "Biote for Men", "hormone-replacement.html#biote", "s09-referrals",
         "Bioidentical hormones, dosed from your labs."),
        ("i-womens", "Biote for Women", "hormone-replacement.html#biote", "s08-womens",
         "Support for the hormonal shifts women notice."),
        ("i-lab", "Hormone Symptom Checker", "hormone-replacement.html#symptoms", "s03-screenings",
         "Tick what sounds familiar, then get tested."),
        ("i-mail", "Start Your TRT Membership", "trt.html#trt-contact", "s10-acute",
         "Send your details and we&rsquo;ll call you."),
    ]),
    "ae": ("Aesthetic Treatments", "aesthetics.html#services",
           ("assets/img/svc-aesthetics.jpg", "You, only more rested",
            "Natural results, planned in a medical setting.", "Book a consultation"), [
        ("i-sparkle", "Botox", "aesthetics.html#services", "svc-aesthetics",
         "Softens forehead, frown and crow&rsquo;s-feet lines."),
        ("i-drop", "Dermal Filler", "aesthetics.html#services", "s05-procedures",
         "Restores volume to lips, cheeks and folds."),
        ("i-plus", "Sculptra", "aesthetics.html#services", "s08-womens",
         "Rebuilds collagen gradually for lasting results."),
        ("i-check", "What We Treat", "aesthetics.html#concerns", "s01-telemedicine",
         "Lines, lost volume and tired-looking skin."),
        ("i-heart", "Why a Medical Clinic", "aesthetics.html#approach", "s06-geriatric",
         "Treatments planned around your health history."),
        ("i-cal", "Request an Appointment", "aesthetics.html#book", "s09-referrals",
         "Send your details and we&rsquo;ll call you."),
    ]),
}

LINK = ('            <a class="mega__link" data-promo-img="assets/img/{img}.jpg" '
        'data-promo-title="{title}" data-promo-text="{text}" href="{href}">'
        '<span class="mega__ico"><svg aria-hidden="true"><use href="#{ico}"/></svg></span>'
        '<span>{title}</span></a>\n')

PANEL = """    <div class="mega" id="mega-{key}" data-mega="{key}" hidden>
      <div class="mega__inner">

        <div class="mega__col">
          <p class="mega__label">{label}</p>
          <div class="mega__links">
{links}          </div>
        </div>

{explore}        <div class="mega__col mega__col--promo">
          <a class="mega__promo" href="{promo_href}" data-mega-promo>
            <img src="{img}" alt="" aria-hidden="true" loading="lazy" decoding="async">
            <span class="mega__promo-body">
              <b data-promo-title>{ptitle}</b>
              <span data-promo-text>{ptext}</span>
              <span class="mega__promo-cta">{cta}
                <svg aria-hidden="true"><use href="#i-arrow-ur"/></svg></span>
            </span>
          </a>
{locs}"""


def panels(primary_panel):
    """Primary Care's panel followed by the three generated ones."""
    explore_at = primary_panel.index('        <div class="mega__col">\n          <p class="mega__label">Explore</p>')
    promo_at = primary_panel.index('        <div class="mega__col mega__col--promo">')
    locs_at = primary_panel.index('          <div class="mega__locs">')
    explore = primary_panel[explore_at:promo_at]
    locs = primary_panel[locs_at:]

    out = [primary_panel.rstrip("\n")]
    for key, (label, promo_href, (img, ptitle, ptext, cta), links) in SERVICES.items():
        out.append(PANEL.format(
            key=key, label=label, explore=explore, promo_href=promo_href,
            img=img, ptitle=ptitle, ptext=ptext, cta=cta, locs=locs.rstrip("\n"),
            links="".join(LINK.format(ico=i, title=t, href=h, img=m, text=d)
                          for i, t, h, m, d in links)))
    return "\n".join(out) + "\n"

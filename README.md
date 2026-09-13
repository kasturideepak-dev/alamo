# Alamo Primary Care — static design prototype

Two pages, plain HTML/CSS/JS with GSAP. No build step is required to view them —
they work from the filesystem (`file://`) as well as over a server.

Built to follow the client's Figma:

| Page | Figma frame |
| --- | --- |
| `index.html` | **`163-139`** — the portal/landing page, with the Location block promoted |
| `primary-care.html` | **`203-210`** for the body, **`63-99`** for the footer |

**Logo navy is the primary colour and logo green is an accent only.**

```bash
python3 serve.py 4321
```

Then open <http://localhost:4321/index.html>.

Append `?static=1` to any URL to freeze every animation — useful for reviewing
layout, and what the screenshots in `preview/` were captured with.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Portal / main landing page, frame `163-139`. Pale green ground, the four service verticals as 2×2 cards with cut-out photography, then the **Location panel** → CTA band → footer |
| `primary-care.html` | Primary Health Care page, frame `203-210`. Video hero → About + collage → Mission / Faculty / Promise → 12 service cards → "From Age 16" band → Schedule → Providers → Testimonials → CTA → Footer |

The portal uses the frame's own **minimal header** (logo + green *Contact Us*) rather
than the full `63-99` nav bar, because that is what the frame the client approved
shows. `primary-care.html` carries the full `63-99` header. Both share the `63-99`
footer.

`index.html` and `primary-care.html` are the deliverables. They are generated
from `_partials/` by `build.py` so the header, footer, value strip, providers
row and testimonial carousel cannot drift apart between the two pages:

```bash
python3 build.py     # rewrites both HTML files from _partials/
```

Edit the partials, not the generated pages.

## Colour

Every value in the palette is a lightness step of one of **two** colours sampled
from the logo artwork:

| | Hex | Role |
| --- | --- | --- |
| Navy | `#2A3379` | **Primary.** All dark grounds, headings, section cuts, service-card overlays, the active nav item, most buttons |
| Green | `#52B04F` | **Accent only.** Booking CTAs, icons, the thin diagonal stripe, hover states, carousel dots, footer contact icons |

The Figma uses green heavily — green utility bar, green active nav, green first
service card, green washes on half the service grid, a green first location pill.
Each of those is navy here, with green kept for the single booking CTA in any
given block, the portal's arrow chips, map pins and hover. That is the one
deliberate departure from the frames, and it is what the client asked for.

The portal's pale grounds are sampled straight from frame `163-139`: page
`#EEF9ED`, green cards fading to `#DCF6DB`, navy cards to `#EBECF8`. All three are
light tints of the two logo colours.

## Locations

Frame `163-139` gives the locations a thin strip with two small pills naming the
clinics and nothing else. The client asked for them to be bigger and more visible
while **staying a strip inside the first fold, with every detail on screen**. So the
strip keeps its place and proportions but each pill becomes a full tile: a 56px
green pin, the clinic name in display type, the street address, opening hours, the
phone number, and a navy arrow to Google Maps.

The whole first fold — hero, four service cards and the strip — clears the viewport
without scrolling. Verified at 1920×1080, 1600×900, 1440×900, 1366×768, 1280×720 and
1180×700; a `max-height: 840px` query tightens the vertical rhythm so 768px-tall
laptops still fit.

The frame fills its first location pill solid green; here that tile gets a pale green
tint and a green border instead, so it still reads as the highlighted one without
green outweighing the navy.

The map panels are **stylised SVG illustrations**, generated in `build.py`
(`locmap()`). They are not live maps — swap them for an embedded Google Map in
the Next.js build.

## Motion

GSAP 3.13 + ScrollTrigger + Lenis, all vendored in `assets/js/`. Nothing is
loaded from a CDN except the two Google fonts.

- **Headings** (`[data-split]`) are split into words and revealed on a scrubbed
  trigger, together with a blur that resolves as the heading rises. Both are
  reversible, so scrolling back up re-blurs — the client asked for that.
- **A heading already on screen at load does not get a scrub.** There is no scroll
  runway ahead of it, so the scrub would sit at partial progress and leave it
  permanently half-blurred. Anything in the first fold gets a timed reveal instead,
  and the `load` sweep clears any residual blur on screen as a second guard. This
  matters much more now that the whole landing page lives in the first fold.
- `scrub: true`, never a number. A numeric scrub eases toward the scroll
  position on its own clock, which strands a heading half-revealed in a
  throttled or backgrounded tab.
- **Grids** (`.icard-grid`, `.pcard-grid`, `.loc-grid`, `.prov-grid`,
  `.values__grid`) stagger their children instead of firing at once.
- **Parallax** images rest at `scale(1.14)` and travel `-5% → +5%`, so the
  travel can never expose the frame edge.
- `ScrollTrigger.refresh()` runs on `load`, on `document.fonts.ready` and on
  `visibilitychange`; late font metrics move every trigger below them.
- A sweep on `load` forces any `[data-reveal]` still at opacity 0 to visible, so
  a failed trigger can never leave content invisible.
- `?static=1` and `prefers-reduced-motion: reduce` both disable all of it.

## Diagonal section cuts

The wedges from frame `203-210` are one component (`.cut`, generated by
`cut()` in `build.py`). Each cut is painted **over the section above it** via
`margin-top: calc(var(--cut-h) * -1)`, and its lowest band runs down to the
section boundary so it continues seamlessly into the section below. Nothing has
to be colour-matched to a neighbour's background.

The section being painted over reserves the wedge height through
`section:has(+ .cut)`. The two heroes deliberately opt out — the hero cut-out
and the hero photo are meant to be clipped by the diagonal, as in the Figma.

## Assets

`assets/img/` holds 34 files, all extracted from the client's Figma file. Notes
on the extraction and on what still needs to come from the client:

- `logo.png` is **1053 × 265** and keyed to transparency. The Figma export is an
  opaque white plate, which showed as a visible patch over dark grounds.
  `logo-white.png` is a reversed lockup derived from it.
- Several Figma sources are 4000 px wide; everything here is capped at 1800 px
  and re-encoded, for a total of ~4.8 MB.
- `assets/img/svc-primary-care.jpg`, `svc-weight-loss.jpg`, `svc-hormone.jpg` and
  `svc-aesthetics.jpg` are unused here; they are the vertical photos for the
  other three service pages.

### Still needed from the client

1. **A vector logo** (SVG/AI/EPS). `logo.png` is a raster and will not hold up
   in print or at large sizes.
2. **Real staff photography.** All three provider cards use the same portrait of
   Dr. Vishal Nemarugommula, because it is the only provider photo in the Figma;
   two are labelled "Provider Name".
3. **Real patient testimonials.** Two of three quotes are written placeholders.
   The first quote and portrait are the Figma's own — note that the frame pairs a
   photo of a man with the name "Jessica R.". That pairing needs correcting with
   real content.
4. **Confirmation of the Boerne address.** The Figma footer lists
   `12047 Potranco Rd Ste 105, Main Street, Boerne, Texas`, which merges the two
   addresses. This build uses `1411 S Main Street, Boerne, TX 78006`. The street number
   is read off the monument sign in the Figma photography; **the ZIP is not in
   the Figma** and is inferred. Please confirm the full address.
5. **The hero video** for the Primary Care page. The play button is wired to
   nothing; the Figma shows a video hero.
6. **Service copy.** The twelve service names come from the Figma; there are no
   descriptions yet.

## Housekeeping

- `.backup-editorial/` is the earlier "editorial calm" direction (marquee, pinned
  carousel, accordion, bento About cards), kept in case any part of it is wanted
  back. It is not wired into the current build.
- `_partials/unused-landing-63-99.html` is a built-out body for frame `63-99`'s
  landing page (value strip, About, "Comprehensive Care" icon cards). It is not
  used by either page now that the portal is the landing page, but it composes
  cleanly if that frame is ever wanted as a third page — add a `compose(...)` call
  in `build.py`.
- `scratch/` holds the Figma capture and verification scripts, and is not part of
  the deliverable. `scratch/grab2.py` re-downloads all 106 images from the Figma
  file into `scratch/dl/` without needing API credentials; `scratch/shot.py`,
  `overflow.py`, `motion.py` and `audit.py` are the checks this build was
  verified with.
- `preview/` holds full-page JPEGs at 1440 / 820 / 390 px plus section crops.

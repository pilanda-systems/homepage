# Pilanda Systems — website

Static HTML, no build, no generator. What is in the repository is exactly
what gets served.

**Language rule:** code, comments and documentation in English; every string a
visitor reads is German.

```
CNAME             the custom domain, read by GitHub Pages
index.html        company page (services, know-how, products, process, contact)
anlagenbau.html   Pilanda — the platform and its modules
kontor.html       Kontor — inventory management
impressum.html    imprint and disclosure (§ 5 ECG, § 25 MedienG)
datenschutz.html  privacy notice (GDPR art. 13)
fonts.css         self-hosted IBM Plex, so the site talks to nobody
fonts/            the woff2 files and the OFL licence
styles.css        design, all colours as tokens on :root
pilanda-*.svg     signet and wordmark
flyer/index.html  sales flyer, four A4 pages, fonts embedded
flyer/source/     the four sheets separately, as they were set
```

Serve it locally:

```bash
python -m http.server 8080
```

The flyer is built for print: open `flyer/index.html` and print to PDF from
the browser (A4, background graphics on, margins off). The fonts are embedded
so the result looks the same on any machine.

## Naming

**Never "ERP".** The brand concept settles it in chapter 6: the ERP emerges
from combining the modules and does not need to be carried as a product of
its own. Three levels:

| level | name |
|---|---|
| company | Pilanda Systems |
| platform | Pilanda |
| module | Pilanda Sales, Pilanda Pilot, Pilanda Planning, … |
| separate product | Kontor |

"ERP" still appears three times on the site and all three talk about other
people's systems - "Bestellung im ERP", "weil ein ERP dazukommt", "keinen
Konzern-ERP brauchen". Those stay.

Module names are only set where they are backed: the four the concept names
itself and the ones the founder gave. The rest carry the functional label
from the navigation contract (`pilanda/modules_data.py`) and nothing else.
Invented product names on a sales page would be worse than none.

## What it is

Pilanda is a cloud solution. Hosting, backups and updates are included in the
price and run in a data centre in the European Union; the customer installs
nothing. The site says so on the product page and in the FAQ -
there is no on-premise option, and no page may suggest one.

## Design

The basis is the **brand concept for corporate identity and corporate design,
draft v0.2 of 2026-10-05**. The colours are tokens on `:root` in `styles.css` —
change them there, not in the pages.

| Token | Value | Role |
|---|---|---|
| `--petrol` | `#008B8A` | signet, areas, graphics, large type |
| `--petrol-deep` | `#006B6A` | body text, links, button labels |
| `--fg` | `#1E2328` | body text, headlines (Graphit) |
| `--line-strong` | `#8A9099` | lines, current state (Blechgrau) |
| `--bg` | `#F2EFE8` | background (Papier) |

**One brand colour, no second accent.** Grey carries the current state and the
break, petrol the fix and the closed gap.

Splitting `--petrol` from `--petrol-deep` is not a matter of taste: the logo
petrol reaches 3.6:1 on paper and therefore carries only areas, graphics and
large type. Body text and small labels use the deep petrol (5.5:1 on paper,
white on it 6.3:1).

The signet and the wordmark are copies from `pilanda_theme/public/logo/`.
**That is the source** — a logo change belongs there, not here.

Typeface: IBM Plex Sans and IBM Plex Mono (SIL Open Font License), **served
from this server**, Arial as the fallback. Loading them from Google would hand
every visitor's IP address to a company in the United States - on a site with
no cookies, no scripts, no forms and no analytics that was the only thing left
that would have to be declared, and the only one that is avoidable. Latin
subset only: the site is German, and the umlauts are in latin. That governs marketing; the interfaces of the Pilanda software
run on Noto Sans (decision 2026-10-05).

The site is deliberately **light only** — a sales presence should look the
same on every machine, even when the operating system is set to dark.

## Accessibility

Reviewed against the UCT standard criteria (`schwarz-informatik/usability`).
What the review changed:

- The process line in the header exposes its stations as an ordered list;
  only the dots and bars are `aria-hidden`.
- Every page starts with a skip link to the content, visible on focus.
- The current page carries `aria-current="page"` and a visible marker.
- English terms inside the German prose carry `lang="en"`.

Still open: there is no clickable contact (`mailto:`, `tel:`) because the
contact details are placeholders.

## Publishing

`.github/workflows/pages.yml` publishes every state of `main` to GitHub Pages.
Before that, the run checks that every link points at a file that exists — a
dead link to the signet would otherwise only surface at the customer.

The site runs at **https://pilanda.systems**.

### Custom domain

`pilanda.systems` resolves to the four GitHub Pages addresses
(`185.199.108-111.153`) and is configured in the Pages service. The `CNAME`
file at the repository root holds the domain so a deployment cannot drop it —
GitHub writes that file itself when the domain is set in the UI.

Two things worth knowing if this ever has to be undone:

- An empty string does not clear the domain over the API; it takes
  `{"cname": null}`.
- While a custom domain is configured, GitHub serves the site **there only**.
  `pilanda-systems.github.io/homepage/` answers with a 301 to the domain, so
  if DNS does not point at GitHub, the site is unreachable even though every
  deployment succeeded.

## Still open

- Contact details are placeholders: `[E-Mail-Adresse]`, `[Telefonnummer]`,
  `[Firmenanschrift]`
- **Imprint and privacy notice exist but are incomplete.** The company is not
  founded yet, so the operator is a natural person for now and every field in
  square brackets has to be filled in. An incomplete imprint is an
  administrative offence under § 26 ECG in Austria. Both pages carry
  `noindex` and say so at the top; they are a template with the right
  structure, not legal advice.
- **No prices on the site.** Tiers and figures were taken off again. They
  live in the offer sheet handed over in person and calculated on the
  customer's own seat count, not on a page anyone can read without
  context. Anything with AI stays an add-on there, never part of a tier.
- The brand concept's core question (consultancy with tools, or software house
  with consultancy) is undecided. Whether the plant-engineering page stays as it is
  hangs on it — the concept considers that in need of explanation.

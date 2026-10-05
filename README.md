# Pilanda Systems — website

Static HTML, no build, no generator. What is in the repository is exactly
what gets served.

**Language rule:** code, comments and documentation in English; every string a
visitor reads is German.

```
index.html        company page (services, know-how, products, process, contact)
anlagenbau.html   Pilanda ERP — the industry solution
kontor.html       Kontor — inventory management
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

Typeface: IBM Plex Sans and IBM Plex Mono (SIL Open Font License), Arial as
the fallback. That governs marketing; the interfaces of the Pilanda software
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

The site runs at **https://pilanda-systems.github.io/homepage/**.

### Custom domain

`pilanda.systems` is registered but points at the registrar's parking page in
DNS. While the domain is configured in the Pages service, GitHub serves the
site **there only** — and there it does not arrive. It is therefore not
configured for now.

Switching over once DNS is ready:

1. At the registrar, set four A records for `pilanda.systems`:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   (for `www` a CNAME to `pilanda-systems.github.io` instead).
2. Wait until `nslookup pilanda.systems` returns those addresses.
3. Add a `CNAME` file containing `pilanda.systems` at the repository root and
   push.
4. Enter the domain under Pages in the repository settings and tick **Enforce
   HTTPS** once the certificate has been issued.

Note: an empty string does not clear the domain over the API — it takes
`{"cname": null}`.

## Still open

- Contact details are placeholders: `[E-Mail-Adresse]`, `[Telefonnummer]`,
  `[Firmenanschrift]`
- Imprint and privacy policy are linked in the footer but have no pages
- Prices are missing
- The brand concept's core question (consultancy with tools, or software house
  with consultancy) is undecided. Whether "Pilanda ERP" stays a product of its
  own hangs on it — the concept considers that in need of explanation.

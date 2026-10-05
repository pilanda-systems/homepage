# Pilanda Systems — Webpräsenz

Statisches HTML, kein Build, kein Generator. Was im Repository liegt, ist
genau das, was ausgeliefert wird.

```
index.html        Firmenseite (Leistungen, Know-how, Produkte, Ablauf, Kontakt)
anlagenbau.html   Pilanda ERP — die Branchenlösung
kontor.html       Kontor — Warenwirtschaft
styles.css        Gestaltung, alle Farben als Token auf :root
pilanda-*.svg     Signet und Wortmarke
```

Lokal ansehen: Datei im Browser öffnen, oder

```bash
python -m http.server 8080
```

## Gestaltung

Grundlage ist das **Markenkonzept Corporate Identity und Corporate Design,
Entwurf v0.2 vom 05.10.2026**. Die Farben stehen als Token auf `:root` in
`styles.css` — sie werden dort geändert, nicht in den Seiten.

| Token | Wert | Rolle |
|---|---|---|
| `--petrol` | `#008B8A` | Signet, Flächen, Grafik, große Schrift |
| `--petrol-deep` | `#006B6A` | Lauftext, Links, Knopfbeschriftung |
| `--fg` | `#1E2328` | Fließtext, Headlines (Graphit) |
| `--line-strong` | `#8A9099` | Linien, Ist-Zustand (Blechgrau) |
| `--bg` | `#F2EFE8` | Hintergrund (Papier) |

**Eine Markenfarbe, kein zweiter Akzent.** Grau steht für den Ist-Zustand und
den Bruch, Petrol für die Lösung und die geschlossene Lücke.

Die Trennung zwischen `--petrol` und `--petrol-deep` ist keine Geschmacksfrage:
das Logo-Petrol erreicht auf Papier 3,6:1 und trägt deshalb nur Flächen,
Grafik und große Schrift. Lauftext und kleine Beschriftungen stehen in Petrol
tief (5,5:1 auf Papier, Weiß darauf 6,3:1).

Das Signet und die Wortmarke sind Kopien aus `pilanda_theme/public/logo/`.
**Dort ist die Quelle** — ein Logowechsel gehört dorthin, nicht hierher.

Schrift: IBM Plex Sans und IBM Plex Mono (SIL Open Font License), Arial als
Fallback. Das gilt für das Marketing; die Oberflächen der Pilanda-Software
tragen Noto Sans (Entscheid 05.10.2026).

Die Seite ist bewusst **nur hell** — ein Verkaufsauftritt soll auf jedem
Rechner gleich aussehen, auch wenn das Betriebssystem auf dunkel steht.

## Veröffentlichung

`.github/workflows/pages.yml` veröffentlicht jeden Stand von `main` auf
GitHub Pages. Vorher prüft der Lauf, ob jeder Verweis auf eine Datei zeigt,
die es gibt — ein toter Link auf das Signet fällt sonst erst beim Kunden auf.

Die Seite läuft unter **https://pilanda-systems.github.io/homepage/**.

### Eigene Domain

`pilanda.systems` ist registriert, zeigt im DNS aber auf eine Parkseite des
Registrars. Solange die Domain im Pages-Dienst eingetragen ist, liefert GitHub
die Seite **ausschließlich dort** aus — und dort kommt sie nicht an. Sie ist
deshalb vorerst nicht eingetragen.

Umstellen, wenn das DNS bereit ist:

1. Beim Registrar vier A-Records für `pilanda.systems` setzen:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   (für `www` stattdessen ein CNAME auf `pilanda-systems.github.io`).
2. Warten, bis `nslookup pilanda.systems` diese Adressen zeigt.
3. Datei `CNAME` mit dem Inhalt `pilanda.systems` im Repository-Wurzelverzeichnis
   anlegen und pushen.
4. In den Repository-Einstellungen unter Pages die Domain eintragen und
   **Enforce HTTPS** anhaken, sobald das Zertifikat ausgestellt ist.

## Noch offen

- Kontaktdaten sind Platzhalter: `[E-Mail-Adresse]`, `[Telefonnummer]`,
  `[Firmenanschrift]`
- Impressum und Datenschutz sind im Fuß verlinkt, aber es gibt keine Seiten
- Preise fehlen
- Die Kernfrage des Markenkonzepts (Beratung mit Werkzeugen oder Softwarehaus
  mit Beratung) ist offen. Davon hängt ab, ob „Pilanda ERP" weiter als
  eigenes Produkt geführt wird — das Konzept hält das für erklärungsbedürftig.

#!/usr/bin/env node
// Builds the public site from a DISPOSABLE checkout of pilanda-systems-web.
//
//   node scripts/build-site.mjs <web-checkout> <output-dir>
//
// The web app is a server-rendered app; GitHub Pages only serves files. This
// script adapts the checkout for that, builds it, renders every public page
// once and writes the result to <output-dir>.
//
// Every edit below is an exact match that throws when the text is gone. A
// change in the web app therefore stops the run and the live site stays on its
// last good state, instead of silently publishing something unadapted. The
// privacy notice matters most here: it must never name the wrong host.

import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const [webArg, outArg] = process.argv.slice(2);
if (!webArg || !outArg) throw new Error("usage: build-site.mjs <web-checkout> <output-dir>");
const web = resolve(webArg);
const out = resolve(outArg);
const inWeb = (...parts) => join(web, ...parts);

// Public pages. Everything else in the web app stays out of the bundle.
const PAGES = {
  "/": "index.html",
  "/projektplan": "projektplan.html",
  "/impressum": "impressum.html",
  "/datenschutz": "datenschutz.html",
  "/agb": "agb.html",
};

// What stays. These are allow lists on purpose: the web app keeps gaining
// internal pages, and a new one must stay out without anyone listing it here.
const KEPT_ROUTES = ["__root.tsx", "index.tsx", "projektplan.tsx", "impressum.tsx", "datenschutz.tsx", "agb.tsx"];
const KEPT_PUBLIC = ["favicon.svg", "robots.txt", "wartung.html"];

// Must not reach the public output, whatever happens upstream.
const FORBIDDEN_FILE = /visitenkarte|briefpapier|corporate-design|praesentation|bot-wissen|faq-wissen|stempel|google-unternehmensprofil/i;
// Visitor data stays with Microsoft: nothing of these vendors may ship, not even
// dead code. This also catches their keys.
const FORBIDDEN_TEXT = /lovable|gptengineer|gpt-eng|supabase|sb_secret_/i;
// The chat does not ship, so no page may promise it or describe its processing.
const FORBIDDEN_PAGE_TEXT = /Pi[·-]Chat/;
const LEGAL_PAGES = ["impressum.html", "datenschutz.html", "agb.html"];

const read = (file) => readFileSync(inWeb(file), "utf8").replace(/\r\n/g, "\n");

function edit(file, replacements) {
  let text = read(file);
  for (const [from, to] of replacements) {
    if (!text.includes(from)) throw new Error(`${file}: expected text is gone, adapt this script: ${from.slice(0, 70)}`);
    text = text.replace(from, () => to);
  }
  writeFileSync(inWeb(file), text);
}

// contact-mail/ in this repository, running on Azure Container Apps.
const CONTACT_MAIL_URL = "https://contact-mail.salmonfield-383fadcf.germanywestcentral.azurecontainerapps.io/inquiry";

const DIRECT_SUBMIT = `import type { Inquiry } from "./inquiry";

export async function submitInquiryDirect({ data }: { data: Inquiry }) {
  const reference = crypto.randomUUID();
  const response = await fetch("${CONTACT_MAIL_URL}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, reference }),
  });
  if (!response.ok) throw new Error("Inquiry not delivered");
  return { reference };
}
`;

function keepOnly(dir, kept) {
  for (const name of kept) {
    if (!existsSync(inWeb(dir, name))) throw new Error(`${dir}/${name}: expected path is gone, adapt this script`);
  }
  for (const name of readdirSync(inWeb(dir))) {
    if (!kept.includes(name)) rmSync(inWeb(dir, name), { recursive: true });
  }
}

function adaptForStaticHosting() {
  keepOnly("src/routes", KEPT_ROUTES);
  keepOnly("public", KEPT_PUBLIC);

  // Square brackets mark answers the team has not confirmed yet. The Pi-FAQ is
  // public, so those stay out until they are filled in upstream.
  const faq = read("src/lib/faq.ts")
    .split("\n")
    .filter((line) => !(/^\s*\{ id: "/.test(line) && line.includes("[")))
    .join("\n");
  if (/"[^"\n]*\[[^"\n]*"/.test(faq)) throw new Error("src/lib/faq.ts: open placeholder left, adapt this script");
  writeFileSync(inWeb("src/lib/faq.ts"), faq);

  // No visitor data goes to Lovable or its Supabase database. Removing the
  // integration outright makes any remaining import fail the build, and without
  // .env no key can be baked into the bundle.
  rmSync(inWeb("src/integrations"), { recursive: true });
  rmSync(inWeb(".env"), { force: true });
  edit("src/start.ts", [
    ['import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";\n', ""],
    ["  functionMiddleware: [attachSupabaseAuth],\n", ""],
  ]);
  writeFileSync(
    inWeb("src/lib/lovable-error-reporting.ts"),
    "export function reportLovableError(_error: unknown, _context: Record<string, unknown> = {}) {}\n",
  );

  // The form posts to the mail service, which is the only copy of an inquiry.
  // A failure therefore has to show: the form then offers the mail address.
  writeFileSync(inWeb("src/lib/contact.static.ts"), DIRECT_SUBMIT);
  edit("src/components/home/use-inquiry.ts", [
    ['import { useServerFn } from "@tanstack/react-start";\n', ""],
    ['import { submitInquiry } from "@/lib/contact.functions";', 'import { submitInquiryDirect } from "@/lib/contact.static";'],
    ["const submit = useServerFn(submitInquiry);", "const submit = submitInquiryDirect;"],
  ]);
  edit("src/components/projektplan/phase-plan.tsx", [
    ["Keine automatische\n              E-Mail.", "Keine automatische\n              Bestätigungs-E-Mail."],
  ]);

  // The privacy notice has to name the real providers of this site: GitHub
  // Pages hosts it, Microsoft carries and keeps the inquiries.
  // Wording taken from the privacy notice this repository already published.
  edit("src/lib/pilanda-legal.ts", [
    [
      "Formularangaben werden direkt per E-Mail an das Pilanda Office weitergeleitet",
      "Formularangaben werden über Microsoft Azure per E-Mail an das Pilanda Office weitergeleitet",
    ],
    [
      "Beim Aufruf der Website verarbeitet unser Hosting-Anbieter Microsoft Azure (Microsoft Ireland Operations Limited) technisch notwendige Zugriffsdaten (IP-Adresse, Datum, Uhrzeit, aufgerufene Seite) für den sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Sie werden nach spätestens 30 Tagen gelöscht.",
      "Die Seite wird über GitHub Pages ausgeliefert, betrieben von GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA, einem Unternehmen der Microsoft Corporation. Beim Aufruf der Website verarbeitet GitHub technisch notwendige Zugriffsdaten (IP-Adresse, Datum, Uhrzeit, aufgerufene Seite) für den sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Es findet eine Übermittlung in die Vereinigten Staaten statt. Sie stützt sich auf die Standardvertragsklauseln der Europäischen Kommission sowie auf die Zertifizierung unter dem EU-US Data Privacy Framework.",
    ],
  ]);
  // Published as final by decision of Dominik Boeckle, 06.11.2026: no draft
  // wording on any legal page, and the imprint carries a phone number.
  edit("src/routes/datenschutz.tsx", [
    ["Website, Projektanfragen, E-Mail und Pi-FAQ. Rechtsentwurf mit offenen Angaben.", "Website, Projektanfragen, E-Mail und Pi-FAQ."],
    ["zu Website, Kontakt und Pi-FAQ. Rechtsentwurf mit offenen Angaben.", "zu Website, Kontakt und Pi-FAQ."],
  ]);
  edit("src/routes/agb.tsx", [
    ["Entwurf der Allgemeinen Geschäftsbedingungen von", "Allgemeine Geschäftsbedingungen von"],
    ["AGB-Entwurf für die Leistungen", "AGB für die Leistungen"],
  ]);
  edit("src/lib/pilanda-legal.ts", [
    ["body: `E-Mail · ${companyContact.email}`,", "body: `E-Mail · ${companyContact.email}\\nTelefon · 0670 401 30 33`,"],
  ]);
  edit("src/components/home/legal-page.tsx", [
    [
      `        <p className="mt-6 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
          Entwurf. Fehlende Firmendaten und offene rechtliche Angaben sind vor Veröffentlichung zu ergänzen und zu prüfen.
        </p>
`,
      "",
    ],
  ]);
}

function build() {
  const result = spawnSync("bun", ["run", "build"], {
    cwd: web,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, NITRO_PRESET: "node_server", NODE_ENV: "production" },
  });
  if (result.status !== 0) throw new Error("build failed");
}

async function render() {
  const port = "3997";
  const base = `http://127.0.0.1:${port}`;
  const server = spawn("node", [".output/server/index.mjs"], {
    cwd: web,
    stdio: "ignore",
    env: { ...process.env, PORT: port, HOST: "127.0.0.1", NODE_ENV: "production" },
  });
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await fetch(`${base}/robots.txt`);
        break;
      } catch (error) {
        if (attempt > 80) throw error;
        await new Promise((done) => setTimeout(done, 250));
      }
    }
    const pages = {};
    for (const [path, file] of Object.entries(PAGES)) {
      const response = await fetch(base + path);
      if (response.status !== 200) throw new Error(`${path} answered ${response.status}`);
      pages[file] = await response.text();
    }
    const missing = await fetch(`${base}/diese-seite-gibt-es-nicht`);
    if (missing.status !== 404) throw new Error(`unknown page answered ${missing.status}`);
    pages["404.html"] = await missing.text();
    return pages;
  } finally {
    server.kill();
  }
}

function filesBelow(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

function publish(pages) {
  // signature/ is not generated: mail signatures in the wild load it by URL.
  mkdirSync(out, { recursive: true });
  for (const name of readdirSync(out)) if (name !== "signature") rmSync(join(out, name), { recursive: true });
  cpSync(inWeb(".output/public"), out, { recursive: true });
  for (const [file, html] of Object.entries(pages)) {
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), html);
  }
  for (const file of filesBelow(out)) {
    if (FORBIDDEN_FILE.test(file.slice(out.length))) throw new Error(`forbidden file in output: ${file}`);
    if (/\.(html|js|css|txt)$/.test(file) && FORBIDDEN_TEXT.test(readFileSync(file, "utf8")))
      throw new Error(`secret marker in ${file}`);
  }
  for (const [file, html] of Object.entries(pages)) {
    if (FORBIDDEN_PAGE_TEXT.test(html)) throw new Error(`${file} still mentions the chat, adapt this script`);
    if (LEGAL_PAGES.includes(file) && /entwurf/i.test(html)) throw new Error(`${file} is marked as a draft, adapt this script`);
  }
}

adaptForStaticHosting();
build();
publish(await render());
console.log(`site written to ${out}`);

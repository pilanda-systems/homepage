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

// Brand and print material, and the routes that need a server.
const REMOVED = [
  "src/routes/bot-wissen.tsx",
  "src/routes/briefpapier.tsx",
  "src/routes/corporate-design-expose.tsx",
  "src/routes/corporate-design.tsx",
  "src/routes/email-signatur.tsx",
  "src/routes/powerpoint.tsx",
  "src/routes/social-media.tsx",
  "src/routes/visitenkarten.tsx",
  "src/routes/api",
  "public/downloads",
  "public/logo",
  "public/stempel",
];

// Must not reach the public output, whatever happens upstream.
const FORBIDDEN_FILE = /visitenkarte|briefpapier|corporate-design|praesentation|bot-wissen|stempel/i;
// An actual key, not the bare prefix: the Supabase client checks for that.
const FORBIDDEN_TEXT = /sb_secret_[A-Za-z0-9_-]{20,}|SUPABASE_SERVICE_ROLE_KEY=/;

const read = (file) => readFileSync(inWeb(file), "utf8").replace(/\r\n/g, "\n");

function edit(file, replacements) {
  let text = read(file);
  for (const [from, to] of replacements) {
    if (!text.includes(from)) throw new Error(`${file}: expected text is gone, adapt this script: ${from.slice(0, 70)}`);
    text = text.replace(from, () => to);
  }
  writeFileSync(inWeb(file), text);
}

const DIRECT_SUBMIT = `import { createClient } from "@supabase/supabase-js";
import type { Inquiry } from "./inquiry";
import { persistInquiry } from "./inquiry-persistence";

export async function submitInquiryDirect({ data }: { data: Inquiry }) {
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
  const url = import.meta.env["VITE_SUPABASE_URL"] as string;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === \`Bearer \${key}\`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  return persistInquiry(
    data,
    crypto.randomUUID(),
    (row) => client.from("contact_inquiries").insert(row),
    (details) => console.error("Inquiry persistence failed", details),
  );
}
`;

function adaptForStaticHosting() {
  for (const path of REMOVED) {
    if (!existsSync(inWeb(path))) throw new Error(`${path}: expected path is gone, adapt this script`);
    rmSync(inWeb(path), { recursive: true });
  }

  // Pi-Chat needs a server, so it does not ship at all.
  writeFileSync(
    inWeb("src/components/pi-bot.tsx"),
    "export function PiBot(_props: Record<string, unknown>) {\n  return null;\n}\n",
  );

  // The form writes straight to the table. Visitors hold the same insert-only
  // grant the server function used: no read access, database checks stay on.
  writeFileSync(inWeb("src/lib/contact.static.ts"), DIRECT_SUBMIT);
  edit("src/components/home/use-inquiry.ts", [
    ['import { useServerFn } from "@tanstack/react-start";\n', ""],
    ['import { submitInquiry } from "@/lib/contact.functions";', 'import { submitInquiryDirect } from "@/lib/contact.static";'],
    ["const submit = useServerFn(submitInquiry);", "const submit = submitInquiryDirect;"],
  ]);

  // The privacy notice has to describe this hosting, not the Lovable one.
  // Wording taken from the privacy notice this repository already published.
  edit("src/lib/pilanda-legal.ts", [
    [
      "Gespeichert werden sie bei unserem Hosting- und Datenbankanbieter Lovable (Lovable Labs Incorporated) als Auftragsverarbeiter.",
      "Gespeichert werden sie bei unserem Datenbankanbieter Lovable (Lovable Labs Incorporated) als Auftragsverarbeiter.",
    ],
    [
      "Beim Aufruf der Website verarbeitet unser Hosting-Anbieter Lovable (Lovable Labs Incorporated) technisch notwendige Zugriffsdaten (IP-Adresse, Datum, Uhrzeit, aufgerufene Seite) auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb).",
      "Die Seite wird über GitHub Pages ausgeliefert, betrieben von GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA, einem Unternehmen der Microsoft Corporation. Beim Aufruf der Website verarbeitet GitHub technisch notwendige Zugriffsdaten (IP-Adresse, Datum, Uhrzeit, aufgerufene Seite) auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb). Es findet eine Übermittlung in die Vereinigten Staaten statt. Sie stützt sich auf die Standardvertragsklauseln der Europäischen Kommission sowie auf die Zertifizierung unter dem EU-US Data Privacy Framework.",
    ],
    [
      " Der Pi·Chat-Verlauf wird nur auf ausdrücklichen Wunsch über die Auswahl 'Gespräch auf diesem Gerät behalten' lokal im Browser gespeichert. Die Auswahl kann jederzeit deaktiviert werden; 'Neues Gespräch' löscht den bisherigen lokalen Verlauf. Ohne diese Auswahl bleibt der Verlauf nur bis zum Neuladen erhalten.",
      "",
    ],
  ]);
  const legal = read("src/lib/pilanda-legal.ts");
  const chat = legal.match(/ *\{\n *heading: "Pi·Chat und KI-Verarbeitung",\n *body: ".*",\n *\},\n/);
  if (!chat) throw new Error("src/lib/pilanda-legal.ts: Pi-Chat section is gone, adapt this script");
  writeFileSync(inWeb("src/lib/pilanda-legal.ts"), legal.replace(chat[0], ""));
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

function dotenv() {
  const values = {};
  for (const line of read(".env").split("\n")) {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

async function render() {
  const port = "3997";
  const base = `http://127.0.0.1:${port}`;
  const server = spawn("node", [".output/server/index.mjs"], {
    cwd: web,
    stdio: "ignore",
    env: { ...process.env, ...dotenv(), PORT: port, HOST: "127.0.0.1", NODE_ENV: "production" },
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
}

adaptForStaticHosting();
build();
publish(await render());
console.log(`site written to ${out}`);

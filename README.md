# Pilanda Systems — website

The public site at pilanda.systems. `site/` is generated: what is in that
folder is exactly what gets served. Do not edit it by hand, the next sync
replaces it.

**Language rule:** code, comments and documentation in English; every string a
visitor reads is German.

**Where the content comes from.** Content and design are made in the private
repository `pilanda-systems-web` (Lovable). Every night `sync-web.yml` rebuilds
its public pages as static files and commits them here, which publishes them.
Nothing happens when the web app has not changed.

```
.github/workflows/sync-web.yml  nightly build from pilanda-systems-web
.github/workflows/pages.yml     checks links, publishes site/
.github/workflows/contact-mail.yml  builds and scans the mail service
contact-mail/                   mails inquiries, runs on Azure Container Apps
scripts/build-site.mjs          adapts the web app for static hosting, builds it
site/                           the generated site
site/signature/                 the logo mail signatures load by URL, not generated
source-commit.txt               the web app commit site/ was built from
CNAME                           the custom domain
```

**What differs from the web app.** `scripts/build-site.mjs` applies this to a
throwaway checkout, never to the web app itself:

- Only `/`, `/projektplan`, `/impressum`, `/datenschutz` and `/agb` are
  published. Brand and print material stays out of the bundle.
- Pi-Chat is removed, because it needs a server.
- The contact form posts to `contact-mail/` on Azure, which mails
  info@pilanda.systems. That mail is the only copy of an inquiry.
- Nothing of Lovable or Supabase ships. The build stops if either shows up in
  the output.
- The privacy notice names GitHub Pages as host and Microsoft for inquiries,
  and drops the Pi-Chat parts.

Each edit is an exact text match. When the web app changes one of these places
the nightly run fails and the live site stays as it is, until the script is
adapted. A failed run is the signal to look at the script, not to retry.

**Keeping it running.** The sync needs the secret `WEB_REPO_TOKEN`: a
fine-grained token with read access to the contents of `pilanda-systems-web`,
nothing else. GitHub suspends scheduled workflows after 60 days without
activity in the repository; re-enable the workflow if that happens.

**The mail service.** `contact-mail/` runs as the container app `contact-mail`
in the Azure resource group `rg-pilanda-homepage`. The image lives in the private
registry `pilandahomepage`, not on ghcr.io, so it does not have to be public. The
app pulls it and sends mail with its managed identity, so no secret is stored.
An access policy in Exchange limits it to the info mailbox. To deploy a change:

```bash
az acr build -r pilandahomepage -t contact-mail:<commit> contact-mail
az containerapp update -n contact-mail -g rg-pilanda-homepage --image pilandahomepage.azurecr.io/contact-mail:<commit>
```

Run a sync by hand under Actions, or build locally:

```bash
git clone <pilanda-systems-web> /tmp/web
(cd /tmp/web && bun install --frozen-lockfile --ignore-scripts)
node scripts/build-site.mjs /tmp/web site
```

Use a throwaway clone: the script changes the checkout it builds.

The former holding page and the older static pages are in the history, last at
`b920554`.

# Deploying DevForge to Render

One web service (the API and the web app, built from the `Dockerfile`) and one
Postgres database, both described in [`render.yaml`](../render.yaml). Every
commit that reaches `main` and passes CI is deployed automatically.

Menu names in the Render dashboard change from time to time. If a label below
does not match, look for the closest one.

## One-time setup (about 15 minutes)

1. **Make sure `main` is green.** The Actions tab should show the
   latest run on `main` passing.
2. **Create a Render account** and connect it to your GitHub account. Only the
   `Devforge` repository needs access.
3. **Create the Blueprint.** In the dashboard choose **New > Blueprint**, pick
   the `Devforge` repository and the `main` branch, and apply it. Render reads
   `render.yaml` and creates the database and the web service.
4. **Wait for the first deploy.** The first build takes several minutes. In the
   service's **Logs** you should see, in this order:
   - `Applying database migrations before starting the API.`
   - `All migrations have been successfully applied.`
   - `Server listening at ...`

   If it stops after the migration step with `Not starting the API`, the
   migration failed: the message above it says why, and the previous version
   (if any) keeps serving.
5. **`TRUST_PROXY` is already set** in `render.yaml` to the value measured on
   the first deploy (below). Only repeat the measurement if Render changes how
   many proxies sit in front of services.

## Check that it works

From any machine with Node 24, with the URL Render shows at the top of the
service page:

```powershell
node apps/api/scripts/smoke.mjs https://YOUR-SERVICE.onrender.com --web
```

It only reads: `/health`, `/ready`, the page, a script and its cache header, a
client-side route, and the two 404 cases. It does not create users, so it is
safe against the live database. A free service that has gone to sleep needs
about a minute to wake, so add `--wait=120` if the first run times out.

## Calibrate `TRUST_PROXY`

Render does not document how many proxies sit in front of a service, so measure
it once. Getting it wrong in either direction is bad: too low and every visitor
shares one rate-limit bucket, too high and a client can choose its own bucket by
sending a forged `X-Forwarded-For` header.

This is the procedure used on the first deploy. To repeat it, first add
`LOG_CLIENT_ADDRESS` with the value `true` on the service's **Environment**
page, which makes the log show the two fields in step 3. Remove it afterwards:
addresses are personal data.

1. Find your public IP address (search "what is my IP").
2. Send one request with a forged header:

   ```powershell
   curl.exe -H "X-Forwarded-For: 203.0.113.99" https://YOUR-SERVICE.onrender.com/health
   ```

3. In the service's **Logs**, find the matching `Request completed` line. It
   has two extra fields, `ip` and `forwardedFor`. `forwardedFor` reads like
   `203.0.113.99, <your IP>` possibly followed by more addresses.
4. Count the addresses **after** your own IP and add one. That is the number of
   proxies in front of the service, and it is the value for `TRUST_PROXY`:
   - `203.0.113.99, <your IP>` gives `1`
   - `203.0.113.99, <your IP>, <another address>` gives `2`
5. Set `TRUST_PROXY` to that number (in `render.yaml`, via a pull request, so
   the file stays the source of truth). Render redeploys after the merge.
6. Repeat step 2. The logged `ip` must now be **your own address**, not
   `203.0.113.99`. If it is the forged one, the number is too high: lower it.
   Then remove `LOG_CLIENT_ADDRESS` from the service.

If you cannot tell which address is yours, stop and ask rather than guess.

### Measured on the first deploy (2026-11-25): `TRUST_PROXY=3`

A request with a forged header arrived with `forwardedFor` of
`<forged>, <client>, <Cloudflare address>, <Render internal address>`, and the
socket peer (`ip` with trust off) was `127.0.0.1`. That is three proxies, so
`render.yaml` sets `TRUST_PROXY` to `3`. Plain requests showed the same shape,
which is how the client address was told apart from the forged one.
`trust-proxy-render.test.ts` pins this chain, including what a count that is
too low or too high would do.

Re-measure if the logged `ip` of a normal request stops being the visitor's own
address. That would mean Render changed the number of proxies in front of
services. Too low is the quieter failure: everyone shares one rate-limit bucket.
Too high is the dangerous one: a caller can choose its own.

The value was checked on the live service the same day: with a forged
`X-Forwarded-For`, the logged `ip` was the caller's real address and the forged
one was ignored. `LOG_CLIENT_ADDRESS` was then removed from `render.yaml`, so
client addresses are no longer logged. Set it temporarily (in the Render
dashboard) if you ever need to re-measure.

## Things to know about the free plans

- **The free database is deleted 30 days after it is created** (with a 14 day
  grace period). Note the date in your calendar. Before anything you want to
  keep, upgrade the database's plan in the dashboard. There are no backups on
  the free plan.
- **The free web service sleeps after 15 minutes without traffic** and takes
  about a minute to wake. The first visit after a quiet spell is slow.
- **Free instance hours are limited** per month across all free services. If
  they run out, free services are suspended until the next month.

## Writing migrations that are safe to deploy

During a deploy the new version starts, runs its migrations, and only then does
Render stop the old one, about a minute later. For that minute the old code runs
against the new schema. So a migration must work with the code that is already
running:

- Add tables, columns (nullable or with a default) and indexes first.
- Remove or rename a column in a later release, after no running code uses it.
- A failed migration stops the new version from starting; it does not undo the
  part that ran. Keep each migration small.

## What is deliberately not here yet

- **No custom domain or email.** The service is on a `.onrender.com` address.
- **No staging environment or approval step.** Stage 4 of the CI/CD plan.
- **The refresh token is still held in the browser's JavaScript.** An httpOnly
  cookie is planned and needs this same-origin setup, which now exists.

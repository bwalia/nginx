# F5 NGINX WAF — live before/after demo

A **runnable** demo (not a slideshow) that proves the value of a WAF in one
command. It stands up the *same* vulnerable app two ways:

- **Directly** on `:8081` — no protection. Attacks land on the code and succeed.
- **Behind F5 NGINX WAF** on `:8082` — the same attacks are blocked with `403`
  before they reach the app, while normal traffic passes untouched.

```
                                          ┌─────────────────────────┐
  curl attack ─────────────────────────▶ │  origin  :8081          │  ← NO WAF
                                          │  Acme Bank (vulnerable) │    EXPLOITED
                                          └─────────────────────────┘
                    ┌──────────────────┐  ┌─────────────────────────┐
  curl attack ────▶ │  WAF  :8082      │─▶│  origin  (internal)     │  ← WAF in front
                    │  NGINX + WAF      │  │  Acme Bank (vulnerable) │    BLOCKED (403)
                    └──────────────────┘  └─────────────────────────┘
                     403 before it ever reaches the app
```

## Run it

```bash
cd f5-nginx-waf-live-demo
docker compose up --build -d      # start origin (:8081) + WAF (:8082)
./run-demo.sh                     # fire the attacks, see before vs after
```

Expected result: **6/6 PASS** — every attack blocked by the WAF, every
legitimate request allowed.

```
  origin (no WAF)     HTTP 200  EXPLOITED -- attacker got data
  F5 NGINX WAF        HTTP 403  BLOCKED   -- never reached the app
  ...
  Result: 6/6 checks behaved correctly
  PASS -- WAF blocked every attack and allowed every legit request.
```

Tear down with `./stop.sh` (or `docker compose down`).

## The four attacks

The origin (`Acme Bank customer portal`) is deliberately vulnerable. Each
endpoint has a classic flaw the WAF is meant to stop:

| Attack | Endpoint | What the unprotected origin does |
|--------|----------|----------------------------------|
| **SQL injection** | `/products?cat=deposit' OR '1'='1` | Dumps the secret user table — password hashes + SSNs |
| **Reflected XSS** | `/search?q=<script>…</script>` | Echoes the script tag into the page unescaped |
| **Path traversal** | `/download?file=../../../../etc/passwd` | Reads and returns `/etc/passwd` |
| **Command injection** | `/ping?host=127.0.0.1;whoami` | Runs `whoami` on the server (returns `root`) |

See it for yourself against the **unprotected** origin:

```bash
# SQLi — leaks credentials the app should never expose
curl "http://localhost:8081/products?cat=deposit%27%20OR%20%271%27=%271"
#   admin / $2b$12$Q9s.KXo3...LEAKED... / SSN 412-90-1174

# Path traversal — reads a file outside the app
curl "http://localhost:8081/download?file=../../../../etc/passwd"
#   root:x:0:0:root:/root:/bin/bash ...
```

Now send the identical request **through the WAF** (`:8082`) and it returns
`403 Forbidden` — the request never reaches the app.

## What's doing the blocking

Out of the box the WAF layer runs the **OWASP Core Rule Set on
ModSecurity-NGINX** (`owasp/modsecurity-crs:nginx`) in anomaly-scoring blocking
mode. It's license-free, so this demo reproduces on any machine in seconds. The
blocks you see are real — inspect them:

```bash
docker compose logs waf | grep -i "Access denied\|Anomaly Score"
```

You'll see each attack matched (libinjection SQLi/XSS, LFI path-traversal, RCE
signatures) and the request interrupted once the inbound anomaly score crossed
the threshold.

> **A note on WAF tuning.** A bare `;id` command-injection payload slips through
> CRS at the default paranoia level — `id` is too short a token to flag without
> false positives. The demo uses `;whoami`, a realistic payload CRS catches. This
> is exactly the tuning tradeoff (coverage vs. false positives) you manage on a
> real WAF: raise `PARANOIA` in `docker-compose.yml` for broader coverage, or add
> targeted rules. Flip `MODSEC_RULE_ENGINE` to `DetectionOnly` to watch attacks
> get logged but pass through — useful when tuning a new policy against live
> traffic before you start blocking.

## Running it on the real F5 NGINX App Protect WAF v5

The topology, the attacks, and `run-demo.sh` are identical — only the
enforcement engine changes. To run the licensed **F5 NGINX App Protect WAF v5**
engine (SQLi/XSS/RCE/LFI signature sets, threat campaigns, Data Guard) instead
of CRS, see [`f5-app-protect/`](./f5-app-protect/). It needs an F5
subscription or free 30-day trial and ships the real declarative policy,
`nginx.conf`, and the three-container NAP v5 compose file.

## Files

```
f5-nginx-waf-live-demo/
├── docker-compose.yml     # origin (:8081) + WAF (:8082)
├── run-demo.sh            # the before/after test — this is the demo
├── stop.sh               # tear everything down
├── origin/               # the deliberately-vulnerable Acme Bank app (pure stdlib)
│   ├── app.py
│   └── Dockerfile
└── f5-app-protect/       # drop-in for the real F5 NGINX App Protect WAF v5
    ├── docker-compose.f5.yml
    ├── Dockerfile
    ├── nginx.conf
    ├── policies/acme_bank_policy.json
    └── README.md
```

⚠️ The origin app is **intentionally insecure** and runs inside an isolated
container for this demo only. Never expose it to a real network.

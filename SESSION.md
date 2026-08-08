# Session record — F5 NGINX WAF demo

_Last updated: 2026-08-08_

A log of what was built, the current live state, and how to resume or tear down.

## What was built

A live, **license-free** F5 NGINX WAF demo (`f5-nginx-waf-live-demo/`): a
deliberately-vulnerable "Acme Bank" origin app + a WAF (OWASP CRS on
ModSecurity-NGINX) in front, in three deployment shapes (local Docker, single
node, k3s). A comprehensive capability matrix proves each attack is exploitable
unprotected and blocked (403) by the WAF, while legit traffic passes (200).

The k3s deployment also publishes a **public before/after** — `payments…` (WAF,
blocks) vs `direct.payments…` (same app, no WAF, exploitable, basic-auth gated) —
and a **WAF console**: Loki + Grafana fed by a promtail sidecar on the WAF pod,
with a live-violations dashboard.

Capabilities demonstrated: SQLi, reflected XSS, command injection (RCE), PHP code
injection, path traversal (LFI), remote file inclusion, Log4Shell (JNDI), SSRF
(cloud metadata), bot/scanner signatures (sqlmap/nikto UA), HTTP method
enforcement (PUT/DELETE).

## Current live state

| Thing | State |
|-------|-------|
| **Local Docker** | `origin :8081`, `waf :8082` — running from this repo. `./run-demo.sh` → 17/17. |
| **Node (debian001, 192.168.1.140)** | `~/f5-waf-demo/` Docker compose; **WAF published on `:9080`**, origin internal, `SAFE_MODE=1`. `deploy/test-node.sh` → 16/16. |
| **k3s cluster `k3s1`** | Namespace `f5-waf-demo`: hardened origin + WAF pods, NetworkPolicy containment. Applied with `kubectl apply -k k8s/`. |
| **Ingress `payments.fictionally.org`** (AFTER) | Traefik → **in-cluster WAF pod** (`service waf:8080`) → in-cluster origin pod. Fully in-cluster, no node hop. Verified via WAF-pod logs. 16/16. |
| **Ingress `direct.payments.fictionally.org`** (BEFORE) | Traefik → **`origin-direct`** (2nd origin, **no WAF**), gated by Traefik basic-auth (`before-basic-auth`). Same app → attacks succeed (200). Creds: `demo` / see `before-basic-auth` Secret. DNS record not yet added. |
| **Public URL** | `https://payments.fictionally.org/` **live** via Cloudflare CNAME → `pop0.wslproxy.com` → wslproxy tunnel → Traefik. HTTPS attacks blocked 403, landing 200. Tunnel serves a **self-signed cert** (browser warning) — real cert not yet provisioned. |
| **WAF console (Grafana)** | `f5-waf-demo` ns: **Loki + Grafana + promtail sidecar** on the WAF pod. Audit JSON → file → promtail → Loki → dashboard *F5 NGINX WAF — Live Violations*. Access: `kubectl -n f5-waf-demo port-forward svc/grafana 3300:3000` → http://localhost:3300 (admin / `grafana-admin` Secret). |
| **kubeconfig** | `~/.kube/k3s1.yaml` (server `https://192.168.1.104:6443`). |
| **Git** | Branch `f5-nginx-waf-live-demo` merged to `main`; pushed to `origin/main`. |

### How to reach the demos
- Local: `http://localhost:8081` (raw) vs `http://localhost:8082` (WAF)
- Node WAF: `http://192.168.1.140:9080/`
- Ingress AFTER (public): `https://payments.fictionally.org/` (self-signed cert — use `curl -k`)
- Ingress BEFORE (internal): `curl -u demo:<pw> -H 'Host: direct.payments.fictionally.org' http://192.168.1.104/...`
- Ingress AFTER (internal): `curl -H 'Host: payments.fictionally.org' http://192.168.1.104/`
- WAF console: `kubectl -n f5-waf-demo port-forward svc/grafana 3300:3000` → http://localhost:3300

## Key findings / decisions

- **No F5 license available** anywhere (node or local) — no `nginx-repo.crt/key`,
  no JWT, no `private-registry.nginx.com` auth. So the demo uses the license-free
  OWASP CRS engine. Real F5 App Protect drop-in is in `f5-app-protect/` for when
  a trial JWT is available.
- **`SAFE_MODE`** (`origin/app.py`): simulates the file-read / command-injection
  outcomes instead of really executing them. OFF for local Docker (real exploit),
  ON for node + k8s (shared infra). SQLi/XSS/JNDI/SSRF/RFI/code-injection are
  reflect-only and always safe.
- **Traefik normalizes a literal `;`** away before the WAF sees it. Ingress tests
  use an encoded semicolon (`%3B`) for command injection, as real attackers do.
- **CRS PL1 coverage:** a bare `;id` token and `{{7*7}}` SSTI are NOT blocked at
  paranoia level 1; raising `PARANOIA` widens coverage with more false positives.
  Test payloads are chosen to block at PL1.
- **DNS:** the cluster's external-dns is filtered to `diytaxreturn.co.uk`, so it
  will NOT auto-create `payments.fictionally.org`. `*.fictionally.org` are manual
  Cloudflare CNAMEs → `pop0.wslproxy.com` (no wildcard). The `payments` record was
  added manually and now resolves.
- **wslproxy tunnel:** `pop0.wslproxy.com` (18.133.126.242) 301-redirects all HTTP
  → HTTPS (normal), then tunnels HTTPS into the cluster's Traefik, which routes
  `payments.fictionally.org` to the in-cluster WAF pod. Verified by a marked probe
  landing in the WAF-pod logs. Tunnel presents a self-signed default cert.

## Outstanding / next steps

- [x] Add Cloudflare record `payments.fictionally.org CNAME pop0.wslproxy.com` —
      done; `https://payments.fictionally.org/` is live and WAF-protected.
- [x] Repoint ingress from node WAF to the in-cluster WAF pod — done (`waf:8080`).
- [x] `git push` `main` to origin — done; in sync at latest commit.
- [ ] Add Cloudflare record `direct.payments.fictionally.org CNAME pop0.wslproxy.com`
      (DNS-only) to reach the gated "before WAF" host publicly.
- [ ] Provision a real TLS cert for `payments.fictionally.org` (tunnel currently
      serves a self-signed cert, so browsers warn).
- [ ] (Security) The `origin` remote URL embeds a GitHub PAT — rewrite to a
      token-free URL + a credential helper, and rotate the token.
- [ ] (Optional) Swap in real F5 NGINX App Protect WAF v5 once an F5 trial JWT is
      available — see `f5-nginx-waf-live-demo/f5-app-protect/README.md`.

## Teardown

```bash
# Local
cd f5-nginx-waf-live-demo && ./stop.sh
# Node
ssh bwalia@192.168.1.140 'cd ~/f5-waf-demo && docker compose -f node-demo.compose.yml down'
# k3s
export KUBECONFIG=~/.kube/k3s1.yaml && kubectl delete -k f5-nginx-waf-live-demo/k8s/
```

## Verification commands

```bash
cd f5-nginx-waf-live-demo
./run-demo.sh                                                   # local, 17/17
BASE=http://192.168.1.140:9080 ./deploy/test-node.sh           # node, 16/16
BASE=http://192.168.1.104 HOSTHDR=payments.fictionally.org \
  ./k8s/test-ingress.sh                                        # ingress->node, 16/16
```

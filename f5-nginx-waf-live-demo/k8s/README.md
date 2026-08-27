# Kubernetes deployment (k3s) — WAF-protected app behind an ingress

Deploys the demo into a k3s cluster: the deliberately-vulnerable origin runs
locked-down and **unexposed**, the WAF sits in front, and a Traefik ingress
publishes `payments.fictionally.org` → WAF → origin.

By default the ingress routes to the **in-cluster** WAF pod (`waf` Deployment /
Service on `:8080`), which proxies to the in-cluster origin pod. The whole path
is self-contained in the cluster — no hop out to a Docker host. An off-cluster
alternative also ships: point the ingress backend at `service: node-waf` /
`port: 9080` to reach the WAF running as a Docker container on a node
(`deploy/node-demo.compose.yml` at `192.168.1.140:9080`) via the `node-waf`
external-backend Service (`node-waf-backend.yaml`).

```
AFTER (protected):
  Internet ─▶ payments.fictionally.org        ─▶ Traefik ─▶ Service/waf ─▶ Service/origin
                                                              (in-cluster)  reachable ONLY via the WAF
BEFORE (unprotected, gated):
  Internet ─▶ direct.payments.fictionally.org ─▶ Traefik ─▶ [basic-auth] ─▶ Service/origin-direct
                                                              same app, NO WAF — attacks succeed

  alt AFTER backend: Traefik ─▶ node WAF (192.168.1.140:9080)   (Docker container on debian001)

Observability:
  waf pod ──(audit JSON → shared file)──▶ promtail sidecar ──▶ Loki ──▶ Grafana dashboard
```

## Deploy

```bash
export KUBECONFIG=~/.kube/k3s1.yaml
kubectl apply -k k8s/
kubectl -n f5-waf-demo rollout status deploy/waf
```

Everything lands in the isolated `f5-waf-demo` namespace. Remove it all with
`kubectl delete -k k8s/` (or `kubectl delete ns f5-waf-demo`).

## Test

```bash
# Before DNS exists, target a node directly and pass the Host header:
BASE=http://192.168.1.104 HOSTHDR=payments.fictionally.org k8s/test-ingress.sh
# Once DNS resolves:
k8s/test-ingress.sh
```

Expected: the four attacks return **403** (blocked by the WAF) and legitimate
requests return **200**.

## Before / after on the public hostname

The demo publishes two hostnames so you can see the *same app* with and without
the WAF:

| Host | Path | Behaviour |
|------|------|-----------|
| `payments.fictionally.org` | Traefik → **WAF** → origin | attacks **blocked (403)**, legit **200** |
| `direct.payments.fictionally.org` | Traefik → **origin-direct** (no WAF) | attacks **succeed (200)** — behind basic-auth |

`direct.payments.fictionally.org` is a **second** origin instance, so the
protected origin keeps its strict "reachable only via the WAF" containment. It is
deliberately vulnerable, so it is **gated behind HTTP basic-auth** (Traefik
`before-basic-auth` Middleware) and runs with `SAFE_MODE=1`. Change the credential
in the `before-basic-auth` Secret (`htpasswd -nbB <user> <pass>`).

```bash
# Before public DNS for the direct host, target a node + Host header:
U=demo; P=<password from the Secret>
# attack SUCCEEDS on the unprotected origin (needs creds):
curl -u "$U:$P" -H 'Host: direct.payments.fictionally.org' \
  "http://192.168.1.104/search?q=1'%20OR%20'1'='1"        # 200, injected result
# same attack BLOCKED by the WAF:
curl -H 'Host: payments.fictionally.org' \
  "http://192.168.1.104/search?q=1'%20OR%20'1'='1"        # 403
```

Add a Cloudflare record `direct.payments.fictionally.org CNAME lon1.pop0.uk`
(DNS-only) to reach the "before" host publicly.

## WAF console — see logs & violations (Grafana)

There is no vendor UI with the license-free CRS engine, so the demo ships one.
The WAF writes its ModSecurity **audit log** (one JSON object per violation:
matched rule, data, anomaly score, client, URI) to a shared file; a **promtail**
sidecar tails it into **Loki**; **Grafana** renders a pre-provisioned dashboard
*F5 NGINX WAF — Live Violations* (total violations, over-time, top rules, top
attacking IPs, live violation log).

```bash
kubectl -n f5-waf-demo port-forward svc/grafana 3300:3000
# http://localhost:3300   (admin / admin-password from the grafana-admin Secret)
```

It is also published (optionally) at **`https://waf-console.fictionally.org/`**,
gated by a Traefik basic-auth Middleware (`console-basic-auth`, user `demo`) in
front of Grafana's own login. Add a Cloudflare record
`waf-console.fictionally.org CNAME lon1.pop0.uk` (DNS-only) to resolve it.

CLI equivalents if you'd rather not open a browser:

```bash
# tail the raw audit JSON the dashboard is built from:
kubectl -n f5-waf-demo exec deploy/waf -c waf -- tail -f /var/log/modsec/audit.log
# query Loki directly:
kubectl -n f5-waf-demo exec deploy/loki -- \
  wget -qO- 'http://localhost:3100/loki/api/v1/query?query=sum(count_over_time({job="modsec-audit"}[1h]))'
```

## Two real-world details this demo surfaces

**1. DNS is not automatic here.** The cluster's `external-dns` is filtered to
`diytaxreturn.co.uk`, so it ignores `*.fictionally.org` ingresses. The existing
`fictionally.org` names are individual Cloudflare CNAMEs → `lon1.pop0.uk`
(there is no wildcard). The record for this demo has been added manually:

```
payments.fictionally.org   CNAME   lon1.pop0.uk   (DNS-only, not proxied)
```

so `https://payments.fictionally.org/` is live through the wslproxy tunnel →
Traefik → in-cluster WAF. The ingress also carries the
`external-dns.alpha.kubernetes.io/*` annotations, so if an external-dns instance
that manages `fictionally.org` is ever added, it will keep this record in sync.
(The tunnel currently serves a self-signed TLS cert for the hostname, so browsers
show a certificate warning until a real cert is provisioned for it.)

**2. Traefik normalizes literal `;`.** Traefik's URL parser drops everything
after a literal semicolon before the request reaches the WAF, so a
`/ping?host=127.0.0.1;whoami` payload arrives de-fanged (and never reaches the
app either). Real attackers URL-encode: `%3Bwhoami` passes through Traefik intact
and the WAF blocks it with 403. `test-ingress.sh` uses the encoded form.

## How the vulnerable origin is contained

Because the origin is exploitable by design, it is deployed defensively so that
even a WAF bypass is a dead end:

| Control | Effect |
|---------|--------|
| `SAFE_MODE=1` | origin **simulates** the file-read / command-injection outcomes — no real shell or filesystem access |
| `runAsNonRoot`, `readOnlyRootFilesystem`, `drop: [ALL]` caps | minimal runtime sandbox |
| `automountServiceAccountToken: false` | a popped process gets no Kubernetes API token |
| NetworkPolicy `origin-ingress-from-waf-only` | only the WAF pod can reach the origin — verified: pods in other namespaces are blocked |
| NetworkPolicy `origin-egress-dns-only` | origin can only do DNS outbound — no API server, node metadata, internet, or lateral movement |
| No `Service` type LoadBalancer/NodePort on origin | origin is never published; the ingress points at the WAF only |

## Running the real F5 NGINX App Protect WAF

Swap the `waf` Deployment's image and config for the licensed F5 engine — see
[`../f5-app-protect/`](../f5-app-protect/). Requires an F5 subscription/trial and
access to `private-registry.nginx.com`. Nothing else (origin, ingress, policies,
tests) changes.

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | ties it together; deploys to namespace `f5-waf-demo` |
| `namespace.yaml` | namespace (Pod Security `baseline`) |
| `origin-configmap.yaml` | the app, **generated** from `../origin/app.py` (see header to regenerate) |
| `origin-deployment.yaml` | vulnerable origin, hardened + `SAFE_MODE=1` |
| `origin-service.yaml` / `waf-service.yaml` | ClusterIP services |
| `waf-deployment.yaml` | the WAF (OWASP CRS / ModSecurity-NGINX) |
| `ingress.yaml` | `payments.fictionally.org` → WAF (Traefik) |
| `networkpolicy.yaml` | origin containment |
| `before-after.yaml` | `origin-direct` (unprotected app) + basic-auth Middleware + `direct.payments.fictionally.org` ingress |
| `observability.yaml` | Loki + Grafana + promtail config + the WAF dashboard |
| `test-ingress.sh` | attack/allow test through the ingress |

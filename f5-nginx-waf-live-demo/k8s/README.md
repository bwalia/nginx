# Kubernetes deployment (k3s) — WAF-protected app behind an ingress

Deploys the demo into a k3s cluster: the deliberately-vulnerable origin runs
locked-down and **unexposed**, the WAF sits in front, and a Traefik ingress
publishes `payments.fictionally.org` → WAF → origin.

By default the ingress routes to the WAF running **on a node** as a Docker
container (`deploy/node-demo.compose.yml` at `192.168.1.140:9080`), reached via
the `node-waf` external-backend Service (`node-waf-backend.yaml`). The in-cluster
origin + WAF pods are also deployed; to route the ingress to the **in-cluster**
WAF pod instead, set the ingress backend to `service: waf` / `port: 8080`.

```
Internet ─▶ payments.fictionally.org ─▶ Traefik ─▶ node WAF (192.168.1.140:9080) ─▶ node origin
                                          (default)   Docker container on debian001

  alt: Traefik ─▶ Service/waf (in-cluster pod) ─▶ Service/origin  (reachable ONLY via the WAF)
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

## Two real-world details this demo surfaces

**1. DNS is not automatic here.** The cluster's `external-dns` is filtered to
`diytaxreturn.co.uk`, so it ignores `*.fictionally.org` ingresses. The existing
`fictionally.org` names are individual Cloudflare CNAMEs → `pop0.wslproxy.com`
(there is no wildcard). To make `payments.fictionally.org` resolve, add one
Cloudflare record:

```
payments.fictionally.org   CNAME   pop0.wslproxy.com   (DNS-only, not proxied)
```

The ingress already carries the `external-dns.alpha.kubernetes.io/*` annotations,
so if an external-dns instance that manages `fictionally.org` is ever added, it
will publish this record automatically.

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
| `test-ingress.sh` | attack/allow test through the ingress |

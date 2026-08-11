# nginx — demos & labs

Demos for **F5 NGINX WAF**, plus Kubernetes and Terraform labs.

The flagship is [`f5-nginx-waf-live-demo/`](./f5-nginx-waf-live-demo/): a live,
**license-free** Web Application Firewall demo. It runs a deliberately-vulnerable
app and shows a comprehensive matrix of attacks getting **blocked by the WAF**
(403) while legitimate traffic passes (200). The WAF engine is OWASP Core Rule
Set on ModSecurity-NGINX — a drop-in stand-in for F5 NGINX App Protect WAF, so
nothing here needs an F5 license.

---

## How to start the demos

There are three ways to run it. Pick one — they're independent.

### 1) Local (Docker) — the quickest

Requires Docker. Everything runs on your machine.

```bash
cd f5-nginx-waf-live-demo
docker compose up --build -d          # origin on :8081, WAF on :8082
./run-demo.sh                         # comprehensive before/after capability matrix
```

You'll see a scorecard — every attack `BLOCKED` by the WAF, every legit request
`ALLOWED` (**17/17 PASS**). Open `http://localhost:8081` (raw, vulnerable) vs
`http://localhost:8082` (behind the WAF) in a browser to poke at it.

```bash
./stop.sh                             # tear down
```

### 2) On a single node (SSH + Docker)

Runs the WAF + app as Docker containers on a remote host, publishing **only**
the WAF port (origin stays internal). Currently deployed on node
`192.168.1.140:9080`.

```bash
cd f5-nginx-waf-live-demo/deploy
NODE=192.168.1.140
ssh bwalia@$NODE 'mkdir -p ~/f5-waf-demo'
scp ../origin/app.py node-demo.compose.yml bwalia@$NODE:~/f5-waf-demo/
ssh bwalia@$NODE 'cd ~/f5-waf-demo && docker compose -f node-demo.compose.yml up -d'

./test-node.sh                        # BASE defaults to http://192.168.1.140:9080
```

Tear down: `ssh bwalia@$NODE 'cd ~/f5-waf-demo && docker compose -f node-demo.compose.yml down'`

### 3) Kubernetes (k3s cluster `k3s1`)

Deploys hardened origin + WAF pods and a Traefik ingress for
`payments.fictionally.org`. Requires the cluster kubeconfig.

```bash
export KUBECONFIG=~/.kube/k3s1.yaml
kubectl apply -k f5-nginx-waf-live-demo/k8s/
kubectl -n f5-waf-demo rollout status deploy/waf

# Test through the ingress. Until public DNS is added, target a node + Host header:
BASE=http://192.168.1.104 HOSTHDR=payments.fictionally.org \
  f5-nginx-waf-live-demo/k8s/test-ingress.sh
```

The ingress `payments.fictionally.org` routes to the **in-cluster** WAF pod
(`service: waf` / `port: 8080`) → in-cluster origin pod. It is live publicly at
`https://payments.fictionally.org/` via the Cloudflare record
`payments.fictionally.org  CNAME  pop0.wslproxy.com` (DNS-only) → wslproxy tunnel
→ Traefik. (The tunnel serves a self-signed cert, so browsers warn until a real
one is provisioned.) To route to the off-cluster node WAF from demo 2 instead,
set the ingress backend to `service: node-waf` / `port: 9080`.

The k3s deployment also publishes a **public before/after** and a **WAF console**:

- `direct.payments.fictionally.org` — the *same* app with **no WAF** in front
  (attacks succeed), gated behind HTTP basic-auth (`before-basic-auth` Secret;
  user `demo`). Contrast with `payments.fictionally.org`, which blocks them.
- **Grafana WAF console** — a promtail sidecar ships the WAF's ModSecurity audit
  log into Loki; Grafana serves a live *F5 NGINX WAF — Live Violations* dashboard.
  `kubectl -n f5-waf-demo port-forward svc/grafana 3300:3000` → http://localhost:3300
  (admin / `grafana-admin` Secret), or publicly at `waf-console.fictionally.org`
  (basic-auth gated, user `demo`). See [`k8s/README.md`](./f5-nginx-waf-live-demo/k8s/README.md).

Tear down: `kubectl delete -k f5-nginx-waf-live-demo/k8s/`

---

## What gets demonstrated

Injection (SQLi, XSS, RCE, PHP code injection, path traversal, RFI), threat
campaigns (Log4Shell/JNDI, SSRF to cloud metadata), bot & scanner defense
(sqlmap/nikto), and HTTP method enforcement — all blocked by the WAF, with
legitimate traffic untouched. Full details, architecture, and the security
model are in [`f5-nginx-waf-live-demo/README.md`](./f5-nginx-waf-live-demo/README.md).

Running the **real** F5 NGINX App Protect WAF engine (needs an F5
subscription/trial) is documented in
[`f5-nginx-waf-live-demo/f5-app-protect/`](./f5-nginx-waf-live-demo/f5-app-protect/) —
same topology, same tests, just a different WAF image.

## Other labs

| Directory | What it is |
|-----------|-----------|
| [`f5-app-protect-demo/`](./f5-app-protect-demo/) | Interactive React walkthrough of F5 WAF for NGINX features (educational simulation) |
| [`ansible/`](./ansible/) | Ansible roles to manage App Protect, deploy policies, bind servers, and apply signature rules by ID (+ pytest) |
| [`kubernetes-demo/`](./kubernetes-demo/) | Kubernetes deployment/service manifests and notes |
| [`terraform-ec2-demo/`](./terraform-ec2-demo/) | Terraform EC2 provisioning demo |

See [`SESSION.md`](./SESSION.md) for the current deployment state and a log of
how this demo was built.

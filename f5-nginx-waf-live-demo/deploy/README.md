# Node deployment — WAF in front on a single Docker host

Runs the demo as plain Docker containers on one host (e.g. a k3s node reached
over SSH), publishing **only** the WAF. The vulnerable origin stays on the
internal compose network, reachable only through the WAF, and runs in
`SAFE_MODE` (simulated exploits — no real shell or filesystem access) because
the host is shared infrastructure.

```
LAN client ──▶ <node>:9080  (WAF, OWASP CRS / ModSecurity) ──▶ origin  (internal, SAFE_MODE)
```

## Deploy

Pick a free port on the node (this demo uses `9080`). From this `deploy/`
directory (with `../origin/app.py` copied in as `app.py`):

```bash
NODE=192.168.1.140
ssh bwalia@$NODE 'mkdir -p ~/f5-waf-demo'
scp ../origin/app.py node-demo.compose.yml bwalia@$NODE:~/f5-waf-demo/
ssh bwalia@$NODE 'cd ~/f5-waf-demo && docker compose -f node-demo.compose.yml up -d'
```

## Test

```bash
BASE=http://192.168.1.140:9080 ./test-node.sh
```

Expected: attacks **403**, legit **200**. Because clients hit the WAF directly
(no front proxy), even a literal-`;` command-injection payload is blocked.

## Tear down

```bash
ssh bwalia@192.168.1.140 'cd ~/f5-waf-demo && docker compose -f node-demo.compose.yml down'
```

## Swapping in the real F5 NGINX App Protect WAF

This uses the license-free OWASP CRS engine as the WAF. To showcase the **real
F5** engine on the node, you need an F5 subscription or free 30-day trial
(myF5 → Trials → "NGINX App Protect WAF"), then:

1. `docker login private-registry.nginx.com` on the node (JWT as username).
2. Replace the `waf` service in `node-demo.compose.yml` with the App Protect v5
   images and mount the policy from [`../f5-app-protect/`](../f5-app-protect/)
   (`nginx.conf` + `policies/acme_bank_policy.json`).

The origin, port, and tests stay exactly the same — only the enforcement engine
changes.

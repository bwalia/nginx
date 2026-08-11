# Publishing the WAF demo on the wslproxy edge (`waf.pop0.uk`)

This publishes the ModSecurity WAF demo on the public wslproxy pop **pop0**
(`72.62.211.28`, `lon1.pop0.uk`) at **https://waf.pop0.uk/**, modelled on the
existing `echo.pop0.uk` / `whoami.pop0.uk` pop0 services.

## How it fits together

```
Internet ─▶ waf.pop0.uk (CNAME lon1.pop0.uk → 72.62.211.28)
         ─▶ wslproxy OpenResty gateway on the pop (cloud001)
         ─▶ 127.0.0.1:30085  (node-local NodePort)
         ─▶ waf-edge pod  ──▶ origin-edge pod      (both pinned to cloud001)
              ModSecurity/CRS        vulnerable Acme Bank app
```

**Why an edge copy of the WAF?** The pop node `cloud001` is network-isolated
from the home cluster — it can only reach node-local NodePorts, not the home
WAF's ClusterIP/pod. So `k8s/pop0-edge.yaml` runs a self-contained `waf-edge` +
`origin-edge` **on cloud001** (nodeSelector + edge toleration), exposed on
NodePort `30085`. wslproxy's own WAF stays **off** (`waf_enabled:false`) — the
ModSecurity backend does the blocking.

## The wslproxy objects (live on the pop at `/opt/nginx/data/`)

The wslproxy gateway reads these JSON files from disk per request — **no nginx
reload needed for routing**. Copies are kept here for reproducibility:

| File | Installed path on the pop | Purpose |
|------|---------------------------|---------|
| `servers/host:waf.pop0.uk.json` | `data/servers/prod/host:waf.pop0.uk.json` | the vhost (server) definition |
| `rules/waf-demo-default.json` | `data/rules/prod/waf-demo-default.json` | routes `/` → backend `127.0.0.1:30085` |
| `ssl/waf.pop0.uk.json` | `data/ssl/waf.pop0.uk.json` | adds the host to the auto_ssl allow-list |

## Reproduce / re-apply

```bash
# 1. Backend on the pop node (from the k8s dir):
kubectl apply -k ../k8s/          # creates waf-edge + origin-edge on cloud001, NodePort 30085

# 2. wslproxy server + rule (routing is picked up live, no reload):
POP=bwalia@72.62.211.28
scp 'servers/host:waf.pop0.uk.json' $POP:/tmp/ && \
  ssh $POP 'sudo install -o www-data -g root /tmp/host:waf.pop0.uk.json /opt/nginx/data/servers/prod/'
scp rules/waf-demo-default.json $POP:/tmp/ && \
  ssh $POP 'sudo install -o www-data -g root /tmp/waf-demo-default.json /opt/nginx/data/rules/prod/'

# 3. TLS allow-list + one graceful reload so auto_ssl will issue a Let's Encrypt cert:
scp ssl/waf.pop0.uk.json $POP:/tmp/ && \
  ssh $POP 'sudo install -o www-data -g root /tmp/waf.pop0.uk.json /opt/nginx/data/ssl/ && \
            sudo /usr/local/openresty/nginx/sbin/nginx -t && \
            sudo /usr/local/openresty/nginx/sbin/nginx -s reload'

# 4. DNS: CNAME waf.pop0.uk -> lon1.pop0.uk (DNS-only), in the pop0.uk Cloudflare zone.
```

> The routing files (server + rule) are picked up live. The **ssl allow-list**
> file needs one graceful `nginx -s reload` (it is read into a shared dict at
> init) before auto_ssl will issue the certificate — nginx.conf itself is
> unchanged, so the reload is zero-downtime and does not affect other hosts.

## Verify

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://waf.pop0.uk/                                   # 200
curl -s -o /dev/null -w '%{http_code}\n' "https://waf.pop0.uk/search?q=1'%20OR%20'1'='1"        # 403
```

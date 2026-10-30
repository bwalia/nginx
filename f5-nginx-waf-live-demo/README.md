# F5 NGINX WAF + API Gateway — live demo

Runnable demo of **WAF + API Gateway** on the same Acme Pay origin as the
[Apigee API Gateway demo](https://github.com/bwalia/apigee-api-gateway-demo).
No license required for the default path.

## Public URLs (this lab)

| URL | Role |
|-----|------|
| **https://payments-secure.fictionally.org/** | F5 API GW + WAF (wslproxy → `193.237.176.232:18083`) |
| https://payments-secure.fictionally.org/lab | Efficacy lab (`x-f5-*`) |
| https://payments-secure.fictionally.org/features | Features |
| https://payments-open.fictionally.org/ | Open origin (no gateway) |
| https://apigee-lab.fictionally.org/lab | Apigee compare |

LAN aliases: `http://192.168.1.177:8081` / `:8082` / `:8083` (also `:1808x`).

```
  Internet ─▶ payments-secure.fictionally.org (wslproxy lon1)
           ─▶ 193.237.176.232:18083  F5 API GW+WAF ─▶ origin
```

## Always-on

Containers use `restart: always`. A macOS LaunchAgent
(`com.f5.nginx-waf-demo`) runs `scripts/ensure-up.sh` at login and every
2 minutes so the stack comes back after reboot / Colima restarts.

```bash
# status
launchctl print "gui/$(id -u)/com.f5.nginx-waf-demo" | head
tail -f logs/ensure-up.log

# stop keep-alive (containers keep running until you compose down)
launchctl bootout "gui/$(id -u)/com.f5.nginx-waf-demo"

# tear down demo
./stop.sh
```

## Run it

```bash
cd f5-nginx-waf-live-demo
docker compose up --build -d
./run-demo.sh
```

Browser:

```bash
open 'https://payments-secure.fictionally.org/'
open 'https://payments-secure.fictionally.org/lab'
open 'https://payments-secure.fictionally.org/features'
```

## API Gateway checks

```bash
# Missing API key → 401
curl -s -o /dev/null -w '%{http_code}\n' 'http://192.168.1.177:8083/products?cat=deposit'

# Valid key → 200
curl -s -H 'x-api-key: demo-f5-key' 'http://192.168.1.177:8083/products?cat=deposit'

# Threat block + x-f5-* headers
curl -s -D- -o /dev/null -H 'x-f5-demo-mode: lab' \
  'http://192.168.1.177:8083/search?q=<script>alert(1)</script>'
```

## Apigee parity

Same Acme Pay paths (`/products`, `/search`, `/statement`, `/api/me`, …).
Compare: https://apigee-lab.fictionally.org/lab

Licensed **F5 NGINX App Protect v5**: [`f5-app-protect/`](./f5-app-protect/).

⚠️ Origin is intentionally insecure — demo use only.

# F5 App Protect Platform Demo

Interactive demo and feature walkthrough for **F5 WAF for NGINX** (formerly NGINX App Protect WAF).

## What's included

| Area | Description |
|------|-------------|
| **Overview** | Platform pitch + live inspection-path visualization |
| **Feature Walkthrough** | 22 keyboard-navigable slides covering all major capabilities |
| **Attack Lab** | 13 simulated attack/allow scenarios with security event console |
| **Policy Explorer** | Declarative JSON policies + `nginx.conf` snippet |
| **Architecture** | Data path, deploy topologies (VM / Docker / K8s), package map |

### Features covered in the walkthrough

Attack signatures & OWASP Top 10, threat campaigns, bot protection, Layer 7 DoS, HTTP compliance & evasion, OpenAPI/JSON/XML API security, GraphQL, gRPC, JWT protection, Data Guard, brute force prevention, cookie enforcement, geolocation & IP intelligence, filetypes & methods, override rules & staging, logging, Kubernetes Ingress, and security-as-code.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Notes

This is an **educational simulation** — it does not run a real App Protect engine or require an NGINX Plus license. Feature names and policy shapes align with public docs at [docs.nginx.com/waf](https://docs.nginx.com/waf/).

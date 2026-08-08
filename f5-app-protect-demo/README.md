# Meridian Digital Bank · F5 App Protect Demo

Sophisticated interactive demo of **F5 WAF for NGINX** (formerly NGINX App Protect WAF) modelled on a regulated digital bank.

## Demo estate

| Service | Host | Themes |
|---------|------|--------|
| Retail Internet Banking | `secure.meridianbank.example` | ATO, SCA, XSS, SQLi, Data Guard |
| Open Banking APIs | `api.meridianbank.example` | FAPI/JWT, BOLA, OpenAPI, smuggling |
| Card & Acquiring | `pay.meridianbank.example` | PCI, PAN mask, FX DoS, SSRF |
| Mobile Banking BFF | `mobile.meridianbank.example` | gRPC malformed frames |
| Corporate Wire & SEPA | `corp.meridianbank.example` | XXE pain.001, sanctions geo |
| Wealth GraphQL | `wealth.meridianbank.example` | Introspection, batch enum, depth |

## What's included

- **Overview** — Meridian estate map + inspection path
- **Walkthrough** — Banking-framed capability slides
- **Attack Lab** — 35+ complex scenarios with filters, SOC notes, SIEM-style JSON
- **Policies** — Per-service declarative JSON + nginx edge snippet
- **Architecture** — Dual-edge topology + attack narratives

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Notes

Educational simulation only — no real App Protect engine or customer data. Feature names align with [docs.nginx.com/waf](https://docs.nginx.com/waf/).

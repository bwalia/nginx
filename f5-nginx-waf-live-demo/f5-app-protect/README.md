# Running the demo on the real F5 NGINX App Protect WAF v5

The top-level demo (`../docker-compose.yml`) runs a **license-free enforcement
engine** (OWASP CRS on ModSecurity-NGINX) so anyone can reproduce the exact
before/after in seconds. This directory swaps in the **real F5 NGINX App Protect
WAF v5** engine. The topology, the attacks, and `run-demo.sh` are identical —
only the box doing the inspecting changes.

## What you need

1. An **NGINX App Protect WAF subscription or free 30-day trial** from F5
   (myF5 → Trials → "NGINX App Protect WAF").
2. Your license files: **`nginx-repo.crt`** and **`nginx-repo.key`**. Drop both
   in this directory (next to the `Dockerfile`). They are git-ignored.
3. A **JWT** from myF5 to log in to the private registry.

## Steps

```bash
cd f5-app-protect

# 1. Log in to F5's private registry (JWT is the username, the word "none" the password)
docker login private-registry.nginx.com \
  --username "$(cat nginx-repo.jwt)" --password none

# 2. Build the NGINX+App Protect image and start all three NAP containers
docker compose -f docker-compose.f5.yml up --build -d

# 3. Wait for the config manager to compile the policy, then run the SAME test
WAF=http://localhost:8082 ../run-demo.sh
```

You should see the identical result: every attack **BLOCKED** with HTTP 403,
every legitimate request **ALLOWED** with HTTP 200 — this time enforced by App
Protect's signature engine and threat campaigns rather than CRS.

## How v5 fits together

App Protect WAF v5 splits enforcement across three cooperating containers
(defined in `docker-compose.f5.yml`):

| Container         | Image                                          | Role                                   |
|-------------------|------------------------------------------------|----------------------------------------|
| `nginx-app-protect` | built from `waf-nginx` (this `Dockerfile`)   | NGINX data plane, loads the WAF module |
| `waf-enforcer`    | `nap/waf-enforcer`                             | Inspects traffic, makes block/allow    |
| `waf-config-mgr`  | `nap/waf-config-mgr`                           | Compiles the JSON policy for the enforcer |

`nginx.conf` loads `ngx_http_app_protect_module.so`, points
`app_protect_enforcer_address` at the enforcer, and attaches the policy with
`app_protect_policy_file`.

## The policy

`policies/acme_bank_policy.json` is a declarative App Protect policy in blocking
mode. It enables the SQL Injection, XSS, Command Execution, and Path Traversal
signature sets — the four attack classes the demo fires — plus Data Guard to
mask SSNs and card numbers in responses. Edit it and restart to see policy
changes take effect; that JSON is your "security as code" artifact.

> Version tags (`5.6.0`) above are examples — check
> [docs.nginx.com/nap-waf](https://docs.nginx.com/nginx-app-protect-waf/) for the
> current release and update the three image tags to match.

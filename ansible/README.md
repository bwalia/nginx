# Ansible — F5 App Protect / WAF management

Roles and playbooks to install App Protect, deploy declarative policies, bind them to
servers/locations, and manage signature rule packs **by ID** — with Python unit tests
for the policy/rules engine helpers.

## Roles

| Role | Purpose |
|------|---------|
| `f5_app_protect` | Directories, packages (optional), global NGINX snippet, log profile |
| `f5_waf_policies` | Deploy policy JSON, validate schema, render per-domain server bindings |
| `f5_waf_rules` | Deploy rule packs, apply per-ID overrides, compile signature-sets |

## Layout

```
ansible/
  roles/
  playbooks/
  inventories/lab/
  python/f5_waf_tools/     # pure Python library
  python/scripts/          # CLI used by roles
  tests/unit/              # pytest
```

## Quick start (lab / local)

```bash
cd ansible
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# Unit tests (no root / no NGINX required)
pytest

# Dry-run policy + rules against /tmp (see inventories/lab/group_vars)
ansible-playbook playbooks/apply_policies.yml --check
ansible-playbook playbooks/apply_rules.yml
ansible-playbook playbooks/site.yml
```

## Bind policies to a server

Set `f5_waf_policy_bindings` (inventory / extra-vars):

```yaml
f5_waf_policy_bindings:
  - server_name: api.meridianbank.example
    policy: ob_fapi_blocking
    upstream: http://ob-api-gateway
    locations:
      - path: /open-banking/
        policy: ob_fapi_blocking
        upstream: http://ob-api-gateway
```

Then:

```bash
ansible-playbook playbooks/apply_policies.yml -l waf_edges
```

## Rule overrides by ID

```yaml
f5_waf_rule_overrides:
  - id: "200009999"
    action: disable
    enabled: false
  - id: "200000098"
    action: alarm
f5_waf_rules_target_policy: baseline_blocking
```

```bash
ansible-playbook playbooks/apply_rules.yml
```

## Python helpers

```bash
python3 python/scripts/validate_policy.py roles/f5_waf_policies/files/policies/baseline_blocking.json
python3 python/scripts/compile_rules.py \
  --pack roles/f5_waf_rules/files/core-attack-pack.json \
  --overrides /tmp/overrides.json \
  --output /tmp/compiled.json
```

## Production notes

- Set `f5_app_protect_manage_packages: true` on real edges with NGINX Plus repos configured.
- Enable `f5_*_reload_nginx: true` and `*_validate_nginx: true` when NGINX is installed.
- Keep policy JSON in Git; promote `onboarding_transparent` → blocking after SOC review.

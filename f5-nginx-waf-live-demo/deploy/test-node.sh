#!/usr/bin/env bash
#
# Tests the node WAF demo (deploy/node-demo.compose.yml) over the network.
# Attacks are blocked (403); legit traffic passes (200). Because clients hit the
# WAF directly (no front proxy), a literal ';' command-injection payload works.
#
# Usage:  ./test-node.sh                 # defaults to http://192.168.1.140:9080
#         BASE=http://<node>:9080 ./test-node.sh
set -uo pipefail
BASE="${BASE:-http://192.168.1.140:9080}"

BOLD=$'\e[1m'; RED=$'\e[31m'; GRN=$'\e[32m'; DIM=$'\e[2m'; RST=$'\e[0m'
pass=0; fail=0
check(){ local label="$1" want="$2" path="$3" code
  code="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "${BASE}${path}")"
  if [[ "$code" == "$want" ]]; then
    printf '  %-24s %sHTTP %s OK%s\n' "$label" "$GRN" "$code" "$RST"; pass=$((pass+1))
  else
    printf '  %-24s %sHTTP %s (wanted %s)%s\n' "$label" "$RED" "$code" "$want" "$RST"; fail=$((fail+1))
  fi
}
printf '\n%sNode WAF demo%s  %s%s%s\n\n' "$BOLD" "$RST" "$DIM" "$BASE" "$RST"
printf '%sAttacks -- expect 403:%s\n' "$BOLD" "$RST"
check "SQL injection"     403 "/products?cat=deposit%27%20OR%20%271%27=%271"
check "Reflected XSS"     403 "/search?q=%3Cscript%3Ealert(document.cookie)%3C/script%3E"
check "Path traversal"    403 "/download?file=../../../../etc/passwd"
check "Command injection" 403 "/ping?host=127.0.0.1;whoami"
printf '\n%sLegit -- expect 200:%s\n' "$BOLD" "$RST"
check "Home"     200 "/"
check "Products" 200 "/products?cat=deposit"
check "Search"   200 "/search?q=laptop"
total=$((pass+fail))
printf '\n%sResult: %s/%s%s  ' "$BOLD" "$pass" "$total" "$RST"
[[ "$fail" -eq 0 ]] && { printf '%sPASS%s\n\n' "$GRN" "$RST"; exit 0; } || { printf '%sFAIL%s\n\n' "$RED" "$RST"; exit 1; }

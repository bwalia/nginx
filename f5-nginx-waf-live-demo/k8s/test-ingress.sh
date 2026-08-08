#!/usr/bin/env bash
#
# Verifies the WAF is protecting the public endpoint: attacks are blocked (403)
# and legitimate traffic passes (200), through the Traefik ingress + WAF.
#
# Default hits the real hostname (needs DNS). Before DNS is published you can
# target a cluster node directly and pass the Host header:
#   BASE=http://192.168.1.104 HOSTHDR=payments.fictionally.org ./test-ingress.sh
#
# NOTE: the command-injection payload uses an ENCODED semicolon (%3B). Traefik's
# URL parser drops everything after a literal ';' before the WAF sees it, so a
# real (encoded) payload is what actually exercises the WAF here.
set -uo pipefail

BASE="${BASE:-http://payments.fictionally.org}"
HOSTHDR="${HOSTHDR:-}"

BOLD=$'\e[1m'; DIM=$'\e[2m'; RED=$'\e[31m'; GRN=$'\e[32m'; CYN=$'\e[36m'; RST=$'\e[0m'
CURL=(curl -s -o /dev/null -m 10 -w '%{http_code}')
[[ -n "$HOSTHDR" ]] && CURL+=(-H "Host: $HOSTHDR")

pass=0; fail=0
check(){ # <label> <expected> <path>
  local label="$1" want="$2" path="$3" code
  code="$("${CURL[@]}" "${BASE}${path}")"
  if [[ "$code" == "$want" ]]; then
    printf '  %-34s %sHTTP %s%s  %s%s%s\n' "$label" "$GRN" "$code" "$RST" "$GRN" "OK" "$RST"
    pass=$((pass+1))
  else
    printf '  %-34s %sHTTP %s%s  %s(wanted %s)%s\n' "$label" "$RED" "$code" "$RST" "$RED" "$want" "$RST"
    fail=$((fail+1))
  fi
}

printf '\n%sF5 NGINX WAF -- ingress test%s   %s(Host: %s)%s\n' "$BOLD" "$RST" "$DIM" "${HOSTHDR:-${BASE#http://}}" "$RST"
printf '%starget:%s %s\n\n' "$DIM" "$RST" "$BASE"

printf '%sAttacks -- expect BLOCKED (403):%s\n' "$BOLD" "$RST"
check "SQL injection"        403 "/products?cat=deposit%27%20OR%20%271%27=%271"
check "Reflected XSS"        403 "/search?q=%3Cscript%3Ealert(document.cookie)%3C/script%3E"
check "Path traversal"       403 "/download?file=../../../../etc/passwd"
check "Command injection"    403 "/ping?host=127.0.0.1%3Bwhoami"

printf '\n%sLegitimate -- expect ALLOWED (200):%s\n' "$BOLD" "$RST"
check "Home page"            200 "/"
check "Product lookup"       200 "/products?cat=deposit"
check "Product search"       200 "/search?q=laptop"

total=$((pass+fail))
printf '\n%sResult: %s/%s%s  ' "$BOLD" "$pass" "$total" "$RST"
if [[ "$fail" -eq 0 ]]; then printf '%sPASS%s\n\n' "$GRN" "$RST"; exit 0
else printf '%sFAIL (%s)%s\n\n' "$RED" "$fail" "$RST"; exit 1; fi

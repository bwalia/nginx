#!/usr/bin/env bash
#
# Fires identical attacks at the origin (no WAF) and at the WAF, side by side.
# Proves: unprotected origin is exploitable; F5 NGINX WAF blocks the same input.
#
set -uo pipefail

ORIGIN="${ORIGIN:-http://localhost:8081}"
WAF="${WAF:-http://localhost:8082}"

BOLD=$'\e[1m'; DIM=$'\e[2m'; RED=$'\e[31m'; GRN=$'\e[32m'
YEL=$'\e[33m'; CYN=$'\e[36m'; RST=$'\e[0m'

pass=0; fail=0

hr(){ printf '%s\n' "${DIM}--------------------------------------------------------------------------${RST}"; }

# curl a URL, echo "<http_status>|<body>" (body newlines squashed to spaces)
fetch(){
  local url="$1"
  local body code
  body="$(curl -s -m 10 -w $'\n%{http_code}' "$url")"
  code="${body##*$'\n'}"
  body="${body%$'\n'*}"
  printf '%s|%s' "$code" "$(printf '%s' "$body" | tr '\n' ' ')"
}

# attack <label> <path> <origin-success-regex>
attack(){
  local label="$1" path="$2" sig="$3"

  hr
  printf '%s%s%s\n' "${BOLD}${CYN}" "$label" "${RST}"
  printf '%s  payload:%s %s\n\n' "$DIM" "$RST" "$path"

  # --- against the raw origin (no WAF) ---
  local o ocode obody
  o="$(fetch "${ORIGIN}${path}")"; ocode="${o%%|*}"; obody="${o#*|}"
  if [[ "$ocode" == "200" && "$obody" =~ $sig ]]; then
    printf '  %-26s %sHTTP %s%s  %sEXPLOITED%s -- attacker got data\n' \
      "origin (no WAF)" "$YEL" "$ocode" "$RST" "$RED" "$RST"
  else
    printf '  %-26s HTTP %s  (no leak detected)\n' "origin (no WAF)" "$ocode"
  fi

  # --- through the WAF ---
  local w wcode
  w="$(fetch "${WAF}${path}")"; wcode="${w%%|*}"
  if [[ "$wcode" == "403" ]]; then
    printf '  %-26s %sHTTP %s%s  %sBLOCKED%s   -- never reached the app\n' \
      "F5 NGINX WAF" "$GRN" "$wcode" "$RST" "$GRN" "$RST"
    pass=$((pass+1))
  else
    printf '  %-26s %sHTTP %s%s  %sNOT BLOCKED%s\n' \
      "F5 NGINX WAF" "$RED" "$wcode" "$RST" "$RED" "$RST"
    fail=$((fail+1))
  fi
}

# legit <label> <path>  -- expects a clean 200 through the WAF
legit(){
  local label="$1" path="$2"
  hr
  printf '%s%s%s\n' "${BOLD}${CYN}" "$label" "${RST}"
  printf '%s  request:%s %s\n\n' "$DIM" "$RST" "$path"
  local w wcode
  w="$(fetch "${WAF}${path}")"; wcode="${w%%|*}"
  if [[ "$wcode" == "200" ]]; then
    printf '  %-26s %sHTTP %s%s  %sALLOWED%s   -- normal traffic passes\n' \
      "F5 NGINX WAF" "$GRN" "$wcode" "$RST" "$GRN" "$RST"
    pass=$((pass+1))
  else
    printf '  %-26s %sHTTP %s%s  %sFALSE POSITIVE%s\n' \
      "F5 NGINX WAF" "$RED" "$wcode" "$RST" "$RED" "$RST"
    fail=$((fail+1))
  fi
}

printf '\n%s========================================================================%s\n' "$BOLD" "$RST"
printf '%s  F5 NGINX WAF -- live before/after demo%s\n' "$BOLD" "$RST"
printf '    origin (unprotected): %s\n' "$ORIGIN"
printf '    same origin via WAF:  %s\n' "$WAF"
printf '%s========================================================================%s\n' "$BOLD" "$RST"

printf '\n%s### PART 1 -- the same 4 attacks, origin vs. WAF %s\n' "$BOLD" "$RST"
attack "SQL injection (auth bypass / data theft)" \
       "/products?cat=deposit%27%20OR%20%271%27=%271" \
       'LEAKED|SSN'
attack "Reflected XSS (session hijack)" \
       "/search?q=%3Cscript%3Ealert(document.cookie)%3C/script%3E" \
       '<script>alert'
attack "Path traversal (read arbitrary files)" \
       "/download?file=../../../../etc/passwd" \
       'root:.*:0:0'
attack "Command injection (remote code execution)" \
       "/ping?host=127.0.0.1;whoami" \
       'root'

printf '\n%s### PART 2 -- legitimate traffic still works through the WAF %s\n' "$BOLD" "$RST"
legit "Product lookup"  "/products?cat=deposit"
legit "Product search"  "/search?q=laptop"

hr
total=$((pass+fail))
printf '\n%s  Result: %s/%s checks behaved correctly%s\n' "$BOLD" "$pass" "$total" "$RST"
if [[ "$fail" -eq 0 ]]; then
  printf '  %sPASS%s -- WAF blocked every attack and allowed every legit request.\n\n' "$GRN" "$RST"
  exit 0
else
  printf '  %sFAIL%s -- %s check(s) did not behave as expected.\n\n' "$RED" "$RST" "$fail"
  exit 1
fi

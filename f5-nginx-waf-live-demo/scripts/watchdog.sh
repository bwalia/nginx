#!/usr/bin/env bash
# Long-running watchdog for the F5 NGINX WAF + API GW demo stack.
#
# Run by launchd (com.f5.nginx-waf-demo) with KeepAlive, not StartInterval:
# under heavy load launchd parks interval/RunAtLoad spawns as "speculative"
# and never runs them, which left payments-secure.fictionally.org 502ing
# after the containers were removed (2026-10-30). A resident loop does not
# depend on launchd scheduling it again.
#
# Probes every INTERVAL seconds; only calls ensure-up.sh when a probe fails,
# so a healthy stack logs nothing.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INTERVAL="${INTERVAL:-60}"

log(){ printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

probe(){
  local u
  for u in http://127.0.0.1:8083/healthz http://127.0.0.1:8081/healthz http://127.0.0.1:8082/; do
    curl -sf -o /dev/null -m 5 "$u" || { echo "$u"; return 1; }
  done
}

# launchd can park KeepAlive respawns indefinitely under load; kickstart still
# works, so this watchdog and the apigee-lab one restart each other.
UID_DOMAIN="gui/$(id -u)"
ensure_agent(){
  launchctl print "$UID_DOMAIN/$1" >/dev/null 2>&1 || return 0   # not installed
  launchctl print "$UID_DOMAIN/$1" | grep -q '^	state = running' && return 0
  log "$1 not running — kickstart"
  launchctl kickstart "$UID_DOMAIN/$1" 2>&1 || log "kickstart $1 exited $?"
}

log "watchdog started (interval ${INTERVAL}s)"
while :; do
  if ! failed=$(probe); then
    log "probe failed: $failed — running ensure-up.sh"
    /bin/bash "$ROOT/scripts/ensure-up.sh" || log "ensure-up.sh exited $?"
  fi
  ensure_agent com.apigee-lab.watchdog
  ensure_agent com.apigee-lab.relay
  sleep "$INTERVAL"
done

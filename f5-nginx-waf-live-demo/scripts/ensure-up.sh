#!/usr/bin/env bash
# Keep the F5 NGINX WAF + API GW demo stack running.
# Waits for Docker (Colima), then docker compose up -d and restarts unhealthy units.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export DOCKER_HOST="${DOCKER_HOST:-unix:///Users/balinderwalia/.colima/default/docker.sock}"

log(){ printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

wait_docker(){
  local i=0
  while (( i < 90 )); do
    if docker info >/dev/null 2>&1; then
      return 0
    fi
    # Try starting Colima if the daemon is down
    if (( i == 5 )) && command -v colima >/dev/null 2>&1; then
      log "docker not ready — starting colima"
      colima start >/dev/null 2>&1 || true
    fi
    sleep 2
    i=$((i+1))
  done
  log "ERROR: docker never became ready"
  return 1
}

wait_docker
log "ensuring compose stack (origin / waf / apigw)"
docker compose up -d --remove-orphans

# Nudge any unhealthy / exited containers
for c in waf-demo-origin waf-demo-waf waf-demo-apigw; do
  st=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$c" 2>/dev/null || echo "missing")
  case "$st" in
    *exited*|*dead*|*unhealthy*|missing)
      log "restarting $c ($st)"
      docker start "$c" 2>/dev/null || docker compose up -d --no-deps "$(echo "$c" | sed 's/waf-demo-//')"
      ;;
  esac
done

# Smoke the LAN publish path
# (apigw needs a few seconds after "Started" before it answers)
code=000
for _ in 1 2 3 4 5 6; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 http://127.0.0.1:8083/healthz 2>/dev/null) || true
  [[ "$code" == "200" ]] && break
  sleep 5
done
if [[ "$code" != "200" ]]; then
  log "WARN: :8083/healthz returned $code — recreating apigw"
  docker compose up -d --force-recreate --no-deps apigw
fi

log "ok — https://payments-secure.fictionally.org/  (LAN :8083 / :18083)"
docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || docker compose ps

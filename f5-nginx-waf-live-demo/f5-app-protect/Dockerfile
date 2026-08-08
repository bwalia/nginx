# NGINX data plane with the F5 NGINX App Protect WAF v5 module.
#
# Requires an F5 subscription/trial. Before building:
#   1. Put your license certs next to this file:  nginx-repo.crt  nginx-repo.key
#   2. docker login private-registry.nginx.com    (JWT as username, "none" as password)
#
# This image is published by F5 and already bundles NGINX Plus + the App
# Protect module, so no manual apt/module install is needed.
FROM private-registry.nginx.com/nap/waf-nginx:5.6.0

# Policy and nginx.conf are mounted at runtime via docker-compose.f5.yml, so
# nothing else is baked in here. Kept as a named build target for clarity and
# so you can add signature-update layers or custom error pages later.

EXPOSE 8080

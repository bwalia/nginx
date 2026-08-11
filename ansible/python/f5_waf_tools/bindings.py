"""Domain / service / route binding resolution for WAF policies."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ServiceBinding:
    """Maps a logical service on a domain to a policy and optional route overrides."""

    domain: str
    service: str
    policy: str
    routes: tuple[str, ...] = ()
    enforcement_mode: str | None = None
    extra: dict[str, Any] = field(default_factory=dict, hash=False, compare=False)

    def matches_path(self, path: str) -> bool:
        if not self.routes:
            return True
        return any(path == route or path.startswith(route.rstrip("*")) for route in self.routes)


@dataclass
class BindingResolver:
    """Resolve which policy applies for a domain/service/path triple."""

    global_policy: str
    bindings: list[ServiceBinding]

    def resolve(
        self,
        domain: str,
        service: str | None = None,
        path: str = "/",
    ) -> dict[str, Any]:
        domain = domain.lower().strip()
        candidates = [b for b in self.bindings if b.domain.lower() == domain]

        if service:
            service_matches = [b for b in candidates if b.service == service]
            if service_matches:
                candidates = service_matches

        route_matches = [b for b in candidates if b.matches_path(path)]
        if route_matches:
            # Longest route prefix wins
            winner = max(
                route_matches,
                key=lambda b: max((len(r) for r in b.routes), default=0),
            )
            return {
                "policy": winner.policy,
                "domain": winner.domain,
                "service": winner.service,
                "matched_routes": list(winner.routes),
                "enforcement_mode": winner.enforcement_mode,
                "source": "route" if winner.routes else "service",
            }

        if candidates:
            winner = candidates[0]
            return {
                "policy": winner.policy,
                "domain": winner.domain,
                "service": winner.service,
                "matched_routes": [],
                "enforcement_mode": winner.enforcement_mode,
                "source": "domain",
            }

        return {
            "policy": self.global_policy,
            "domain": domain,
            "service": service,
            "matched_routes": [],
            "enforcement_mode": None,
            "source": "global",
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BindingResolver:
        global_policy = data.get("global_policy") or data.get("globalPolicy") or "baseline_blocking"
        raw_bindings = data.get("bindings") or []
        bindings: list[ServiceBinding] = []
        for item in raw_bindings:
            bindings.append(
                ServiceBinding(
                    domain=item["domain"],
                    service=item["service"],
                    policy=item["policy"],
                    routes=tuple(item.get("routes") or ()),
                    enforcement_mode=item.get("enforcement_mode") or item.get("enforcementMode"),
                    extra={k: v for k, v in item.items() if k not in {
                        "domain", "service", "policy", "routes",
                        "enforcement_mode", "enforcementMode",
                    }},
                )
            )
        return cls(global_policy=global_policy, bindings=bindings)

"""Render NGINX App Protect server/location snippets from bindings."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class NginxAppProtectConfig:
    """Inputs for generating an NGINX server block with App Protect enabled."""

    server_name: str
    listen: str = "443 ssl http2"
    policy_file: str = "/etc/app_protect/conf/baseline_blocking.json"
    log_profile: str = "/etc/app_protect/conf/log_default.json"
    log_destination: str = "syslog:server=127.0.0.1:514"
    upstream: str = "http://127.0.0.1:8080"
    locations: list[dict[str, Any]] = field(default_factory=list)
    enable_dos: bool = False
    dos_policy_file: str = "/etc/app_protect_dos/policy.json"

    def to_dict(self) -> dict[str, Any]:
        return {
            "server_name": self.server_name,
            "listen": self.listen,
            "policy_file": self.policy_file,
            "log_profile": self.log_profile,
            "log_destination": self.log_destination,
            "upstream": self.upstream,
            "locations": self.locations,
            "enable_dos": self.enable_dos,
            "dos_policy_file": self.dos_policy_file,
        }


def render_server_block(config: NginxAppProtectConfig) -> str:
    """Render a partial NGINX server{} block enabling App Protect."""
    lines = [
        "server {",
        f"    listen {config.listen};",
        f"    server_name {config.server_name};",
        "",
        "    app_protect_enable on;",
        f'    app_protect_policy_file "{config.policy_file}";',
        "    app_protect_security_log_enable on;",
        f'    app_protect_security_log "{config.log_profile}" {config.log_destination};',
    ]

    if config.enable_dos:
        lines.extend(
            [
                "",
                "    app_protect_dos_enable on;",
                f'    app_protect_dos_policy_file "{config.dos_policy_file}";',
            ]
        )

    locations = config.locations or [{"path": "/", "policy_file": config.policy_file}]
    for location in locations:
        path = location.get("path", "/")
        policy = location.get("policy_file", config.policy_file)
        upstream = location.get("upstream", config.upstream)
        lines.extend(
            [
                "",
                f"    location {path} {{",
                "        app_protect_enable on;",
                f'        app_protect_policy_file "{policy}";',
                f"        proxy_pass {upstream};",
                "    }",
            ]
        )

    lines.append("}")
    return "\n".join(lines) + "\n"


def policy_path_for_name(policy_name: str, conf_dir: str = "/etc/app_protect/conf") -> str:
    """Build absolute policy path from a logical policy name."""
    name = policy_name if policy_name.endswith(".json") else f"{policy_name}.json"
    return f"{conf_dir.rstrip('/')}/{name}"

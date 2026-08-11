"""Declarative F5 App Protect policy loading and validation."""

from __future__ import annotations

import json
from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


REQUIRED_POLICY_KEYS = ("name", "template", "enforcementMode")
VALID_ENFORCEMENT_MODES = frozenset({"blocking", "transparent"})
VALID_TEMPLATE_NAMES = frozenset({"POLICY_TEMPLATE_NGINX_BASE", "BASELINE"})


class PolicyValidationError(ValueError):
    """Raised when a policy document is invalid."""


@dataclass
class PolicyDocument:
    """Normalized representation of an App Protect policy file."""

    name: str
    enforcement_mode: str
    template_name: str
    raw: dict[str, Any] = field(repr=False)
    signature_sets: list[dict[str, Any]] = field(default_factory=list)
    bot_defense_enabled: bool = False
    data_guard_enabled: bool = False
    open_api_files: list[str] = field(default_factory=list)

    @property
    def policy_filename(self) -> str:
        return f"{self.name}.json"


def _unwrap_policy(data: dict[str, Any]) -> dict[str, Any]:
    if "policy" in data and isinstance(data["policy"], dict):
        return data["policy"]
    return data


def load_policy(path: str | Path) -> PolicyDocument:
    """Load a policy JSON file into a PolicyDocument."""
    policy_path = Path(path)
    with policy_path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    return validate_policy(data, source=str(policy_path))


def validate_policy(data: dict[str, Any], source: str = "<memory>") -> PolicyDocument:
    """Validate and normalize a policy dict (with or without top-level `policy` key)."""
    if not isinstance(data, dict):
        raise PolicyValidationError(f"{source}: policy root must be an object")

    policy = _unwrap_policy(data)
    missing = [key for key in REQUIRED_POLICY_KEYS if key not in policy]
    if missing:
        raise PolicyValidationError(f"{source}: missing required keys: {', '.join(missing)}")

    name = policy["name"]
    if not isinstance(name, str) or not name.strip():
        raise PolicyValidationError(f"{source}: policy.name must be a non-empty string")

    mode = policy["enforcementMode"]
    if mode not in VALID_ENFORCEMENT_MODES:
        raise PolicyValidationError(
            f"{source}: enforcementMode must be one of {sorted(VALID_ENFORCEMENT_MODES)}"
        )

    template = policy["template"]
    if isinstance(template, dict):
        template_name = template.get("name", "")
    elif isinstance(template, str):
        template_name = template
    else:
        raise PolicyValidationError(f"{source}: template must be a string or object")

    if template_name not in VALID_TEMPLATE_NAMES:
        raise PolicyValidationError(
            f"{source}: unsupported template '{template_name}'"
        )

    signature_sets = policy.get("signature-sets") or policy.get("signature_sets") or []
    if not isinstance(signature_sets, list):
        raise PolicyValidationError(f"{source}: signature-sets must be a list")

    for index, item in enumerate(signature_sets):
        if not isinstance(item, dict) or "name" not in item:
            raise PolicyValidationError(
                f"{source}: signature-sets[{index}] must include a name"
            )

    bot = policy.get("bot-defense") or policy.get("bot_defense") or {}
    bot_enabled = bool(bot.get("settings", {}).get("isEnabled", False)) if isinstance(bot, dict) else False

    data_guard = policy.get("data-guard") or policy.get("data_guard") or {}
    data_guard_enabled = bool(data_guard.get("enabled", False)) if isinstance(data_guard, dict) else False

    open_api = policy.get("open-api-files") or policy.get("open_api_files") or []
    open_api_files: list[str] = []
    if isinstance(open_api, list):
        for entry in open_api:
            if isinstance(entry, dict) and "link" in entry:
                open_api_files.append(str(entry["link"]))
            elif isinstance(entry, str):
                open_api_files.append(entry)

    wrapped = {"policy": policy} if "policy" not in data else data
    return PolicyDocument(
        name=name.strip(),
        enforcement_mode=mode,
        template_name=template_name,
        raw=deepcopy(wrapped),
        signature_sets=list(signature_sets),
        bot_defense_enabled=bot_enabled,
        data_guard_enabled=data_guard_enabled,
        open_api_files=open_api_files,
    )


def merge_policies(base: PolicyDocument, overlay: PolicyDocument) -> PolicyDocument:
    """Shallow-merge overlay policy fields onto base (overlay wins on conflicts)."""
    merged = deepcopy(base.raw)
    base_policy = merged["policy"]
    overlay_policy = overlay.raw["policy"]

    for key, value in overlay_policy.items():
        if key == "name":
            continue
        if isinstance(value, dict) and isinstance(base_policy.get(key), dict):
            base_policy[key] = {**base_policy[key], **value}
        elif isinstance(value, list) and key in {"signature-sets", "signature_sets"}:
            base_policy[key] = _merge_named_lists(base_policy.get(key, []), value)
        else:
            base_policy[key] = deepcopy(value)

    base_policy["name"] = overlay.name or base.name
    return validate_policy(merged, source=f"merge:{base.name}+{overlay.name}")


def _merge_named_lists(
    base_items: list[Any], overlay_items: list[Any]
) -> list[dict[str, Any]]:
    by_name: dict[str, dict[str, Any]] = {}
    for item in base_items:
        if isinstance(item, dict) and "name" in item:
            by_name[item["name"]] = deepcopy(item)
    for item in overlay_items:
        if isinstance(item, dict) and "name" in item:
            existing = by_name.get(item["name"], {})
            by_name[item["name"]] = {**existing, **deepcopy(item)}
    return list(by_name.values())

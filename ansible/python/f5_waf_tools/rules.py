"""Signature / WAF rule pack management by stable rule ID."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Literal


Action = Literal["block", "alarm", "disable", "stage"]


@dataclass(frozen=True)
class SignatureRule:
    """A single attack signature / detection rule identified by ID."""

    rule_id: str
    name: str
    set_name: str
    severity: str = "high"
    accuracy: str = "medium"
    action: Action = "block"
    enabled: bool = True
    tags: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.rule_id,
            "name": self.name,
            "set": self.set_name,
            "severity": self.severity,
            "accuracy": self.accuracy,
            "action": self.action,
            "enabled": self.enabled,
            "tags": list(self.tags),
        }


@dataclass
class RulePack:
    """Versioned collection of signature rules."""

    name: str
    version: str
    rules: list[SignatureRule] = field(default_factory=list)

    def by_id(self) -> dict[str, SignatureRule]:
        return {rule.rule_id: rule for rule in self.rules}

    def get(self, rule_id: str) -> SignatureRule | None:
        return self.by_id().get(str(rule_id))

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RulePack:
        rules = [
            SignatureRule(
                rule_id=str(item["id"]),
                name=item["name"],
                set_name=item.get("set") or item.get("set_name") or "custom",
                severity=item.get("severity", "high"),
                accuracy=item.get("accuracy", "medium"),
                action=item.get("action", "block"),
                enabled=bool(item.get("enabled", True)),
                tags=tuple(item.get("tags") or ()),
            )
            for item in data.get("rules") or []
        ]
        return cls(name=data["name"], version=str(data.get("version", "0.0.0")), rules=rules)


def apply_rule_overrides(
    pack: RulePack,
    overrides: list[dict[str, Any]],
) -> RulePack:
    """
    Apply per-ID overrides to a rule pack.

    Override keys: id (required), action, enabled, severity.
    Unknown IDs raise KeyError.
    """
    rules = {rule.rule_id: rule for rule in pack.rules}
    for override in overrides:
        rule_id = str(override["id"])
        if rule_id not in rules:
            raise KeyError(f"unknown signature rule id: {rule_id}")
        current = rules[rule_id]
        rules[rule_id] = SignatureRule(
            rule_id=current.rule_id,
            name=current.name,
            set_name=current.set_name,
            severity=override.get("severity", current.severity),
            accuracy=current.accuracy,
            action=override.get("action", current.action),
            enabled=override.get("enabled", current.enabled),
            tags=current.tags,
        )
    return RulePack(name=pack.name, version=pack.version, rules=list(rules.values()))


def merge_signature_sets(
    policy_signature_sets: list[dict[str, Any]],
    pack: RulePack,
) -> list[dict[str, Any]]:
    """
    Merge enabled rules from a pack into policy signature-set declarations.

    Returns App Protect-style signature-sets list with alarm/block flags derived
    from per-rule actions.
    """
    sets: dict[str, dict[str, Any]] = {}
    for item in policy_signature_sets:
        name = item["name"]
        sets[name] = deepcopy(item)

    for rule in pack.rules:
        if not rule.enabled or rule.action == "disable":
            continue
        entry = sets.setdefault(
            rule.set_name,
            {"name": rule.set_name, "alarm": True, "block": False},
        )
        entry["alarm"] = True
        if rule.action == "block":
            entry["block"] = True
        signatures = entry.setdefault("signatures", [])
        signatures.append(
            {
                "id": rule.rule_id,
                "name": rule.name,
                "enabled": True,
                "action": rule.action,
            }
        )

    return list(sets.values())

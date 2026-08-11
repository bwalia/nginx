from __future__ import annotations

import pytest

from f5_waf_tools.rules import RulePack, apply_rule_overrides, merge_signature_sets


def test_rule_pack_from_dict(sample_rule_pack_dict):
    pack = RulePack.from_dict(sample_rule_pack_dict)
    assert pack.name == "core-attack-pack"
    assert pack.get("200001475") is not None
    assert pack.get("200001475").action == "block"
    assert pack.get("missing") is None


def test_apply_rule_overrides(sample_rule_pack_dict):
    pack = RulePack.from_dict(sample_rule_pack_dict)
    updated = apply_rule_overrides(
        pack,
        [
            {"id": "200009999", "action": "disable", "enabled": False},
            {"id": "200000098", "action": "alarm"},
        ],
    )
    assert updated.get("200009999").enabled is False
    assert updated.get("200009999").action == "disable"
    assert updated.get("200000098").action == "alarm"
    assert updated.get("200001475").action == "block"


def test_apply_rule_overrides_unknown_id(sample_rule_pack_dict):
    pack = RulePack.from_dict(sample_rule_pack_dict)
    with pytest.raises(KeyError, match="unknown signature rule id"):
        apply_rule_overrides(pack, [{"id": "999999999", "action": "block"}])


def test_merge_signature_sets(sample_rule_pack_dict):
    pack = RulePack.from_dict(sample_rule_pack_dict)
    pack = apply_rule_overrides(pack, [{"id": "200009999", "action": "disable", "enabled": False}])
    merged = merge_signature_sets(
        [{"name": "SQL Injection Signatures", "alarm": True, "block": True}],
        pack,
    )
    names = {item["name"] for item in merged}
    assert "SQL Injection Signatures" in names
    assert "XSS Signatures" in names
    assert "Custom" not in names  # disabled rule excluded

    xss = next(item for item in merged if item["name"] == "XSS Signatures")
    assert xss["block"] is True
    assert any(sig["id"] == "200000098" for sig in xss["signatures"])

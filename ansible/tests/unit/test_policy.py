from __future__ import annotations

import json
from pathlib import Path

import pytest

from f5_waf_tools.policy import (
    PolicyValidationError,
    load_policy,
    merge_policies,
    validate_policy,
)


def test_validate_policy_success(baseline_policy_dict):
    doc = validate_policy(baseline_policy_dict)
    assert doc.name == "baseline_blocking"
    assert doc.enforcement_mode == "blocking"
    assert doc.template_name == "POLICY_TEMPLATE_NGINX_BASE"
    assert doc.bot_defense_enabled is True
    assert doc.data_guard_enabled is True
    assert len(doc.signature_sets) == 2
    assert doc.policy_filename == "baseline_blocking.json"


def test_validate_policy_accepts_unwrapped_root():
    doc = validate_policy(
        {
            "name": "plain",
            "template": "POLICY_TEMPLATE_NGINX_BASE",
            "enforcementMode": "transparent",
        }
    )
    assert doc.enforcement_mode == "transparent"
    assert "policy" in doc.raw


def test_validate_policy_rejects_bad_mode(baseline_policy_dict):
    baseline_policy_dict["policy"]["enforcementMode"] = "enforce-hard"
    with pytest.raises(PolicyValidationError, match="enforcementMode"):
        validate_policy(baseline_policy_dict)


def test_validate_policy_rejects_missing_name():
    with pytest.raises(PolicyValidationError, match="missing required keys"):
        validate_policy(
            {
                "policy": {
                    "template": {"name": "POLICY_TEMPLATE_NGINX_BASE"},
                    "enforcementMode": "blocking",
                }
            }
        )


def test_validate_policy_rejects_bad_signature_set(baseline_policy_dict):
    baseline_policy_dict["policy"]["signature-sets"] = ["not-an-object"]
    with pytest.raises(PolicyValidationError, match="signature-sets\\[0\\]"):
        validate_policy(baseline_policy_dict)


def test_load_policy_from_fixture(fixtures_dir: Path):
    path = fixtures_dir / "baseline_blocking.json"
    doc = load_policy(path)
    assert doc.name == "baseline_blocking"
    assert any(s["name"] == "SQL Injection Signatures" for s in doc.signature_sets)


def test_merge_policies_overlay_wins(baseline_policy_dict):
    base = validate_policy(baseline_policy_dict)
    overlay = validate_policy(
        {
            "policy": {
                "name": "ob_fapi_blocking",
                "template": {"name": "POLICY_TEMPLATE_NGINX_BASE"},
                "enforcementMode": "blocking",
                "signature-sets": [
                    {"name": "SQL Injection Signatures", "alarm": True, "block": False},
                    {"name": "Command Execution Signatures", "alarm": True, "block": True},
                ],
                "open-api-files": [{"link": "file:///etc/app_protect/ob.yaml"}],
                "data-guard": {"enabled": False},
            }
        }
    )
    merged = merge_policies(base, overlay)
    assert merged.name == "ob_fapi_blocking"
    assert merged.data_guard_enabled is False
    assert merged.open_api_files == ["file:///etc/app_protect/ob.yaml"]
    sqli = next(s for s in merged.signature_sets if s["name"] == "SQL Injection Signatures")
    assert sqli["block"] is False
    assert any(s["name"] == "Command Execution Signatures" for s in merged.signature_sets)


def test_load_policy_roundtrip_json(tmp_path: Path, baseline_policy_dict):
    path = tmp_path / "p.json"
    path.write_text(json.dumps(baseline_policy_dict), encoding="utf-8")
    doc = load_policy(path)
    assert doc.raw["policy"]["name"] == "baseline_blocking"

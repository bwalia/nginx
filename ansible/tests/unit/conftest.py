from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
PYTHON_SRC = ROOT / "python"
sys.path.insert(0, str(PYTHON_SRC))

FIXTURES = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES


@pytest.fixture
def baseline_policy_dict() -> dict:
    return {
        "policy": {
            "name": "baseline_blocking",
            "template": {"name": "POLICY_TEMPLATE_NGINX_BASE"},
            "enforcementMode": "blocking",
            "signature-sets": [
                {"name": "SQL Injection Signatures", "alarm": True, "block": True},
                {"name": "XSS Signatures", "alarm": True, "block": True},
            ],
            "bot-defense": {"settings": {"isEnabled": True}},
            "data-guard": {"enabled": True, "maskData": True},
        }
    }


@pytest.fixture
def sample_rule_pack_dict() -> dict:
    return {
        "name": "core-attack-pack",
        "version": "2026.08.01",
        "rules": [
            {
                "id": "200001475",
                "name": "SQL Injection (Union)",
                "set": "SQL Injection Signatures",
                "severity": "critical",
                "action": "block",
                "enabled": True,
                "tags": ["sqli", "owasp-a03"],
            },
            {
                "id": "200000098",
                "name": "Cross Site Scripting",
                "set": "XSS Signatures",
                "severity": "high",
                "action": "block",
                "enabled": True,
                "tags": ["xss"],
            },
            {
                "id": "200009999",
                "name": "Noisy low-value sig",
                "set": "Custom",
                "severity": "low",
                "action": "alarm",
                "enabled": True,
            },
        ],
    }

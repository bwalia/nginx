from __future__ import annotations

from f5_waf_tools.bindings import BindingResolver, ServiceBinding


def test_resolve_global_fallback():
    resolver = BindingResolver(global_policy="baseline_blocking", bindings=[])
    result = resolver.resolve("unknown.example", service="web", path="/")
    assert result["policy"] == "baseline_blocking"
    assert result["source"] == "global"


def test_resolve_domain_service():
    resolver = BindingResolver(
        global_policy="baseline_blocking",
        bindings=[
            ServiceBinding(
                domain="api.meridianbank.example",
                service="open-banking",
                policy="ob_fapi_blocking",
            )
        ],
    )
    result = resolver.resolve("api.meridianbank.example", "open-banking", "/open-banking/v3.1/aisp/accounts")
    assert result["policy"] == "ob_fapi_blocking"
    assert result["source"] == "service"


def test_longest_route_wins():
    resolver = BindingResolver(
        global_policy="baseline_blocking",
        bindings=[
            ServiceBinding(
                domain="secure.meridianbank.example",
                service="internet-banking",
                policy="rib_blocking_pci",
                routes=("/api/",),
            ),
            ServiceBinding(
                domain="secure.meridianbank.example",
                service="internet-banking",
                policy="rib_auth_hardening",
                routes=("/api/v2/auth/", "/auth/"),
            ),
        ],
    )
    result = resolver.resolve(
        "secure.meridianbank.example",
        "internet-banking",
        "/api/v2/auth/login",
    )
    assert result["policy"] == "rib_auth_hardening"
    assert result["source"] == "route"


def test_case_insensitive_domain():
    resolver = BindingResolver.from_dict(
        {
            "global_policy": "baseline_blocking",
            "bindings": [
                {
                    "domain": "Pay.MeridianBank.Example",
                    "service": "card-payments",
                    "policy": "pay_pci_acquiring",
                    "routes": ["/v1/"],
                }
            ],
        }
    )
    result = resolver.resolve("pay.meridianbank.example", "card-payments", "/v1/authorizations")
    assert result["policy"] == "pay_pci_acquiring"


def test_service_filter_excludes_other_services():
    resolver = BindingResolver(
        global_policy="baseline_blocking",
        bindings=[
            ServiceBinding("api.example", "open-banking", "ob_fapi_blocking"),
            ServiceBinding("api.example", "admin", "admin_blocking"),
        ],
    )
    result = resolver.resolve("api.example", "admin", "/")
    assert result["policy"] == "admin_blocking"

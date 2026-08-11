from __future__ import annotations

from f5_waf_tools.nginx import NginxAppProtectConfig, policy_path_for_name, render_server_block


def test_policy_path_for_name():
    assert policy_path_for_name("baseline_blocking") == "/etc/app_protect/conf/baseline_blocking.json"
    assert (
        policy_path_for_name("ob.json", conf_dir="/opt/waf")
        == "/opt/waf/ob.json"
    )


def test_render_server_block_includes_app_protect():
    config = NginxAppProtectConfig(
        server_name="api.meridianbank.example",
        policy_file="/etc/app_protect/conf/ob_fapi_blocking.json",
        locations=[
            {
                "path": "/open-banking/",
                "policy_file": "/etc/app_protect/conf/ob_fapi_blocking.json",
                "upstream": "http://ob-api-gateway",
            }
        ],
    )
    rendered = render_server_block(config)
    assert "server_name api.meridianbank.example;" in rendered
    assert "app_protect_enable on;" in rendered
    assert 'app_protect_policy_file "/etc/app_protect/conf/ob_fapi_blocking.json";' in rendered
    assert "location /open-banking/" in rendered
    assert "proxy_pass http://ob-api-gateway;" in rendered
    assert "app_protect_dos_enable" not in rendered


def test_render_server_block_with_dos():
    config = NginxAppProtectConfig(
        server_name="secure.meridianbank.example",
        enable_dos=True,
        dos_policy_file="/etc/app_protect_dos/login.json",
    )
    rendered = render_server_block(config)
    assert "app_protect_dos_enable on;" in rendered
    assert 'app_protect_dos_policy_file "/etc/app_protect_dos/login.json";' in rendered

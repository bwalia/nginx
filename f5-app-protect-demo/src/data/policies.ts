export interface PolicyDoc {
  id: string
  name: string
  summary: string
  tags: string[]
  json: string
}

export const policies: PolicyDoc[] = [
  {
    id: 'baseline',
    name: 'baseline_blocking',
    summary: 'Default-style blocking policy with OWASP-oriented signature sets.',
    tags: ['WAF', 'OWASP', 'Blocking'],
    json: `{
  "policy": {
    "name": "baseline_blocking",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "applicationLanguage": "utf-8",
    "enforcementMode": "blocking",
    "signature-sets": [
      { "name": "SQL Injection Signatures", "alarm": true, "block": true },
      { "name": "XSS Signatures", "alarm": true, "block": true },
      { "name": "Command Execution Signatures", "alarm": true, "block": true },
      { "name": "Path Traversal Signatures", "alarm": true, "block": true }
    ],
    "bot-defense": {
      "settings": { "isEnabled": true },
      "mitigations": {
        "classes": [
          { "name": "trusted-bot", "action": "alarm" },
          { "name": "untrusted-bot", "action": "block" },
          { "name": "malicious-bot", "action": "block" }
        ]
      }
    }
  }
}`,
  },
  {
    id: 'api',
    name: 'api_openapi_guard',
    summary: 'Positive security from an OpenAPI file plus JSON profile limits.',
    tags: ['API', 'OpenAPI', 'JSON'],
    json: `{
  "policy": {
    "name": "api_openapi_guard",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "enforcementMode": "blocking",
    "open-api-files": [
      { "link": "file:///etc/app_protect/conf/petstore.yaml" }
    ],
    "json-profiles": [
      {
        "name": "Default",
        "defenseAttributes": {
          "maximumTotalLengthOfJSONData": 10000,
          "maximumArrayLength": 100,
          "maximumStructureDepth": 10,
          "maximumValueLength": 1024
        }
      }
    ],
    "data-guard": {
      "enabled": true,
      "maskData": true,
      "creditCardNumbers": true,
      "usSocialSecurityNumbers": true
    }
  }
}`,
  },
  {
    id: 'transparent',
    name: 'onboarding_transparent',
    summary: 'Alarm-only mode for safe rollout before flipping to blocking.',
    tags: ['Staging', 'Transparent'],
    json: `{
  "policy": {
    "name": "onboarding_transparent",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "enforcementMode": "transparent",
    "signature-sets": [
      { "name": "All Signatures", "alarm": true, "block": false }
    ],
    "blocking-settings": {
      "violations": [
        { "name": "VIOL_ATTACK_SIGNATURE", "alarm": true, "block": false },
        { "name": "VIOL_BOT_CLIENT", "alarm": true, "block": false }
      ]
    }
  }
}`,
  },
  {
    id: 'geo',
    name: 'geo_ip_intel',
    summary: 'Country deny list plus IP intelligence enforcement.',
    tags: ['Geo', 'IP Intelligence'],
    json: `{
  "policy": {
    "name": "geo_ip_intel",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "enforcementMode": "blocking",
    "disallowed-geolocations": [
      { "countryCode": "KP" },
      { "countryCode": "SS" }
    ],
    "ip-intelligence": {
      "enabled": true
    },
    "blocking-settings": {
      "violations": [
        { "name": "VIOL_GEOLOCATION", "alarm": true, "block": true },
        { "name": "VIOL_MALICIOUS_IP", "alarm": true, "block": true }
      ]
    }
  }
}`,
  },
]

export const nginxSnippet = `user nginx;
worker_processes auto;

load_module modules/ngx_http_app_protect_module.so;

http {
  app_protect_enable on;
  app_protect_policy_file "/etc/app_protect/conf/baseline_blocking.json";
  app_protect_security_log_enable on;
  app_protect_security_log "/etc/app_protect/conf/log_default.json" syslog:server=127.0.0.1:514;

  server {
    listen 443 ssl;
    server_name api.example.com;

    location / {
      app_protect_enable on;
      proxy_pass http://upstream_app;
    }
  }
}`

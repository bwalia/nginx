export interface PolicyDoc {
  id: string
  name: string
  service: string
  summary: string
  tags: string[]
  json: string
}

export const policies: PolicyDoc[] = [
  {
    id: 'rib',
    name: 'rib_blocking_pci',
    service: 'Retail Internet Banking',
    summary:
      'Blocking policy for secure.meridianbank.example — signatures, bots, brute-force on login/SCA, cookie enforcement, Data Guard.',
    tags: ['PCI', 'PSD2 SCA', 'ATO', 'Data Guard'],
    json: `{
  "policy": {
    "name": "rib_blocking_pci",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "applicationLanguage": "utf-8",
    "enforcementMode": "blocking",
    "signature-sets": [
      { "name": "SQL Injection Signatures", "alarm": true, "block": true },
      { "name": "XSS Signatures", "alarm": true, "block": true },
      { "name": "Command Execution Signatures", "alarm": true, "block": true },
      { "name": "Path Traversal Signatures", "alarm": true, "block": true },
      { "name": "SSRF Signatures", "alarm": true, "block": true }
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
    },
    "brute-force-attack-preventions": [
      {
        "url": { "name": "/auth/login" },
        "loginConfigurations": { "usernameParameterName": "username", "passwordParameterName": "password" },
        "sourceBasedProtectionDetectionPeriod": 60,
        "maxLoginAttempts": { "action": "block", "threshold": 5 }
      },
      {
        "url": { "name": "/auth/sca/verify" },
        "sourceBasedProtectionDetectionPeriod": 60,
        "maxLoginAttempts": { "action": "block", "threshold": 5 }
      }
    ],
    "data-guard": {
      "enabled": true,
      "maskData": true,
      "creditCardNumbers": true,
      "usSocialSecurityNumbers": true
    },
    "cookie-settings": {
      "maximumCookieHeaderLength": 4096
    }
  }
}`,
  },
  {
    id: 'ob',
    name: 'ob_fapi_blocking',
    service: 'Open Banking APIs',
    summary:
      'OpenAPI-backed positive security for OBIE v3.1 AIS/PIS with JWT protection and HTTP compliance.',
    tags: ['Open Banking', 'FAPI', 'JWT', 'BOLA defence'],
    json: `{
  "policy": {
    "name": "ob_fapi_blocking",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "enforcementMode": "blocking",
    "open-api-files": [
      { "link": "file:///etc/app_protect/conf/obie-v3.1-aisp-pisp.yaml" }
    ],
    "json-profiles": [
      {
        "name": "OB_JSON",
        "defenseAttributes": {
          "maximumTotalLengthOfJSONData": 65536,
          "maximumArrayLength": 200,
          "maximumStructureDepth": 12,
          "maximumValueLength": 4096
        }
      }
    ],
    "blocking-settings": {
      "violations": [
        { "name": "VIOL_JSON_FORMAT", "alarm": true, "block": true },
        { "name": "VIOL_JWT", "alarm": true, "block": true },
        { "name": "VIOL_HTTP_PROTOCOL", "alarm": true, "block": true },
        { "name": "VIOL_URL", "alarm": true, "block": true }
      ]
    }
  }
}`,
  },
  {
    id: 'pay',
    name: 'pay_pci_acquiring',
    service: 'Card & Acquiring',
    summary:
      'Card authorisation and FX quote protection with strict JSON limits and Data Guard on receipts.',
    tags: ['PCI DSS', '3DS2', 'Data Guard'],
    json: `{
  "policy": {
    "name": "pay_pci_acquiring",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "enforcementMode": "blocking",
    "open-api-files": [
      { "link": "file:///etc/app_protect/conf/payments-v1.yaml" }
    ],
    "json-profiles": [
      {
        "name": "PAY_JSON",
        "defenseAttributes": {
          "maximumTotalLengthOfJSONData": 16384,
          "maximumStructureDepth": 10,
          "maximumValueLength": 2048
        }
      }
    ],
    "data-guard": {
      "enabled": true,
      "maskData": true,
      "creditCardNumbers": true
    },
    "bot-defense": {
      "settings": { "isEnabled": true }
    }
  }
}`,
  },
  {
    id: 'wire',
    name: 'corp_sepa_sanctions',
    service: 'Corporate Wire & SEPA',
    summary:
      'XML profile for pain.001 (no external entities), geo deny-lists, and high-value wire JSON schema.',
    tags: ['ISO 20022', 'XXE', 'Sanctions'],
    json: `{
  "policy": {
    "name": "corp_sepa_sanctions",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "enforcementMode": "blocking",
    "xml-profiles": [
      {
        "name": "PAIN001",
        "defenseAttributes": {
          "allowDTDs": false,
          "allowExternalReferences": false,
          "maximumStructureDepth": 20,
          "maximumTotalLengthOfXMLData": 1048576
        }
      }
    ],
    "disallowed-geolocations": [
      { "countryCode": "KP" },
      { "countryCode": "IR" },
      { "countryCode": "SY" }
    ],
    "ip-intelligence": { "enabled": true }
  }
}`,
  },
  {
    id: 'wealth',
    name: 'wealth_graphql_hardening',
    service: 'Wealth GraphQL',
    summary:
      'GraphQL defence for private banking — no introspection, tight depth/batch, signatures on arguments.',
    tags: ['GraphQL', 'HNW', 'MiFID'],
    json: `{
  "policy": {
    "name": "wealth_graphql_hardening",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "enforcementMode": "blocking",
    "graphql-profiles": [
      {
        "name": "WM_GQL",
        "defenseAttributes": {
          "maximumBatchedQueries": 1,
          "maximumQueryCost": 200,
          "maximumStructureDepth": 7,
          "allowIntrospectionQueries": false
        }
      }
    ]
  }
}`,
  },
  {
    id: 'transparent',
    name: 'onboarding_transparent',
    service: 'All (staging)',
    summary:
      'Alarm-only pack used when onboarding a new banking hostname before flipping to blocking.',
    tags: ['Staging', 'Transparent', 'SOC tune'],
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
        { "name": "VIOL_BOT_CLIENT", "alarm": true, "block": false },
        { "name": "VIOL_JSON_FORMAT", "alarm": true, "block": false }
      ]
    }
  }
}`,
  },
]

export const nginxSnippet = `# Meridian edge — Open Banking example
load_module modules/ngx_http_app_protect_module.so;

http {
  app_protect_enable on;
  app_protect_policy_file "/etc/app_protect/conf/ob_fapi_blocking.json";
  app_protect_security_log_enable on;
  app_protect_security_log "/etc/app_protect/conf/log_bank_verbose.json"
    syslog:server=siem.meridian.internal:514;

  # Optional behavioural DoS on login / AIS
  # app_protect_dos_enable on;
  # app_protect_dos_policy_file "/etc/app_protect_dos/bank_dos.json";

  server {
    listen 443 ssl http2;
    server_name api.meridianbank.example;

    location /open-banking/ {
      app_protect_enable on;
      proxy_pass http://ob-api-gateway;
      proxy_set_header X-Fapi-Interaction-Id $http_x_fapi_interaction_id;
    }
  }
}`

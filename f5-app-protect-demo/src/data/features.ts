export type FeatureCategory =
  | 'core'
  | 'threats'
  | 'api'
  | 'access'
  | 'ops'

export interface FeatureSlide {
  id: string
  category: FeatureCategory
  eyebrow: string
  title: string
  subtitle: string
  bullets: string[]
  demoHint: string
  policySnippet?: string
  metric?: { label: string; value: string }
}

export const categoryLabels: Record<FeatureCategory, string> = {
  core: 'Platform',
  threats: 'Threat Defense',
  api: 'API Security',
  access: 'Access & Privacy',
  ops: 'Ops & Deploy',
}

export const slides: FeatureSlide[] = [
  {
    id: 'title',
    category: 'core',
    eyebrow: 'F5 WAF for NGINX',
    title: 'App Protect Platform',
    subtitle:
      'Lightweight, high-performance application and API security that runs natively inside NGINX Plus — built for DevOps, Kubernetes, and GitOps.',
    bullets: [
      'Formerly NGINX App Protect WAF — now F5 WAF for NGINX',
      'OWASP Top 10, bots, L7 DoS, API schemas, and threat intel',
      'Declarative JSON/YAML policies for security-as-code',
    ],
    demoHint: 'Use ← → or the controls to walk every capability.',
    metric: { label: 'Attack signatures', value: '7,800+' },
  },
  {
    id: 'overview',
    category: 'core',
    eyebrow: 'Platform overview',
    title: 'One engine. Many surfaces.',
    subtitle:
      'App Protect brings F5 Advanced WAF technology into the NGINX data path — no extra hop, no sidecar tax, sub-millisecond inspection for modern apps.',
    bullets: [
      'Native dynamic module on NGINX Plus & NGINX Ingress Controller',
      'Positive + negative security models in one policy',
      'Works on VM/bare metal, Docker, and Kubernetes',
      'Part of NGINX One premium packages',
    ],
    demoHint: 'Next: how traffic flows through the enforcement engine.',
  },
  {
    id: 'architecture',
    category: 'core',
    eyebrow: 'Architecture',
    title: 'Inspect in the data path',
    subtitle:
      'Requests hit NGINX, pass through the App Protect plugin, then the enforcement engine evaluates signatures, bots, schemas, and policy overrides before proxying upstream.',
    bullets: [
      'app-protect-plugin bridges NGINX ↔ enforcement engine',
      'Compiler agent turns declarative policy into runtime config',
      'Signature / bot / threat campaign packages update independently',
      'Security logs stream to file, syslog, or SIEM',
    ],
    demoHint: 'See the Architecture page for deployment topologies.',
  },
  {
    id: 'security-as-code',
    category: 'ops',
    eyebrow: 'Security as code',
    title: 'Policies travel with the app',
    subtitle:
      'Define protection in JSON or YAML, version it in Git, and ship through the same CI/CD pipeline as your services.',
    bullets: [
      'Declarative policy model (POLICY_TEMPLATE_NGINX_BASE)',
      'Blocking or transparent (alarm-only) enforcement modes',
      'Override rules for path-, IP-, or header-specific exceptions',
      'Fits GitOps with NGINX Instance Manager / NGINX One',
    ],
    demoHint: 'Open Policy Explorer to inspect sample policies.',
    policySnippet: `{
  "policy": {
    "name": "api_blocking_policy",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "enforcementMode": "blocking"
  }
}`,
  },
  {
    id: 'attack-signatures',
    category: 'threats',
    eyebrow: 'Attack signatures',
    title: 'OWASP Top 10, covered',
    subtitle:
      'Thousands of regularly updated signatures detect SQLi, XSS, RCE, path traversal, and more — with sets you can enable, disable, or stage.',
    bullets: [
      'Default policy maps to OWASP Top 10 attack patterns',
      'Server-technology signatures (PHP, Node, Java, …)',
      'User-defined signatures for custom threat patterns',
      'Time-based signature staging: log first, enforce later',
    ],
    demoHint: 'Lab: fire SQLi / XSS payloads and watch them block.',
    metric: { label: 'Update cadence', value: 'Frequent' },
    policySnippet: `{
  "signature-sets": [
    { "name": "SQL Injection Signatures", "alarm": true, "block": true },
    { "name": "XSS Signatures", "alarm": true, "block": true }
  ]
}`,
  },
  {
    id: 'threat-campaigns',
    category: 'threats',
    eyebrow: 'Threat campaigns',
    title: 'Campaign-grade intel',
    subtitle:
      'F5 Threat Labs patterns detect known attack campaigns with near-zero false positives — complementary to broad signature coverage.',
    bullets: [
      'Context-aware patterns for active campaigns',
      'Updated more frequently than base signatures',
      'Enabled in the default policy via dedicated violation',
      'Packages installable via NGINX Instance Manager',
    ],
    demoHint: 'Threat campaigns catch what generic signatures may miss.',
  },
  {
    id: 'bot-protection',
    category: 'threats',
    eyebrow: 'Bot protection',
    title: 'Know the client',
    subtitle:
      'Bot signatures classify trusted, untrusted, and malicious automation — scrapers, credential stuffers, and DoS bots included.',
    bullets: [
      'Trusted bots (search crawlers) can be allowed',
      'Malicious / suspicious classes default to block',
      'Header and signature inspection for client identity',
      'User-defined browser control for allow/deny lists',
    ],
    demoHint: 'Lab: send a malicious User-Agent and see bot class block.',
    policySnippet: `{
  "bot-defense": {
    "settings": { "isEnabled": true },
    "mitigations": {
      "classes": [
        { "name": "trusted-bot", "action": "alarm" },
        { "name": "malicious-bot", "action": "block" }
      ]
    }
  }
}`,
  },
  {
    id: 'dos',
    category: 'threats',
    eyebrow: 'Layer 7 DoS',
    title: 'Behavioral DoS defense',
    subtitle:
      'F5 DoS for NGINX learns normal traffic, then mitigates slowloris, heavy URLs, bad actors, and TLS-fingerprint abuse — with an optional L4 accelerated path.',
    bullets: [
      'Automatic bad-actor detection and stress monitoring',
      'Protected-object metrics via REST API + dashboard',
      'L4 accelerated mitigation / optional SYN drop',
      'Works alongside WAF policy on the same NGINX',
    ],
    demoHint: 'Architecture page shows WAF + DoS co-location.',
    metric: { label: 'Focus', value: 'L7 stress' },
  },
  {
    id: 'evasion-http',
    category: 'threats',
    eyebrow: 'Protocol & evasion',
    title: 'No sneaky encoding tricks',
    subtitle:
      'HTTP compliance and evasion checks catch directory traversal, bad escapes, malformed versions, and protocol abuse before content inspection.',
    bullets: [
      'HTTP compliance enabled by default',
      'Evasion techniques: traversal, multiple encoding, …',
      'Allowed methods and filetype allow/deny lists',
      'Response signature checks on status and length',
    ],
    demoHint: 'Lab includes path-traversal and illegal method probes.',
  },
  {
    id: 'api-security',
    category: 'api',
    eyebrow: 'API security',
    title: 'Contract-first protection',
    subtitle:
      'Import OpenAPI / Swagger specs to auto-build positive security for URLs, methods, and parameters — then layer signatures on top.',
    bullets: [
      'Schema validation for JSON & XML content profiles',
      'Max depth, length, and element-count restrictions',
      'Mitigates OWASP API Top 10 classes of abuse',
      'Ideal overlay for Kong, Apigee, MuleSoft, and more',
    ],
    demoHint: 'Policy Explorer includes an OpenAPI-backed sample.',
    policySnippet: `{
  "open-api-files": [
    { "link": "file:///etc/app_protect/api/petstore.yaml" }
  ],
  "json-profiles": [
    { "name": "Default", "defenseAttributes": { "maximumTotalLengthOfJSONData": 10000 } }
  ]
}`,
  },
  {
    id: 'graphql',
    category: 'api',
    eyebrow: 'GraphQL protection',
    title: 'Tame the query graph',
    subtitle:
      'Dedicated GraphQL enforcement parses queries, applies signatures to values, and constrains introspection, depth, and batching abuse.',
    bullets: [
      'GraphQL-specific content profile + shared library',
      'Detect malformed queries and injection in arguments',
      'Size and structure limits for nested selections',
      'Works for HTTP-based GraphQL endpoints',
    ],
    demoHint: 'Lab: oversized / introspective GraphQL payload.',
  },
  {
    id: 'grpc',
    category: 'api',
    eyebrow: 'gRPC protection',
    title: 'Protobuf-aware WAF',
    subtitle:
      'Attach IDL files; App Protect parses well-formed gRPC, extracts text fields for signatures, enforces sizes, and rejects unknown fields.',
    bullets: [
      'Unary and bidirectional streaming supported',
      'Malformed content detection at the protobuf layer',
      'IDL-driven positive security for service methods',
      'Meta-character checks on extracted string fields',
    ],
    demoHint: 'Great for mesh and microservice east-west APIs.',
  },
  {
    id: 'jwt',
    category: 'api',
    eyebrow: 'JWT protection',
    title: 'Token shape matters',
    subtitle:
      'Inspect JWT header and signature properties in policy — catch alg=none, unexpected claims structure, and malformed tokens early.',
    bullets: [
      'Configure enforcement on JWT properties',
      'Complements API gateway auth decisions',
      'Blocks structurally invalid bearer tokens',
      'Pairs with URL / parameter user-defined rules',
    ],
    demoHint: 'Lab: send alg=none JWT and observe the block.',
  },
  {
    id: 'data-guard',
    category: 'access',
    eyebrow: 'Data Guard',
    title: 'Mask what leaves the app',
    subtitle:
      'Scan responses for credit card numbers, US SSNs, and custom patterns — then mask sensitive data before it reaches the client.',
    bullets: [
      'CCN and SSN detection (disabled by default)',
      'Custom pattern support for org-specific secrets',
      'Reduces accidental PII / PCI leakage',
      'Complements response signature inspection',
    ],
    demoHint: 'Lab: leak a fake PAN and watch it get masked.',
    policySnippet: `{
  "data-guard": {
    "enabled": true,
    "maskData": true,
    "creditCardNumbers": true,
    "usSocialSecurityNumbers": true
  }
}`,
  },
  {
    id: 'brute-force',
    category: 'access',
    eyebrow: 'Brute force',
    title: 'Lock the login door',
    subtitle:
      'Rate and count failed authentications against configured URLs to stop credential stuffing and password spraying.',
    bullets: [
      'Per-URL brute-force attack prevention parameters',
      'Detects repeated login failures from one source',
      'Works with bot defense for stuffing campaigns',
      'Alarm or block based on policy thresholds',
    ],
    demoHint: 'Lab simulates rapid /login failures.',
  },
  {
    id: 'cookies',
    category: 'access',
    eyebrow: 'Cookie enforcement',
    title: 'Session integrity',
    subtitle:
      'Enforce cookie integrity and set HttpOnly, Secure, and SameSite attributes on cookies discovered in responses.',
    bullets: [
      'Default: cookies allowed without integrity checks',
      'Add explicit or wildcard cookies to enforce',
      'Harden session cookies against tampering',
      'Aligns browser security attributes automatically',
    ],
    demoHint: 'Useful for session-fixation and cookie-tamper demos.',
  },
  {
    id: 'geo-ip',
    category: 'access',
    eyebrow: 'Geo & IP intel',
    title: 'Where — and who — is calling',
    subtitle:
      'Geolocation (ISO country codes), IP allow/deny lists, and IP Intelligence reputation categories shape enforcement by source risk.',
    bullets: [
      'Geolocation package for country-based rules',
      'IP address lists with shared attributes',
      'IP Intelligence: botnets, scanners, Tor, spam, …',
      'XFF trusted headers for proxied client IPs',
    ],
    demoHint: 'Lab: blocked geo and high-risk IP reputation.',
    policySnippet: `{
  "disallowed-geolocations": [
    { "countryCode": "KP" }
  ],
  "ip-intelligence": {
    "enabled": true
  }
}`,
  },
  {
    id: 'filetypes-methods',
    category: 'access',
    eyebrow: 'Surface control',
    title: 'Only the verbs & files you want',
    subtitle:
      'Constrain HTTP methods and file type extensions so backup files, admin scripts, and exotic verbs never reach the origin.',
    bullets: [
      'Allowed methods check (defaults cover standard verbs)',
      'Disallowed file type extensions with a rich default list',
      'Selective filetype allow lists for uploads/downloads',
      'Do-nothing URLs to skip inspection where needed',
    ],
    demoHint: 'Lab: request /.env and /backup.sql.',
  },
  {
    id: 'overrides-staging',
    category: 'ops',
    eyebrow: 'Tuning',
    title: 'Stage, then enforce',
    subtitle:
      'Override rules and time-based signature staging let you roll protection out safely — log violations first, then flip to blocking.',
    bullets: [
      'Override default policy under specific conditions',
      'Stage signatures for a configured time window',
      'User-defined URLs, parameters, and headers',
      'Transparent mode for greenfield onboarding',
    ],
    demoHint: 'Policies show transparent → blocking progression.',
  },
  {
    id: 'logging',
    category: 'ops',
    eyebrow: 'Visibility',
    title: 'Every decision, logged',
    subtitle:
      'Security logs capture violations, bot class, support IDs, and request context for SIEM, NGINX Instance Manager, and Security Monitoring dashboards.',
    bullets: [
      'Configurable log profiles (compact / verbose)',
      'Syslog, file, or stderr destinations',
      'Correlation via support ID on block pages',
      'DoS dashboard for protected-object health',
    ],
    demoHint: 'The Lab streams a live security event console.',
  },
  {
    id: 'kubernetes',
    category: 'ops',
    eyebrow: 'Cloud native',
    title: 'Protect at the Ingress',
    subtitle:
      'NGINX Ingress Controller ships native App Protect support — attach policies per Ingress via annotations or CRDs.',
    bullets: [
      'WAF + DoS in the same Ingress Controller pod',
      'Per-service / per-route policy binding',
      'Declarative Kubernetes-native management',
      'Scales with your cluster, not a central appliance',
    ],
    demoHint: 'Architecture page diagrams Ingress integration.',
  },
  {
    id: 'summary',
    category: 'core',
    eyebrow: 'Wrap-up',
    title: 'Ship apps. Keep them safe.',
    subtitle:
      'F5 App Protect gives DevOps a WAF that feels like infrastructure-as-code — and gives security teams F5-grade protection without a parallel proxy estate.',
    bullets: [
      'WAF + bots + DoS + API schemas + threat intel',
      'Runs where NGINX runs: VM, container, Kubernetes',
      'Try the Attack Lab, then inspect the Policy Explorer',
      'Docs: docs.nginx.com/waf',
    ],
    demoHint: 'Jump to Attack Lab to fire live demo scenarios.',
    metric: { label: 'Next step', value: 'Attack Lab' },
  },
]

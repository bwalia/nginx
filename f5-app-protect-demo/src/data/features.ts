export type FeatureCategory =
  | 'core'
  | 'threats'
  | 'api'
  | 'access'
  | 'ops'
  | 'banking'

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
  bankingCase?: string
}

export const categoryLabels: Record<FeatureCategory, string> = {
  core: 'Platform',
  banking: 'Banking',
  threats: 'Threat Defense',
  api: 'API Security',
  access: 'Access & Privacy',
  ops: 'Ops & Deploy',
}

export const slides: FeatureSlide[] = [
  {
    id: 'title',
    category: 'banking',
    eyebrow: 'Meridian Digital Bank × F5',
    title: 'App Protect for banking web services',
    subtitle:
      'A SOC-ready walkthrough of F5 WAF for NGINX protecting retail banking, Open Banking APIs, card acquiring, mobile BFFs, corporate wires, and wealth GraphQL — with real attack narratives.',
    bullets: [
      'Six production-like banking services behind one enforcement engine',
      '35+ complex scenarios: BOLA, XXE in SEPA, JWT alg=none, Data Guard, L7 DoS…',
      'Declarative policies mapped to PCI DSS, PSD2, FAPI, and sanctions controls',
    ],
    demoHint: 'Use ← → to walk the estate, then open the Attack Lab.',
    metric: { label: 'Lab scenarios', value: '35+' },
    bankingCase: 'Reference customer: Meridian Digital Bank plc (fictional).',
  },
  {
    id: 'estate',
    category: 'banking',
    eyebrow: 'Protected estate',
    title: 'One WAF, six banking surfaces',
    subtitle:
      'Internet Banking, Open Banking AIS/PIS, card payments, mobile gRPC BFF, corporate SEPA/wires, and wealth GraphQL share policy primitives — with service-specific overrides.',
    bullets: [
      'Edge: NGINX Plus + App Protect on each public hostname',
      'Positive security from OpenAPI / IDL where contracts exist',
      'Negative security (signatures, bots, campaigns) everywhere',
      'Data Guard on any response that might touch CHD or PII',
    ],
    demoHint: 'Architecture page diagrams the Meridian reference topology.',
    bankingCase:
      'Hosts: secure. · api. · pay. · mobile. · corp. · wealth.meridianbank.example',
  },
  {
    id: 'overview',
    category: 'core',
    eyebrow: 'Platform',
    title: 'F5-grade WAF in the NGINX path',
    subtitle:
      'Formerly NGINX App Protect WAF — now F5 WAF for NGINX. No extra hop, sub-millisecond inspection, declarative JSON policies for GitOps.',
    bullets: [
      'Native module on NGINX Plus & Ingress Controller',
      'OWASP Top 10 + API Top 10 defence in depth',
      'Bots, L7 DoS, threat campaigns, IP intelligence',
      'VM, Docker, or Kubernetes — same policy artefact',
    ],
    demoHint: 'Next: how a fraudulent payment attempt is stopped.',
  },
  {
    id: 'fraud-story',
    category: 'banking',
    eyebrow: 'Narrative',
    title: 'Anatomy of a blocked APP fraud chain',
    subtitle:
      'Attackers stuff credentials, spray OTPs, inject XSS into memos, then initiate a high-value PIS payment with a forged JWT — App Protect breaks the chain at multiple hops.',
    bullets: [
      'Bot + brute-force on /auth/login and /auth/sca/verify',
      'XSS signatures on transfer memo JSON fields',
      'JWT protection rejects alg=none / broken signatures',
      'OpenAPI positive security blocks skipSca mass-assignment',
    ],
    demoHint: 'Replay the chain as four scenarios in the Attack Lab.',
    bankingCase: 'Authorised Push Payment (APP) fraud is a top UK/EU retail loss class.',
  },
  {
    id: 'attack-signatures',
    category: 'threats',
    eyebrow: 'Attack signatures',
    title: 'Injection still owns banking breaches',
    subtitle:
      'SQLi on IBAN lookup, command injection in statement export, CRLF on redirects — signature sets catch the commodity tooling that still hits banks daily.',
    bullets: [
      '7,800+ signatures with banking-relevant sets enabled',
      'Server-technology signatures for Java/Node payment stacks',
      'Time-based staging before enforcing new packs',
      'User-defined signatures for bank-specific IoCs',
    ],
    demoHint: 'Lab: SQLi account lookup · cmdi export · CRLF callback.',
    policySnippet: `{
  "signature-sets": [
    { "name": "SQL Injection Signatures", "block": true },
    { "name": "Command Execution Signatures", "block": true },
    { "name": "XSS Signatures", "block": true }
  ]
}`,
  },
  {
    id: 'threat-campaigns',
    category: 'threats',
    eyebrow: 'Threat campaigns',
    title: 'Banking trojan webinjects',
    subtitle:
      'F5 Threat Labs campaigns recognise active malware dropper URL patterns with near-zero false positives — ideal for retail banking paths.',
    bullets: [
      'Updated more frequently than base signatures',
      'High-confidence blocks for known campaigns',
      'Complements endpoint / fraud analytics',
      'Packages via NGINX Instance Manager',
    ],
    demoHint: 'Lab: Banking trojan campaign probe.',
    bankingCase: 'Webinject config.bin paths are classic Zeus/Gozi-era artefacts still probed.',
  },
  {
    id: 'bots-ato',
    category: 'threats',
    eyebrow: 'Bots & ATO',
    title: 'Stop the stuffing before the wire',
    subtitle:
      'Credential stuffing, OTP spraying, and FX scrapers are classified by bot signatures and paced by brute-force protections on login and SCA.',
    bullets: [
      'Trusted vs malicious bot classes',
      'Brute-force profiles on /auth/login and /auth/sca/verify',
      'sqlmap / scrapy fingerprints blocked at the edge',
      'Pairs with IAM lockouts and device binding',
    ],
    demoHint: 'Lab: credential stuffing · OTP spray · FX scraper.',
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
    title: 'Salary-day resilience',
    subtitle:
      'Behavioural L7 DoS learns normal login and quote RPS, then mitigates slowloris and bad actors when retail traffic spikes.',
    bullets: [
      'Protected objects per critical banking URL',
      'Bad-actor detection + stress monitoring',
      'Optional L4 accelerated mitigation',
      'DoS dashboard for SOC shift leads',
    ],
    demoHint: 'Lab: L7 slowloris on login · JSON depth bomb on FX.',
    bankingCase: 'Peak: payday evenings and market open for FX.',
  },
  {
    id: 'open-banking',
    category: 'banking',
    eyebrow: 'Open Banking',
    title: 'FAPI-grade API protection',
    subtitle:
      'Import the OBIE OpenAPI, enforce JWT properties, bind interaction IDs, and stop BOLA and mass-assignment before consent services are stressed.',
    bullets: [
      'OpenAPI-derived URL/method/parameter allow-lists',
      'JWT alg/signature enforcement for TPP tokens',
      'Reject unknown JSON properties (skipSca, fraudScoreOverride)',
      'HTTP compliance against request-smuggling probes',
    ],
    demoHint: 'Lab: JWT alg=none · BOLA balances · OpenAPI mass-assignment.',
    bankingCase: 'UK OBIE v3.1 AIS/PIS surfaces are high-value regulatory APIs.',
    policySnippet: `{
  "open-api-files": [
    { "link": "file:///etc/app_protect/ob/obie-v3.1.yaml" }
  ],
  "jwt-protection": { "enabled": true }
}`,
  },
  {
    id: 'graphql-wealth',
    category: 'api',
    eyebrow: 'GraphQL',
    title: 'Private banking query abuse',
    subtitle:
      'Wealth GraphQL is a goldmine for enumeration — disable introspection, cap depth, and block batching used for balance harvesting.',
    bullets: [
      'Introspection denied in production',
      'Max nesting depth & complexity',
      'Batch size limits',
      'Signatures on GraphQL argument values',
    ],
    demoHint: 'Lab: introspection · batch enum · circular depth.',
  },
  {
    id: 'grpc-mobile',
    category: 'api',
    eyebrow: 'gRPC',
    title: 'Mobile BFF protobuf defence',
    subtitle:
      'Attach mobile IDL files; App Protect parses unary/streaming gRPC, extracts strings for signatures, and rejects malformed frames.',
    bullets: [
      'Malformed length-prefix blocked',
      'Unknown field prohibition',
      'Size limits on RPC messages',
      'Works with mTLS at NGINX',
    ],
    demoHint: 'Lab: Malformed gRPC mobile frame.',
  },
  {
    id: 'sepa-xml',
    category: 'banking',
    eyebrow: 'Corporate payments',
    title: 'ISO 20022 without XXE',
    subtitle:
      'Corporate pain.001 uploads need XML profiles that parse well-formed ISO 20022 while refusing external entities and oversized trees.',
    bullets: [
      'XML content profiles for SEPA namespaces',
      'DTD / external entity disabled',
      'OpenAPI + schema for JSON wire APIs',
      'Geo + sanctions IP lists on corp. hostname',
    ],
    demoHint: 'Lab: XXE in SEPA · negative wire amount · sanctioned geo.',
    bankingCase: 'Treasury batch windows are high-impact availability targets.',
  },
  {
    id: 'pci-dataguard',
    category: 'access',
    eyebrow: 'PCI & privacy',
    title: 'Data Guard as compensating control',
    subtitle:
      'When a receipt or KYC API accidentally echoes PAN or national IDs, Data Guard masks CHD/PII before it leaves the PCI or GDPR boundary.',
    bullets: [
      'Mask Primary Account Numbers in responses',
      'US SSN / custom national-ID patterns',
      'Does not replace proper tokenisation',
      'Alert SOC — treat hits as application defects',
    ],
    demoHint: 'Lab: PAN leakage · national ID in KYC.',
    policySnippet: `{
  "data-guard": {
    "enabled": true,
    "maskData": true,
    "creditCardNumbers": true,
    "usSocialSecurityNumbers": true
  }
}`,
    bankingCase: 'PCI DSS: never store or transmit raw CHD from web tiers.',
  },
  {
    id: 'cookies-jwt',
    category: 'access',
    eyebrow: 'Session',
    title: 'Cookie integrity & JWT shape',
    subtitle:
      'Enforce MBSESSION integrity and browser attributes; validate JWT header/signature properties for Open Banking and BFF tokens.',
    bullets: [
      'Cookie enforcement with HttpOnly/Secure/SameSite',
      'Reject alg=none and broken signatures',
      'Complement (not replace) FAPI intent binding',
      'XFF trusted headers for bank proxies',
    ],
    demoHint: 'Lab: session cookie tamper · JWT privilege escalation.',
  },
  {
    id: 'geo-ip',
    category: 'access',
    eyebrow: 'Geo & intel',
    title: 'Sanctions-aware edge',
    subtitle:
      'Geolocation deny-lists and IP Intelligence (Tor, botnets, scanners) reduce fraud and embargo exposure on retail and corporate channels.',
    bullets: [
      'Country ISO deny/allow by hostname',
      'IP intelligence categories for anonymizers',
      'IP address lists for corporate VPN egress',
      'Feed IoCs into the bank’s sanctions workflow',
    ],
    demoHint: 'Lab: sanctioned geo wire · Tor exit on accounts API.',
  },
  {
    id: 'evasion',
    category: 'threats',
    eyebrow: 'Protocol',
    title: 'No smuggling into the bank',
    subtitle:
      'HTTP compliance, evasion checks, method allow-lists, and filetype bans keep TRACE, path traversal, and desync probes off payment hosts.',
    bullets: [
      'Conflicting CL/TE rejected',
      'Directory traversal after normalisation',
      'Disallow .sql / .bak / .env',
      'Response signature checks where needed',
    ],
    demoHint: 'Lab: request smuggling · traversal · TRACE · dump filetype.',
  },
  {
    id: 'security-as-code',
    category: 'ops',
    eyebrow: 'GitOps',
    title: 'Policies travel with the release train',
    subtitle:
      'Meridian stores App Protect JSON beside OpenAPI contracts — CI promotes transparent → blocking after SOC sign-off.',
    bullets: [
      'POLICY_TEMPLATE_NGINX_BASE per service',
      'Override rules for TPP allow-lists',
      'Signature staging windows',
      'NGINX Instance Manager / NGINX One console',
    ],
    demoHint: 'Policy Explorer has PCI, OB, and transparent onboarding packs.',
    policySnippet: `{
  "policy": {
    "name": "ob_blocking_v3",
    "template": { "name": "POLICY_TEMPLATE_NGINX_BASE" },
    "enforcementMode": "blocking"
  }
}`,
  },
  {
    id: 'kubernetes',
    category: 'ops',
    eyebrow: 'Cloud native',
    title: 'Protect at the Ingress',
    subtitle:
      'NGINX Ingress Controller with App Protect binds policies per banking Ingress — retail, OB, and payments scale independently.',
    bullets: [
      'Per-route policy annotations / CRDs',
      'WAF + DoS in the same controller',
      'Fits regulated private cloud & public cloud',
      'Same JSON policies as VM edge',
    ],
    demoHint: 'Architecture shows Meridian’s dual-edge (DC + K8s) pattern.',
  },
  {
    id: 'soc',
    category: 'banking',
    eyebrow: 'Operations',
    title: 'What the SOC sees',
    subtitle:
      'Every lab scenario emits a support ID, violation, and banking service tag — the same fields your SIEM would parse from App Protect security logs.',
    bullets: [
      'Compact / verbose log profiles to syslog',
      'Correlation with fraud case management',
      'DoS dashboard for protected objects',
      'Transparent mode for greenfield onboarding',
    ],
    demoHint: 'Attack Lab event console mimics the shift-lead view.',
  },
  {
    id: 'summary',
    category: 'banking',
    eyebrow: 'Wrap-up',
    title: 'Ship digital banking. Keep it boringly safe.',
    subtitle:
      'F5 App Protect gives Meridian’s platform teams security-as-code — and gives the Cyber Defence Centre F5-grade controls without a parallel appliance estate.',
    bullets: [
      'WAF + bots + DoS + API schemas + Data Guard + geo intel',
      'Mapped to PCI, PSD2/FAPI, ISO 20022, and sanctions needs',
      'Run the full Attack Lab, then inspect service policies',
      'Docs: docs.nginx.com/waf',
    ],
    demoHint: 'Open Attack Lab — filter by Open Banking or Card Payments.',
    metric: { label: 'Next', value: 'Attack Lab' },
  },
]

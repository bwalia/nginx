export type Verdict = 'block' | 'alarm' | 'mask' | 'allow'

export interface AttackScenario {
  id: string
  name: string
  category: string
  method: string
  path: string
  description: string
  payload?: string
  headers?: Record<string, string>
  feature: string
  verdict: Verdict
  violation: string
  signatureId?: string
  detail: string
  maskedResponse?: string
}

export const attacks: AttackScenario[] = [
  {
    id: 'sqli',
    name: 'SQL Injection',
    category: 'Injection',
    method: 'GET',
    path: "/api/users?id=1' OR '1'='1",
    description: 'Classic boolean SQLi in a query parameter.',
    feature: 'Attack Signatures',
    verdict: 'block',
    violation: 'VIOL_ATTACK_SIGNATURE',
    signatureId: '200001475',
    detail: 'SQL Injection signature matched on parameter id. Request blocked in enforcement mode.',
  },
  {
    id: 'xss',
    name: 'Cross-Site Scripting',
    category: 'Injection',
    method: 'POST',
    path: '/api/comments',
    payload: '{"body":"<script>document.cookie</script>"}',
    description: 'Reflected XSS payload in JSON body.',
    feature: 'Attack Signatures',
    verdict: 'block',
    violation: 'VIOL_ATTACK_SIGNATURE',
    signatureId: '200000098',
    detail: 'XSS signature matched in JSON element value. Content profile + signature engine cooperated.',
  },
  {
    id: 'traversal',
    name: 'Path Traversal',
    category: 'Evasion',
    method: 'GET',
    path: '/static/..%2f..%2fetc/passwd',
    description: 'Encoded directory traversal toward OS files.',
    feature: 'Evasion Techniques',
    verdict: 'block',
    violation: 'VIOL_EVASION',
    detail: 'Directory traversal evasion technique detected after normalization.',
  },
  {
    id: 'bot',
    name: 'Malicious Bot',
    category: 'Automation',
    method: 'GET',
    path: '/products?page=1',
    headers: { 'User-Agent': 'sqlmap/1.7#stable (http://sqlmap.org)' },
    description: 'Known attack-tool User-Agent classified as malicious bot.',
    feature: 'Bot Protection',
    verdict: 'block',
    violation: 'VIOL_BOT_CLIENT',
    detail: 'Bot class: malicious-bot. Mitigation action: block.',
  },
  {
    id: 'bruteforce',
    name: 'Credential Stuffing',
    category: 'Abuse',
    method: 'POST',
    path: '/login',
    payload: '{"user":"admin","pass":"Password1!"}',
    description: 'Burst of failed logins from a single source IP.',
    feature: 'Brute Force Prevention',
    verdict: 'block',
    violation: 'VIOL_BRUTE_FORCE',
    detail: 'Login URL exceeded failed-attempt threshold within the configured window.',
  },
  {
    id: 'graphql',
    name: 'GraphQL Introspection Abuse',
    category: 'API',
    method: 'POST',
    path: '/graphql',
    payload:
      '{"query":"query { __schema { types { name fields { name } } } }"}',
    description: 'Deep introspection query probing the schema.',
    feature: 'GraphQL Protection',
    verdict: 'block',
    violation: 'VIOL_GRAPHQL_FORMAT',
    detail: 'GraphQL profile disallows introspection and enforces max nesting depth.',
  },
  {
    id: 'jwt',
    name: 'JWT alg=none',
    category: 'API',
    method: 'GET',
    path: '/api/orders',
    headers: {
      Authorization:
        'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.',
    },
    description: 'Bearer token with alg set to none.',
    feature: 'JWT Protection',
    verdict: 'block',
    violation: 'VIOL_JWT',
    detail: 'JWT header property alg=none rejected by JWT protection policy.',
  },
  {
    id: 'dataguard',
    name: 'PAN Leakage',
    category: 'Data Loss',
    method: 'GET',
    path: '/api/billing/receipt/1042',
    description: 'Upstream response contains a primary account number.',
    feature: 'Data Guard',
    verdict: 'mask',
    violation: 'VIOL_DATA_GUARD',
    detail: 'Credit card number detected in response body and masked before delivery.',
    maskedResponse:
      '{"receiptId":1042,"card":"4111-****-****-1111","amount":84.20}',
  },
  {
    id: 'filetype',
    name: 'Sensitive File Type',
    category: 'Surface',
    method: 'GET',
    path: '/backup/app.sql',
    description: 'Attempt to download a disallowed database dump extension.',
    feature: 'Disallowed File Types',
    verdict: 'block',
    violation: 'VIOL_FILETYPE',
    detail: 'Extension .sql is on the disallowed filetype list.',
  },
  {
    id: 'method',
    name: 'Illegal HTTP Method',
    category: 'Surface',
    method: 'TRACE',
    path: '/api/health',
    description: 'TRACE method used for cross-site tracing probe.',
    feature: 'Allowed Methods',
    verdict: 'block',
    violation: 'VIOL_METHOD',
    detail: 'HTTP method TRACE is not in the allowed methods list.',
  },
  {
    id: 'geo',
    name: 'Blocked Geolocation',
    category: 'Access',
    method: 'GET',
    path: '/api/catalog',
    headers: { 'X-Forwarded-For': '175.45.176.1' },
    description: 'Client IP resolves to a disallowed country code.',
    feature: 'Geolocation',
    verdict: 'block',
    violation: 'VIOL_GEOLOCATION',
    detail: 'Source geolocation matches disallowed country list (policy).',
  },
  {
    id: 'threat',
    name: 'Threat Campaign Probe',
    category: 'Intel',
    method: 'GET',
    path: '/wp-content/plugins/vulnerable/shell.php',
    description: 'URL pattern matches an active exploit campaign.',
    feature: 'Threat Campaigns',
    verdict: 'block',
    violation: 'VIOL_THREAT_CAMPAIGN',
    detail: 'Threat campaign signature hit with high confidence / low false-positive rate.',
  },
  {
    id: 'clean',
    name: 'Legitimate API Call',
    category: 'Allow',
    method: 'GET',
    path: '/api/products?limit=20',
    headers: { 'User-Agent': 'Mozilla/5.0 (demo-browser)' },
    description: 'Healthy request that should pass the policy.',
    feature: 'Baseline Policy',
    verdict: 'allow',
    violation: 'N/A',
    detail: 'No violations. Request forwarded to upstream application.',
  },
]

export function simulateLatency(ms = 420): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

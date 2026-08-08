export type BankingService =
  | 'internet-banking'
  | 'open-banking'
  | 'card-payments'
  | 'mobile-bff'
  | 'corporate-wire'
  | 'wealth-graphql'

export interface ServiceProfile {
  id: BankingService
  name: string
  short: string
  host: string
  description: string
  compliance: string[]
  upstream: string
}

export const bank = {
  name: 'Meridian Digital Bank',
  legal: 'Meridian Digital Bank plc',
  tagline: 'Protected by F5 App Protect',
  region: 'EU / UK Open Banking',
  soc: 'Meridian Cyber Defence Centre',
}

export const services: ServiceProfile[] = [
  {
    id: 'internet-banking',
    name: 'Retail Internet Banking',
    short: 'RIB',
    host: 'secure.meridianbank.example',
    description:
      'Customer portal for balances, transfers, statements, and profile management.',
    compliance: ['PSD2 SCA', 'PCI DSS', 'GDPR'],
    upstream: 'rib-web-tier',
  },
  {
    id: 'open-banking',
    name: 'Open Banking APIs',
    short: 'OB',
    host: 'api.meridianbank.example',
    description:
      'AIS/PIS APIs for licensed TPPs — accounts, balances, and payment initiation.',
    compliance: ['PSD2', 'Open Banking UK', 'FAPI'],
    upstream: 'ob-api-gateway',
  },
  {
    id: 'card-payments',
    name: 'Card & Acquiring',
    short: 'PAY',
    host: 'pay.meridianbank.example',
    description:
      'Card-not-present authorization, receipts, and merchant settlement APIs.',
    compliance: ['PCI DSS SAQ-D', '3DS2'],
    upstream: 'payment-orchestrator',
  },
  {
    id: 'mobile-bff',
    name: 'Mobile Banking BFF',
    short: 'MB',
    host: 'mobile.meridianbank.example',
    description:
      'Backend-for-frontend for iOS/Android — gRPC and JSON edge endpoints.',
    compliance: ['PSD2 SCA', 'GDPR'],
    upstream: 'mobile-bff',
  },
  {
    id: 'corporate-wire',
    name: 'Corporate Wire & SEPA',
    short: 'WIRE',
    host: 'corp.meridianbank.example',
    description:
      'High-value wires, SEPA XML pain.001, and treasury batch uploads.',
    compliance: ['ISO 20022', 'Sanctions screening', 'SOX'],
    upstream: 'payments-hub',
  },
  {
    id: 'wealth-graphql',
    name: 'Wealth GraphQL',
    short: 'WM',
    host: 'wealth.meridianbank.example',
    description:
      'Private-banking portfolio, holdings, and advisory query API.',
    compliance: ['MiFID II', 'GDPR'],
    upstream: 'wealth-graph',
  },
]

export const serviceMap = Object.fromEntries(
  services.map((s) => [s.id, s]),
) as Record<BankingService, ServiceProfile>

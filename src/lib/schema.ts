import { S } from './site';
const site = 'https://wien-west.at';
export const abs = (p: string, base: URL | undefined) => new URL(p, base ?? site).href;

export const returnPolicy = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: ['AT', 'DE'],
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 14,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/ReturnShippingFees',
};
export const shipping = (land: 'AT' | 'DE', rate: number) => ({
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: rate, currency: 'EUR' },
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: land },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: land === 'AT' ? 4 : 6, unitCode: 'DAY' },
  },
});
export const crumbs = (base: URL | undefined, items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(url, base) })),
});
export const faqSchema = (faq: readonly (readonly [string, string])[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});
export const priceValidUntil = `${new Date().getFullYear() + 1}-12-31`;
export const brand = { '@type': 'Brand', name: S.name };

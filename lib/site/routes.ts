export type Locale = 'en' | 'ar'
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://plulai.com'
export const SLUG = { home: '', marketing: 'marketing', ai: 'ai-consulting', tool: 'social-tool', qatar: 'qatar', uae: 'uae', saudi: 'saudi-arabia', kuwait: 'kuwait', bahrain: 'bahrain', oman: 'oman' } as const
export type PageKey = keyof typeof SLUG
export const COUNTRIES = ['qatar', 'uae', 'saudi', 'kuwait', 'bahrain', 'oman'] as const
export type CountryKey = (typeof COUNTRIES)[number]
export const ALL_KEYS = Object.keys(SLUG) as PageKey[]
export const path = (l: Locale, k: PageKey): string => (l === 'ar' ? '/ar' : '') + (SLUG[k] ? '/' + SLUG[k] : '') || '/'
export const keyFromSlug = (slug: string): PageKey | undefined => ALL_KEYS.find((k) => SLUG[k] === slug && SLUG[k] !== '')
export const keyFromPath = (p: string): PageKey => keyFromSlug(p.replace(/^\//, '').split('/')[0]) || 'home'

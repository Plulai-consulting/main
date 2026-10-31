import type { MetadataRoute } from 'next'
import { ALL_KEYS, SITE, path, type Locale } from '@/lib/site/routes'

export default function sitemap(): MetadataRoute.Sitemap {
  return (['en', 'ar'] as Locale[]).flatMap((l) =>
    ALL_KEYS.map((k) => ({
      url: SITE + path(l, k),
      priority: k === 'home' ? 1 : ['marketing', 'ai', 'tool'].includes(k) ? 0.8 : 0.7,
      alternates: { languages: { en: SITE + path('en', k), ar: SITE + path('ar', k), 'x-default': SITE + path('en', k) } },
    })),
  )
}

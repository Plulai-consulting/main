import type { Metadata } from 'next'
import RootHtml from '@/components/site/RootHtml'
import { SITE } from '@/lib/site/routes'
import { siteViewport } from '@/lib/site/seo'
export const metadata: Metadata = { metadataBase: new URL(SITE) }
export const viewport = siteViewport
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootHtml locale="ar">{children}</RootHtml>
}
